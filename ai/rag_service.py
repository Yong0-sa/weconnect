from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import List, Literal, Optional, Sequence

from chromadb import PersistentClient
try:
    from chromadb.errors import InvalidCollectionException, NotFoundError
except ImportError:
    # chromadb 최신 버전 호환
    try:
        from chromadb.errors import InvalidCollectionException
    except ImportError:
        # InvalidCollectionException도 없는 경우
        class InvalidCollectionException(Exception):  # type: ignore[misc]
            # => ChromaDB 버전이 달라서 원래 예외가 없더라도
            #    코드가 깨지지 않고 동작하도록 임시 예외 클래스를 정의

    class NotFoundError(InvalidCollectionException):  # type: ignore[misc]
        # => get_collection() 호출 시 컬렉션이 없을 때 발생시키기 위해
        #    NotFoundError 를 InvalidCollectionException의 서브클래스로 정의
        """Fallback for older chromadb API expectation."""


from dotenv import load_dotenv
from openai import OpenAI

# .env 파일에 있는 OPENAI_API_KEY, 기타 설정들을 환경변수로 로드
load_dotenv()

#  RAG 관련 커스텀 예외들

class RAGServiceError(RuntimeError):
    """RAG 서비스에서 발생하는 모든 예외의 베이스 클래스."""
    # => 다른 RAG 관련 예외들이 이 클래스를 상속받게 해서
    #    상위 레벨에서 한 번에 잡기 쉽도록 설계

class EmptyQueryError(RAGServiceError):
    """사용자 질문이 비어 있을 때 발생하는 예외."""
    # => 유효성 검증 단계에서 사용 (질문 없는데 모델 호출하는 것 방지)


class InappropriateQueryError(RAGServiceError):
    """OpenAI moderation에서 부적절하다고 판단한 질문에 대한 예외."""
    # => 욕설, 성인/폭력 등 정책 위반 질의를 막고 사용자에게 안내하기 위해 사용


class RetrievalError(RAGServiceError):
    """Chroma에서 컨텍스트를 가져오지 못했을 때 발생하는 예외."""
    # => 컬렉션이 없거나, DB 경로 문제, 쿼리 오류 등 RAG '검색 단계' 실패 상황 표현


#  RAG에서 내부적으로 쓰는 데이터 구조

@dataclass
class RetrievalContext:
    # 검색 단계에서 뽑아낸 컨텍스트 묶음.
    context: str
    pdf_links: List["ReferenceLink"]
    embed_ids: List[str]


@dataclass
class RAGResult:
    # RAG 전체 파이프라인의 최종 결과.
    answer: str
    pdf_links: List["ReferenceLink"]
    prompt_type: Literal["greet", "answer", "fallback"]
    embed_ids: Optional[List[str]] = None


@dataclass
class ReferenceLink:
    # 사용자에게 노출할 '참고 링크' 정보.
    title: str
    url: str


