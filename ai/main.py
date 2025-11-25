from __future__ import annotations

import io
import logging
import os
import traceback
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Deque, Dict, List, Literal, Union
from uuid import uuid4

import numpy as np
from PIL import Image
from fastapi import File, FastAPI, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from ultralytics import YOLO

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


@dataclass
class EnsemblePrediction:
    predicted_index: int
    confidence: float
    label: str


def _detect_model_root() -> Path:
    """
    저장소 내부 ai/models 디렉터리를 기본 모델 경로로 사용한다.
    """
    project_root = Path(__file__).resolve().parents[1]
    ai_models = project_root / "ai" / "models"
    if ai_models.exists():
        logger.info("저장소 ai/models 디렉터리를 사용합니다: %s", ai_models)
    else:
        logger.warning("ai/models 디렉터리가 없어도 기본 경로로 사용합니다: %s", ai_models)
    return ai_models


MODEL_ROOT = _detect_model_root()

CROP_MODEL_FOLDERS: Dict[str, Dict[str, str]] = {
    "apple": {"folder": "apple_yolo11_models", "display_name": "사과"},
    "tomato": {"folder": "tomato_yolo11_models", "display_name": "토마토"},
    "grape": {"folder": "grape_yolo11_models", "display_name": "포도"},
}


def _normalise_class_names(names: Union[Dict[int, str], List[str]]) -> List[str]:
    if isinstance(names, dict):
        return [names[idx] for idx in sorted(names.keys())]
    return list(names)


class YOLOEnsemble:
    """
    폴드 모델 여러 개를 앙상블하여 하나의 예측을 반환한다.
    """

    def __init__(self, crop_type: str, model_paths: List[Path]) -> None:
        self.crop_type = crop_type
        self.model_paths = model_paths
        self._models: List[YOLO] = []
        self._class_names: List[str] = []
        self._load_lock = Lock()

    def _ensure_loaded(self) -> None:
        if self._models:
            return

        if not self.model_paths:
            raise RuntimeError(f"{self.crop_type} 모델 경로가 비어 있습니다.")

        logger.info(
            "YOLO 앙상블 로드 시작: crop=%s, models=%s",
            self.crop_type,
            ", ".join(str(path) for path in self.model_paths),
        )
        loaded: List[YOLO] = []
        for path in self.model_paths:
            if not path.exists():
                logger.warning("모델 파일을 찾을 수 없습니다: %s", path)
                continue
            loaded.append(YOLO(str(path)))

        if not loaded:
            raise RuntimeError(f"{self.crop_type} 모델을 로드하지 못했습니다.")

        names = loaded[0].names
        self._class_names = _normalise_class_names(names)
        self._models = loaded
        logger.info("YOLO 앙상블 로드 완료: crop=%s, class_count=%d", self.crop_type, len(self._class_names))

    def _extract_scores(self, result) -> np.ndarray:
        scores = np.zeros(len(self._class_names), dtype=np.float32)
        probs = getattr(result, "probs", None)
        if probs is not None and getattr(probs, "data", None) is not None:
            data = probs.data.cpu().numpy()
            length = min(len(data), len(scores))
            scores[:length] = data[:length]
            return scores

        boxes = getattr(result, "boxes", None)
        if boxes is not None and getattr(boxes, "cls", None) is not None and getattr(boxes, "conf", None) is not None:
            classes = boxes.cls.tolist()
            confidences = boxes.conf.tolist()
            for cls_idx, conf in zip(classes, confidences):
                idx = int(cls_idx)
                if 0 <= idx < len(scores):
                    scores[idx] = max(scores[idx], float(conf))
        return scores

    def predict(self, image: Image.Image) -> EnsemblePrediction:
        with self._load_lock:
            self._ensure_loaded()

        aggregated = np.zeros(len(self._class_names), dtype=np.float32)
        # 모델별 추론은 thread-safe 하지 않을 수 있으므로 순차 실행
        for model in self._models:
            result = model(image, verbose=False)[0]
            aggregated += self._extract_scores(result)

        if not np.any(aggregated):
            raise RuntimeError("모델이 유효한 신뢰도를 반환하지 않았습니다.")

        averaged = aggregated / len(self._models)
        predicted_index = int(np.argmax(averaged))
        confidence = float(averaged[predicted_index])
        if predicted_index < len(self._class_names):
            label = self._class_names[predicted_index]
        else:
            label = f"class_{predicted_index}"

        return EnsemblePrediction(predicted_index=predicted_index, confidence=confidence, label=label)


