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
from pathlib import Path
from PIL import Image
import io

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from rag_service import (
    EmptyQueryError,
    InappropriateQueryError,
    RAGResult,
    RAGService,
    RAGServiceError,
)

# 로깅 설정 (먼저 초기화)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="WeConnect AI Search API")

# TensorFlow/Keras 모델 로드 (전역 변수로 한 번만 로드)
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
    logger.warning(f"TensorFlow를 import할 수 없습니다: {e}")
    logger.info("모델 없이 서버를 시작합니다. 작물 진단 기능은 사용할 수 없습니다.")
except Exception as e:
    logger.error(f"모델 로드 중 오류 발생: {e}")
    logger.error(f"상세 traceback:\n{traceback.format_exc()}")
    logger.info("모델 없이 서버를 시작합니다. 작물 진단 기능은 사용할 수 없습니다.")

@dataclass
class HistoryEntry:
    id: str
    question: str
    answer: str
    pdf_links: List[str]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


class HistoryStore:
    """In-memory conversation history with thread-safe access."""

    def __init__(self, max_items: int = 100) -> None:
        self._items: Deque[HistoryEntry] = deque(maxlen=max_items)
        self._lock = Lock()

    def add(self, question: str, result: RAGResult) -> HistoryEntry:
        entry = HistoryEntry(
            id=str(uuid4()),
            question=question,
            answer=result.answer,
            pdf_links=result.pdf_links,
            embed_ids=result.embed_ids or [],
            prompt_type=result.prompt_type,
            created_at=datetime.now(timezone.utc),
        )
        with self._lock:
            self._items.append(entry)
        return entry

    def list(self) -> List[HistoryEntry]:
        with self._lock:
            return list(self._items)


class SearchRequest(BaseModel):
    question: str = Field(..., min_length=1, description="사용자 질문")


class HistoryItem(BaseModel):
    id: str
    question: str
    answer: str
    pdf_links: List[str]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


def _to_history_item(entry: HistoryEntry) -> HistoryItem:
    return HistoryItem(
        id=entry.id,
        question=entry.question,
        answer=entry.answer,
        pdf_links=entry.pdf_links,
        embed_ids=entry.embed_ids,
        prompt_type=entry.prompt_type,
        created_at=entry.created_at,
    )


logger.info("RAGService 초기화 시작...")
try:
    rag_service = RAGService()
    logger.info("RAGService 초기화 완료")
except Exception as exc:
    logger.error(f"RAGService 초기화 실패: {exc}")
    logger.error(f"상세 traceback:\n{traceback.format_exc()}")
    raise

history_store = HistoryStore()


@app.post("/api/ai/search", response_model=HistoryItem)
async def search_ai(payload: SearchRequest) -> HistoryItem:
    try:
        logger.info(f"질문 수신: {payload.question}")
        result = await run_in_threadpool(rag_service.ask, payload.question)
        logger.info(f"답변 생성 완료: prompt_type={result.prompt_type}")
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

    entry = history_store.add(payload.question.strip(), result)
    return _to_history_item(entry)


@app.get("/api/ai/search/history", response_model=List[HistoryItem])
async def get_history() -> List[HistoryItem]:
    entries = await run_in_threadpool(history_store.list)
    return [_to_history_item(entry) for entry in entries]

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


def preprocess_image(image_bytes: bytes, target_size=(224, 224)):
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

