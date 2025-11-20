"""
Utilities for running a RAG (Retrieval-Augmented Generation) workflow.

This module exposes a RAGService class that encapsulates:
* moderation checks
* greeting / fallback prompt construction
* embedding + retrieval against ChromaDB
* GPT response generation

It is designed to be imported by the FastAPI layer, so no CLI interaction
remains in this file.
"""

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
            """Fallback for chromadb API."""

    class NotFoundError(InvalidCollectionException):  # type: ignore[misc]
        """Fallback for older chromadb API expectation."""
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


class RAGServiceError(RuntimeError):
    """Base class for RAG related errors."""


class EmptyQueryError(RAGServiceError):
    """Raised when the user query is empty."""


class InappropriateQueryError(RAGServiceError):
    """Raised when OpenAI moderation flags the query."""


class RetrievalError(RAGServiceError):
    """Raised when we cannot retrieve context from Chroma."""


@dataclass
class RetrievalContext:
    context: str
    pdf_links: List["ReferenceLink"]
    embed_ids: List[str]


@dataclass
class RAGResult:
    answer: str
    pdf_links: List["ReferenceLink"]
    prompt_type: Literal["greet", "answer", "fallback"]
    embed_ids: Optional[List[str]] = None


@dataclass
class ReferenceLink:
    title: str
    url: str


