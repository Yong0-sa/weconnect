from __future__ import annotations

import logging
import traceback
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Deque, List, Literal
from uuid import uuid4
import numpy as np
from PIL import Image
import io

from fastapi import FastAPI, HTTPException, UploadFile, File
# - 비동기 FastAPI 내부에서 CPU-bound or blocking 코드를 안전하게 실행하는 기능
# - (예: 이미지 전처리, 모델 예측 등)
from fastapi.concurrency import run_in_threadpool

from pydantic import BaseModel, Field

from rag_service import (
    EmptyQueryError,
    InappropriateQueryError,
    RAGResult,
    RAGService,
    RAGServiceError,
    ReferenceLink,
)
from text_suggestion_service import TextSuggestionService, TextSuggestionError

# FastAPI 전체 서버 공통 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 서버 인스턴스 생성
app = FastAPI(title="WeConnect AI Search API")

# TensorFlow/Keras 모델 로드 (전역 1회)
# 모델이 없어도 서버는 시작되도록 처리
pepperbell_model = None
potato_model = None
tomato_model = None

try:
    from tensorflow import keras
    import os

    MODEL_DIR = os.getenv("MODEL_DIR", "/app/ai/aiModel")

    logger.info(f"모델 로드 시작: {MODEL_DIR}")

    # 모델 파일 존재 여부 확인
    import pathlib
    model_dir_path = pathlib.Path(MODEL_DIR)

    if model_dir_path.exists():
        pepperbell_path = model_dir_path / "pepperbell_finetuned_model.keras"
        potato_path = model_dir_path / "potato_finetuned_model.keras"
        tomato_path = model_dir_path / "tomato_finetuned_model_final2.keras"

        if pepperbell_path.exists():
            pepperbell_model = keras.models.load_model(str(pepperbell_path))
            logger.info("파프리카 모델 로드 완료")
        else:
            logger.warning(f"파프리카 모델 파일을 찾을 수 없습니다: {pepperbell_path}")

        if potato_path.exists():
            potato_model = keras.models.load_model(str(potato_path))
            logger.info("감자 모델 로드 완료")
        else:
            logger.warning(f"감자 모델 파일을 찾을 수 없습니다: {potato_path}")

        if tomato_path.exists():
            tomato_model = keras.models.load_model(str(tomato_path))
            logger.info("토마토 모델 로드 완료")
        else:
            logger.warning(f"토마토 모델 파일을 찾을 수 없습니다: {tomato_path}")
    
    else:
        logger.warning(f"모델 디렉토리가 존재하지 않습니다: {MODEL_DIR}")
        logger.info("모델 없이 서버를 시작합니다. 작물 진단 기능은 사용할 수 없습니다.")

except ImportError as e:
    # TensorFlow 미설치 (가벼운 서버에서 종종 발생)
    logger.warning(f"TensorFlow를 import할 수 없습니다: {e}")
    logger.info("모델 없이 서버를 시작합니다. 작물 진단 기능은 사용할 수 없습니다.")

except Exception as e:
    # 모델 로딩 중 알 수 없는 오류
    logger.error(f"모델 로드 중 오류 발생: {e}")
    logger.error(f"상세 traceback:\n{traceback.format_exc()}")
    logger.info("모델 없이 서버를 시작합니다. 작물 진단 기능은 사용할 수 없습니다.")


# RAG 대화 히스토리 저장 구조
@dataclass
class HistoryEntry:
    # 하나의 검색/답변 처리 기록을 표현하는 데이터 구조.
    # RAGResult 정보 + 요청 메타데이터 포함.
    id: str
    question: str
    answer: str
    pdf_links: List[ReferenceLink]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


class HistoryStore:
    # In-memory 히스토리 저장소.

    def __init__(self, max_items: int = 100) -> None:
        self._items: Deque[HistoryEntry] = deque(maxlen=max_items)
        self._lock = Lock()

    def add(self, question: str, result: RAGResult) -> HistoryEntry:
        #  히스토리 엔트리를 생성하고 저장.
        # result 는 RAGService.ask()의 반환값.
        entry = HistoryEntry(
            id=str(uuid4()),
            question=question,
            answer=result.answer,
            pdf_links=list(result.pdf_links or []),
            embed_ids=result.embed_ids or [],
            prompt_type=result.prompt_type,
            created_at=datetime.now(timezone.utc),
        )
        
        #  thread-safe append
        # → 동시에 여러 사용자가 검색하더라도 안정적으로 기록됨.
        with self._lock:
            self._items.append(entry)
        return entry

    def list(self) -> List[HistoryEntry]:
        # 저장된 히스토리 전체 조회. 저장 순서대로 반환.
        with self._lock:
            return list(self._items)