_ensemble_registry: Dict[str, YOLOEnsemble] = {}
_ensemble_lock = Lock()


def _collect_model_paths(crop_type: str) -> List[Path]:
    config = CROP_MODEL_FOLDERS[crop_type]
    folder = MODEL_ROOT / config["folder"]
    if not folder.exists():
        raise FileNotFoundError(f"{crop_type} 모델 폴더를 찾을 수 없습니다: {folder}")

    model_files = sorted(folder.glob("*.pt"))
    if not model_files:
        raise FileNotFoundError(f"{crop_type} 모델 파일이 비어 있습니다: {folder}")
    return model_files


def get_yolo_ensemble(crop_type: str) -> YOLOEnsemble:
    normalized = crop_type.lower()
    if normalized not in CROP_MODEL_FOLDERS:
        raise ValueError(f"지원하지 않는 작물 타입: {crop_type}")

    with _ensemble_lock:
        if normalized not in _ensemble_registry:
            model_paths = _collect_model_paths(normalized)
            _ensemble_registry[normalized] = YOLOEnsemble(normalized, model_paths)
    return _ensemble_registry[normalized]


def load_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        return image
    except Exception as exc:
        raise ValueError(f"이미지 파일을 열 수 없습니다: {exc}") from exc


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
    현재 작성 중인 내용을 기반으로 자연스럽게 이어질 문장 2가지 제안
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


@app.post("/predict/apple")
async def predict_apple(file: UploadFile = File(...)):
    """사과 질병 진단"""
    logger.info("사과 진단 요청 수신: filename=%s", file.filename)
    return await predict_crop("apple", file)


@app.post("/predict/grape")
async def predict_grape(file: UploadFile = File(...)):
    """포도 질병 진단"""
    logger.info("포도 진단 요청 수신: filename=%s", file.filename)
    return await predict_crop("grape", file)


@app.post("/predict/tomato")
async def predict_tomato(file: UploadFile = File(...)):
    """토마토 질병 진단"""
    logger.info("토마토 진단 요청 수신: filename=%s", file.filename)
    return await predict_crop("tomato", file)


async def predict_crop(crop_type: str, file: UploadFile):
    """YOLO 앙상블을 활용한 작물 질병 진단 공통 함수"""
    normalized = crop_type.lower()
    if normalized not in CROP_MODEL_FOLDERS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 작물 타입입니다: {crop_type}")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지 파일이 비어있습니다.")

    try:
        image = await run_in_threadpool(load_image, image_bytes)
        logger.info("이미지 로딩 완료: crop=%s, size=%s", crop_type, image.size)
    except ValueError as exc:
        logger.error("이미지 전처리 실패: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        ensemble = get_yolo_ensemble(normalized)
    except FileNotFoundError as exc:
        logger.error("모델 파일 누락: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=f"{crop_type} 모델 파일을 찾을 수 없습니다. 관리자에게 문의하세요.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        prediction = await run_in_threadpool(ensemble.predict, image.copy())
    except Exception as exc:
        logger.error("YOLO 추론 실패: crop=%s, error=%s", crop_type, exc)
        logger.error("상세 traceback:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"작물 진단 중 오류가 발생했습니다: {exc}") from exc

    logger.info(
        "진단 완료: crop=%s, label=%s, index=%s, confidence=%.4f",
        crop_type,
        prediction.label,
        prediction.predicted_index,
        prediction.confidence,
    )

    return {
        "predicted_index": prediction.predicted_index,
        "confidence": round(prediction.confidence, 4),
        "message": "진단이 완료되었습니다.",
        "label": prediction.label,
    }