class RAGService:
    # 간단한 인사/테스트 패턴을 정규표현식으로 정의
    GREET_PATTERN = re.compile(r"^\s*(안녕|ㅎㅇ|하이|hi|hello|테스트|고마워|감사)\s*$", re.I)

    #  모델/경로/임계값 등 공통 설정을 묶어서 이후 호출을 단순화
    def __init__(
        self,
        *,
        db_path: str = "./chroma_db_v1",
        collection_name: str = "monthfarmtech_v1",
        n_results: int = 15,
        distance_threshold: float = 1.12,
        min_docs: int = 1,
        pdf_limit: int = 3,
        context_limit: int = 1800,
        openai_model: str = "gpt-4.1-mini",
        embedding_model: str = "text-embedding-3-small",
    ) -> None:
        # .env를 로드하고 키 없으면 예외
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key: 
            raise RAGServiceError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")

        # OpenAI 클라이언트 초기화
        self._client = OpenAI(api_key=api_key)

        # 2) ChromaDB 클라이언트 준비
        self._chroma = PersistentClient(path=db_path)

        try:  
            # 지정한 이름의 컬렉션 가져오기
            self._collection = self._chroma.get_collection(collection_name)
        except (NotFoundError, InvalidCollectionException) as exc:
            # 컬렉션이 없거나 손상된 경우 → RetrievalError로 감싸서 올림
            raise RetrievalError(
                f"'{collection_name}' 컬렉션을 불러오지 못했습니다. Chroma DB를 점검해주세요."
            ) from exc

        # 3) 나머지 설정 값들을 인스턴스 변수로 저장
        self._n_results = n_results
        self._distance_threshold = distance_threshold
        self._min_docs = min_docs
        self._pdf_limit = pdf_limit
        self._context_limit = context_limit
        self._openai_model = openai_model
        self._embedding_model = embedding_model

    # RAG 전체 파이프라인을 수행하는 "원샷 메서드"
    def ask(self, raw_query: str) -> RAGResult:
        # 1) 사용자가 입력한 질문을 정제
        query = (raw_query or "").strip()

        # 빈 문자열이면 즉시 예외 발생 → LLM 호출 낭비 방지
        if not query:
            raise EmptyQueryError("질문을 입력해주세요.")

        # 2) Moderation 검사 (욕설/폭력성/혐오/성인 등 차단)
        if self._is_inappropriate(query):
            raise InappropriateQueryError("부적절하거나 안전하지 않은 내용이 포함되어 답변할 수 없습니다.")

        # 3) 기본 응답 초기화
        prompt_type: Literal["greet", "answer", "fallback"]
        pdf_links: List[ReferenceLink] = []
        embed_ids: Optional[List[str]] = None

        # 4) 인사말 여부 체크
        if self.GREET_PATTERN.match(query):
            prompt = self._build_prompt_greet(query)
            prompt_type = "greet"

        else:
            # 5) 검색 단계 — 벡터DB에서 관련 문서를 가져옴
            retrieval = self._build_retrieval_context(query)

            if retrieval:
                # 검색 성공
                prompt = self._build_prompt_answer(query, retrieval.context, retrieval.embed_ids, retrieval.pdf_links)
                # UI에서 참고자료로 보여줄 PDF 링크 전달
                pdf_links = retrieval.pdf_links
                embed_ids = retrieval.embed_ids
                prompt_type = "answer"

            else:
                # 검색 실패 → 백업 프롬프트 사용 (일반적 설명 위주)
                prompt = self._build_prompt_fallback(query)
                prompt_type = "fallback"

        # 6) GPT 모델 호출 (안전한 예외 처리 포함)
        answer = self._call_gpt(prompt)

        # 7) 표준화된 RAG 결과 객체 생성
        return RAGResult(answer=answer, pdf_links=pdf_links, prompt_type=prompt_type, embed_ids=embed_ids)

    # Moderation(부적절 컨텐츠) 차단
    def _is_inappropriate(self, query: str) -> bool:
        moderation = self._client.moderations.create(model="omni-moderation-latest", input=query)
        return bool(moderation.results[0].flagged)

    # GPT 호출 — 프롬프트를 OpenAI 모델에 전달하고 결과만 추출
    def _call_gpt(self, prompt: str) -> str:
        # OpenAI Responses API를 사용하여 모델에 요청.
        try:
            response = self._client.responses.create(
                model=self._openai_model,
                input=[{"role": "user", "content": prompt}],
            )            
        except Exception as exc:
            raise RAGServiceError("GPT 호출 중 오류가 발생했습니다.") from exc
        
        # output_text는 모델이 생성한 최종 텍스트만 반환하는 단축 프로퍼티
        return response.output_text

    # 작물명 자동 추출 — 질의에서 한글 명사 중 실제 문서에서
    # 등장하는 단어만 "작물"로 간주하여 필터링
    def _extract_crop_name(self, query: str, metas, kept_idx):
        """
        질문에서 한글 명사 후보를 뽑고,
        RAG 메타데이터(title/curationNm)에 실제 등장하는 단어면 작물명으로 간주.
        """
        # 1) 질문에서 한글만 추출 (영어/숫자 제거)
        tokens = re.findall(r"[가-힣]+", query)

        # 2글자 이상의 단어만 남김 (너무 짧은 명사는 잡음이 많음)
        cands = [t for t in tokens if len(t) >= 2]

        if not cands:
            return None

        # 2) 검색에서 살아남은 메타데이터들에서 제목(title)만 수집
        titles = []
        for i in kept_idx:
            m = metas[i]
            title = (m.get("title") or m.get("curationNm") or "").strip()
            if title:
                titles.append(title)

        if not titles:
            return None

        # 3) 모든 제목을 하나의 문자열로 합침
        #    → "토마토 잎마름 병 예방 감자 공동병" 같은 형태
        joined = " ".join(titles)

        # 4) 작물명 후보(cands)가 제목 안에 실제로 등장하면 반환
        for cand in cands:
            if cand in joined:
                return cand

        # 없다면 작물명 판단 불가
        return None


    # RAG 파이프라인에서 "검색"을 담당하는 핵심 함수.
    #  실패 시에는 None 반환 → fallback 프롬프트로 이어짐.
    def _build_retrieval_context(self, query: str) -> Optional[RetrievalContext]:
        
        # 1) Query → Embedding
        try:
            embedding = self._client.embeddings.create(model=self._embedding_model, input=[query]).data[0].embedding
        except Exception as exc:  # OpenAI errors
            # OpenAI Embedding 모델 실패 (네트워크, 키문제, 모델 장애 등)
            raise RAGServiceError("임베딩 생성에 실패했습니다.") from exc

        # 2) ChromaDB 검색
        try:
            query_result = self._collection.query(
                query_embeddings=[embedding],
                n_results=self._n_results,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:  # Chroma errors
            raise RetrievalError("지식을 조회하는 중 오류가 발생했습니다.") from exc

        # 3) 검색 결과 파싱
        #    Chroma는 nested 구조로 반환하므로 0번째 리스트만 사용
        docs = query_result.get("documents", [[]])[0]
        metas = query_result.get("metadatas", [[]])[0]
        dists = query_result.get("distances", [[]])[0]
        ids_hit = query_result.get("ids", [[]])[0]

        # 4) 거리 필터링 — relevance filtering
        kept = [
            (doc, meta or {}, id_hit, dist)
            for doc, meta, id_hit, dist in zip(docs, metas, ids_hit, dists)
            if dist <= self._distance_threshold
        ]

        # 문서가 거의 없으면 검색 실패로 간주 → fallback
        if len(kept) < self._min_docs:
            return None

        # 5) **추가 필터링 — 작물명 기반 검색 강화**
        kept_idx = list(range(len(kept)))

        # 질문에 "토마토", "감자" 등 작물명이 있을 경우
        # RAG 결과 중 해당 작물명과 관련된 문서만 남기도록 필터링.
        crop = self._extract_crop_name(query, metas, kept_idx)

        if crop:
            filtered = []
            for idx in kept_idx:
                doc, meta, id_hit, dist = kept[idx]
                title = (meta.get("title") or meta.get("curationNm") or "")
                
                # 제목 혹은 문서 자체에 작물명이 등장하는 경우만 유지
                if crop in title or crop in doc:
                    filtered.append(idx)

            if filtered:
                kept = [kept[i] for i in filtered]

        # 6) context 생성 — 가장 중요한 핵심 문서들만 합쳐서 프롬프트에 전달
        context = "\n\n".join(doc for doc, _, _, _ in kept)[: self._context_limit]
        
        # 7) PDF 링크 추출
        pdf_links = self._extract_pdf_links(kept)
        
        # 8) 사용된 문서들의 임베딩 ID 추출
        embed_ids = [id_hit for _, _, id_hit, _ in kept][: self._min_docs]
        
        # 9) RetrievalContext 객체 생성 → ask()에서 prompt 빌드를 위해 사용
        return RetrievalContext(context=context, pdf_links=pdf_links, embed_ids=embed_ids)

    # PDF 링크 추출 — 검색된 문서들에서 PDF URL만 정제하여 리스트화
    def _extract_pdf_links(self, records: Sequence[tuple[str, dict, str, float]]) -> List[ReferenceLink]:
        pdfs: List[ReferenceLink] = []
        seen_urls: set[str] = set()


        for _, meta, _, _ in records:
            # URL 후보 키 중 하나라도 존재하면 사용
            raw_url = (meta.get("pdf_path") or meta.get("atchmnflUrl") or meta.get("linkUrl") or "").strip()
            
            # 유효하지 않은 URL 또는 중복 URL은 스킵
            if not raw_url or raw_url in seen_urls:
                continue
            
            # 제목도 여러 키 중 가능한 것을 선택
            title = (meta.get("title") or meta.get("curationNm") or meta.get("document_title") or "").strip()
            
            # 제목도 없으면 URL 자체를 title로 사용
            if not title:
                title = raw_url

            pdfs.append(ReferenceLink(title=title, url=raw_url))
            seen_urls.add(raw_url)

            # 너무 많은 PDF를 주면 UX가 나빠지고 프롬프트가 길어짐 → 제한
            if len(pdfs) >= self._pdf_limit:
                break

        return pdfs


    # 간단한 인사말 처리용 프롬프트.
    @staticmethod
    def _build_prompt_greet(_: str) -> str:
        return (
            "아주 짧게 인사하고, 이 봇은 농업(작물·재배·병해충) 특화 챗봇임을 안내한 뒤 "
            "농업 관련 질문을 입력해 달라고 정중히 요청해줘. 한두 문장만."
        )

    # 검색 성공 시 사용되는 '정식 RAG 답변 프롬프트'.
    @staticmethod
    def _build_prompt_answer(query: str, context: str, embed_ids: Sequence[str], pdf_links: Sequence[ReferenceLink]) -> str:
        
        # PDF 링크를 문자열로 변환
        links = "\n".join(f"{link.title}: {link.url}" for link in pdf_links) if pdf_links else ""
        
        # ID들을 쉼표로 연결
        ids_str = ", ".join(embed_ids) if embed_ids else ""
        return (
            f"질문: {query}\n\n"
            f"검색된 내용:\n{context}\n\n"
            f"참고 PDF 링크:\n{links}\n\n"
            f"관련 임베딩 ID: {ids_str}\n\n"
            "위 정보를 바탕으로 10줄 정도로 답변해주고 아래 링크를 참고하라고 해줘."
        )

    @staticmethod
    def _build_prompt_fallback(query: str) -> str:
        return (
            f"사용자 질문: {query}\n\n"
            "주제가 농업 관련이지만 현재 제공 데이터에는 충분한 근거가 없습니다. "
            "간단한 일반 정보 수준으로 2~3문장 요약 제공 후, "
            "마지막에 '이 주제는 현재 저희 데이터에 포함되어 있지 않아 일반적인 정보만 안내드렸어요."
            "작물명·증상·지역을 함께 알려주시면 더 신뢰도 높은 답변을 드릴 수 있습니다 🙂'라고 안내해줘."
        )