# 요청/응답 구조 정의 (FastAPI 자동 문서화 및 데이터 검증)

class SearchRequest(BaseModel):
    # 사용자가 AI에게 질문할 때 사용하는 요청 바디.
    question: str = Field(..., min_length=1, description="사용자 질문")


class HistoryItem(BaseModel):
    # HistoryEntry를 API 응답용으로 변환한 버전.
    id: str
    question: str
    answer: str
    pdf_links: List["ReferenceLinkModel"]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


class ReferenceLinkModel(BaseModel):
    # RAG 결과에 포함될 PDF 문서 링크 모델.
    title: str
    url: str


def _to_history_item(entry: HistoryEntry) -> HistoryItem:
    # HistoryEntry → HistoryItem 변환 함수.
    # API 응답을 위해 dataclass 형태를 Pydantic 모델로 변환함.
    return HistoryItem(
        id=entry.id,
        question=entry.question,
        answer=entry.answer,
        pdf_links=[ReferenceLinkModel(title=link.title, url=link.url) for link in entry.pdf_links],
        embed_ids=entry.embed_ids,
        prompt_type=entry.prompt_type,
        created_at=entry.created_at,
    )


# RAGService 초기화
# - 벡터DB 연결, 임베딩 모델 로드 등 실행 시점에 필요한 자원 준비
logger.info("RAGService 초기화 시작...")

try:
    rag_service = RAGService()
    logger.info("RAGService 초기화 완료")

except Exception as exc:
    logger.error(f"RAGService 초기화 실패: {exc}")
    logger.error(f"상세 traceback:\n{traceback.format_exc()}")
    raise


# TextSuggestionService 초기화
logger.info("TextSuggestionService 초기화 시작...")

try:
    text_suggestion_service = TextSuggestionService()
    logger.info("TextSuggestionService 초기화 완료")

except Exception as exc:
    logger.error(f"TextSuggestionService 초기화 실패: {exc}")
    logger.error(f"상세 traceback:\n{traceback.format_exc()}")
    raise

# 전역 히스토리 저장소 (서버 살아 있는 동안 유지)
history_store = HistoryStore()