class RAGService:
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

        self._client = OpenAI(api_key=api_key)
        # ChromaDB PersistentClient로 컬렉션 open
        self._chroma = PersistentClient(path=db_path)
        try:  
            self._collection = self._chroma.get_collection(collection_name)
        except (NotFoundError, InvalidCollectionException) as exc:
            raise RetrievalError(
                f"'{collection_name}' 컬렉션을 불러오지 못했습니다. Chroma DB를 점검해주세요."
            ) from exc

        self._n_results = n_results
        self._distance_threshold = distance_threshold
        self._min_docs = min_docs
        self._pdf_limit = pdf_limit
        self._context_limit = context_limit
        self._openai_model = openai_model
        self._embedding_model = embedding_model

    # “유효성 검사 → 검색 → 프롬프트 구성 → LLM 호출 → 결과 포맷”을 원샷으로 제공.
    def ask(self, raw_query: str) -> RAGResult:
        query = (raw_query or "").strip()
        if not query:
            raise EmptyQueryError("질문을 입력해주세요.")

        if self._is_inappropriate(query):
            raise InappropriateQueryError("부적절하거나 안전하지 않은 내용이 포함되어 답변할 수 없습니다.")

        prompt_type: Literal["greet", "answer", "fallback"]
        pdf_links: List[ReferenceLink] = []
        embed_ids: Optional[List[str]] = None

        if self.GREET_PATTERN.match(query):
            prompt = self._build_prompt_greet(query)
            prompt_type = "greet"
        else:
            retrieval = self._build_retrieval_context(query)
            if retrieval:
                prompt = self._build_prompt_answer(query, retrieval.context, retrieval.embed_ids, retrieval.pdf_links)
                pdf_links = retrieval.pdf_links
                embed_ids = retrieval.embed_ids
                prompt_type = "answer"
            else:
                prompt = self._build_prompt_fallback(query)
                prompt_type = "fallback"

        answer = self._call_gpt(prompt)
        return RAGResult(answer=answer, pdf_links=pdf_links, prompt_type=prompt_type, embed_ids=embed_ids)

    # Moderation(부적절 컨텐츠) 차단
    def _is_inappropriate(self, query: str) -> bool:
        moderation = self._client.moderations.create(model="omni-moderation-latest", input=query)
        return bool(moderation.results[0].flagged)

    def _call_gpt(self, prompt: str) -> str:
        try:
            response = self._client.responses.create(
                model=self._openai_model,
                input=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            raise RAGServiceError("GPT 호출 중 오류가 발생했습니다.") from exc
        return response.output_text

    def _extract_crop_name(self, query: str, metas, kept_idx):
        """
        질문에서 한글 명사 후보를 뽑고,
        RAG 메타데이터(title/curationNm)에 실제 등장하는 단어면 작물명으로 간주.
        """
        tokens = re.findall(r"[가-힣]+", query)
        cands = [t for t in tokens if len(t) >= 2]
        if not cands:
            return None

        titles = []
        for i in kept_idx:
            m = metas[i]
            title = (m.get("title") or m.get("curationNm") or "").strip()
            if title:
                titles.append(title)

        if not titles:
            return None

        joined = " ".join(titles)
        for cand in cands:
            if cand in joined:
                return cand

        return None


    def _build_retrieval_context(self, query: str) -> Optional[RetrievalContext]:
        try:
            embedding = self._client.embeddings.create(model=self._embedding_model, input=[query]).data[0].embedding
        except Exception as exc:  # OpenAI errors
            raise RAGServiceError("임베딩 생성에 실패했습니다.") from exc

        try:
            query_result = self._collection.query(
                query_embeddings=[embedding],
                n_results=self._n_results,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:  # Chroma errors
            raise RetrievalError("지식을 조회하는 중 오류가 발생했습니다.") from exc

        docs = query_result.get("documents", [[]])[0]
        metas = query_result.get("metadatas", [[]])[0]
        dists = query_result.get("distances", [[]])[0]
        ids_hit = query_result.get("ids", [[]])[0]

        kept = [
            (doc, meta or {}, id_hit, dist)
            for doc, meta, id_hit, dist in zip(docs, metas, ids_hit, dists)
            if dist <= self._distance_threshold
        ]

        # 필터 결과가 있으면 교체, 없으면 기존 kept 사용
        if len(kept) < self._min_docs:
            return None

        # 작물 필터링 추가
        kept_idx = list(range(len(kept)))
        crop = self._extract_crop_name(query, metas, kept_idx)

        if crop:
            filtered = []
            for idx in kept_idx:
                doc, meta, id_hit, dist = kept[idx]
                title = (meta.get("title") or meta.get("curationNm") or "")
                if crop in title or crop in doc:
                    filtered.append(idx)
            if filtered:
                kept = [kept[i] for i in filtered]

        context = "\n\n".join(doc for doc, _, _, _ in kept)[: self._context_limit]
        pdf_links = self._extract_pdf_links(kept)
        embed_ids = [id_hit for _, _, id_hit, _ in kept][: self._min_docs]
        return RetrievalContext(context=context, pdf_links=pdf_links, embed_ids=embed_ids)

    def _extract_pdf_links(self, records: Sequence[tuple[str, dict, str, float]]) -> List[ReferenceLink]:
        pdfs: List[ReferenceLink] = []
        seen_urls: set[str] = set()
        for _, meta, _, _ in records:
            raw_url = (meta.get("pdf_path") or meta.get("atchmnflUrl") or meta.get("linkUrl") or "").strip()
            if not raw_url or raw_url in seen_urls:
                continue
            title = (meta.get("title") or meta.get("curationNm") or meta.get("document_title") or "").strip()
            if not title:
                title = raw_url
            pdfs.append(ReferenceLink(title=title, url=raw_url))
            seen_urls.add(raw_url)
            if len(pdfs) >= self._pdf_limit:
                break
        return pdfs

    @staticmethod
    def _build_prompt_greet(_: str) -> str:
        return (
            "아주 짧게 인사하고, 이 봇은 농업(작물·재배·병해충) 특화 챗봇임을 안내한 뒤 "
            "농업 관련 질문을 입력해 달라고 정중히 요청해줘. 한두 문장만."
        )

    @staticmethod
    def _build_prompt_answer(query: str, context: str, embed_ids: Sequence[str], pdf_links: Sequence[ReferenceLink]) -> str:
        links = "\n".join(f"{link.title}: {link.url}" for link in pdf_links) if pdf_links else ""
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