@app.post("/api/ai/chat", response_model=HistoryItem)
async def search_ai(payload: SearchRequest) -> HistoryItem:

    try:
        # 1) 유효성 검사를 통과한 사용자 질문 수신 로그
        logger.info(f"질문 수신: {payload.question}")
        # - RAGService.ask()는 CPU-bound(임베딩 계산 + 벡터 검색 포함)
        # - FastAPI event loop 차단 방지 → 대규모 동시 요청에도 안정적
        result = await run_in_threadpool(rag_service.ask, payload.question)
        
        logger.info(f"답변 생성 완료: prompt_type={result.prompt_type}")
    
    # 각 예외 유형별로 HTTP 상태 코드 구분 처리
    except InappropriateQueryError as exc:
        logger.warning(f"부적절한 질문: {exc}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
    except EmptyQueryError as exc:
        logger.warning(f"빈 질문: {exc}")
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    
    except RAGServiceError as exc:
        logger.error(f"RAG 서비스 에러 발생: {exc}")
        logger.error(f"상세 traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    
    except Exception as exc:
        logger.error(f"예상치 못한 에러 발생: {type(exc).__name__}: {exc}")
        logger.error(f"상세 traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {exc}") from exc

    # 3) 정상 응답일 경우 → 히스토리 저장 후 응답 모델 생성
    # 질문 저장 시 strip()을 한 번 더 적용해 안전성 확보
    entry = history_store.add(payload.question.strip(), result)

    # API 응답용 Pydantic 모델 변환
    return _to_history_item(entry)


# AI 검색 기록 조회 API
@app.get("/api/ai/chat/history", response_model=List[HistoryItem])
async def get_history() -> List[HistoryItem]:
    # HistoryStore.list()는 thread-safe이지만 synchronous 함수이므로
    # FastAPI event loop 블로킹을 피하기 위해 threadpool에서 실행
    entries = await run_in_threadpool(history_store.list)

    # Pydantic 응답모델로 변환 후 클라이언트 반환
    return [_to_history_item(entry) for entry in entries]


# ===== AI 글작성 도우미 엔드포인트 =====

class TextSuggestionRequest(BaseModel):
    """문장 추천 요청"""
    content: str = Field(..., min_length=1, description="현재 작성 중인 내용")


class TextSuggestionResponse(BaseModel):
    """문장 추천 응답"""
    suggestions: List[str] = Field(..., description="추천 문장 리스트 (2개)")


@app.post("/text-suggestions", response_model=TextSuggestionResponse)
async def get_text_suggestions(payload: TextSuggestionRequest) -> TextSuggestionResponse:
    """
    농장 공지사항 작성 시 AI 문장 추천
    현재 작성 중인 내용을 기반으로 자연스럽게 이어질 문장 2개 제안
    """
    try:
        logger.info(f"문장 추천 요청: 내용 길이={len(payload.content)} 글자")
        suggestions = await run_in_threadpool(text_suggestion_service.get_suggestions, payload.content)
        logger.info(f"문장 추천 완료: {len(suggestions)}개 문장 생성")
        return TextSuggestionResponse(suggestions=suggestions)
    except TextSuggestionError as exc:
        logger.error(f"문장 추천 에러: {exc}")
        logger.error(f"상세 traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"예상치 못한 에러: {type(exc).__name__}: {exc}")
        logger.error(f"상세 traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {exc}") from exc


# 작물 진단 관련 함수들
def get_model(crop_type: str):
    """작물 타입에 따라 해당 모델 반환"""
    if crop_type == "potato":
        return potato_model
    elif crop_type == "paprika":
        return pepperbell_model
    elif crop_type == "tomato":
        return tomato_model
    else:
        raise ValueError(f"지원하지 않는 작물 타입: {crop_type}")


def preprocess_image(image_bytes: bytes, target_size=(300, 300)):
    """이미지를 모델 입력 형태로 전처리"""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = img.resize(target_size)
        img_array = np.array(img)
        img_array = img_array.astype('float32') / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        raise ValueError(f"이미지 전처리 실패: {str(e)}")


def predict(model, image_array):
    """모델을 사용하여 예측 수행"""
    try:
        predictions = model.predict(image_array, verbose=0)
        predicted_index = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_index])
        return predicted_index, confidence
    except Exception as e:
        raise RuntimeError(f"예측 실패: {str(e)}")


@app.post("/predict/potato")
async def predict_potato(file: UploadFile = File(...)):
    """감자 질병 진단"""
    logger.info("감자 진단 요청 수신")
    return await predict_crop("potato", file)


@app.post("/predict/pepperbell")
async def predict_pepperbell(file: UploadFile = File(...)):
    """파프리카 질병 진단"""
    logger.info("파프리카 진단 요청 수신")
    return await predict_crop("paprika", file)


@app.post("/predict/tomato")
async def predict_tomato(file: UploadFile = File(...)):
    """토마토 질병 진단"""
    logger.info("토마토 진단 요청 수신")
    return await predict_crop("tomato", file)


async def predict_crop(crop_type: str, file: UploadFile):
    """작물 질병 진단 공통 함수"""
    try:
        logger.info(f"진단 요청 처리 시작: 작물={crop_type}, 파일명={file.filename}")

        # 모델 확인
        model = get_model(crop_type)
        if model is None:
            logger.error(f"모델이 로드되지 않았습니다: 작물={crop_type}")
            raise HTTPException(
                status_code=503,
                detail=f"{crop_type} 모델이 로드되지 않았습니다. 서버 관리자에게 문의하세요."
            )

        # 이미지 읽기
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="이미지 파일이 비어있습니다.")

        logger.info(f"이미지 읽기 완료: 크기={len(image_bytes)} bytes")

        # 이미지 전처리
        image_array = await run_in_threadpool(preprocess_image, image_bytes)
        logger.info(f"이미지 전처리 완료: shape={image_array.shape}")

        # 예측 수행
        predicted_index, confidence = await run_in_threadpool(predict, model, image_array)
        logger.info(f"예측 완료: 인덱스={predicted_index}, 신뢰도={confidence}")

        # 결과 반환
        result = {
            "predicted_index": predicted_index,
            "confidence": round(confidence, 4),
            "message": "진단이 완료되었습니다.",
            "label": ""
        }

        logger.info(f"진단 완료: 작물={crop_type}, 인덱스={predicted_index}, 신뢰도={confidence}")
        return result

    except HTTPException:
        # HTTPException은 그대로 전달
        raise
    except ValueError as e:
        logger.error(f"값 오류: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"실행 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"예상치 못한 오류: {type(e).__name__}: {e}")
        logger.error(f"상세 traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {e}")

