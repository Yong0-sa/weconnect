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
from ensemble_boxes import weighted_boxes_fusion  # 🔥 WBF

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
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
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

# 🔥 실제 배포 시 모델 폴더명은 여기에 맞춰 두면 됨
CROP_MODEL_FOLDERS: Dict[str, Dict[str, str]] = {
    "apple": {"folder": "apple_yolo11_models", "display_name": "사과"},
    "tomato": {"folder": "tomato_yolo11_models", "display_name": "토마토"},
    "grape": {"folder": "grape_yolo11_models", "display_name": "포도"},
}


def _normalise_class_names(names: Union[Dict[int, str], List[str]]) -> List[str]:
    if isinstance(names, dict):
        return [names[idx] for idx in sorted(names.keys())]
    return list(names)


# =====================================================
#   🔥 YOLO Detection + TTA + WBF 전용 유틸 함수들
# =====================================================

def extract_boxes(result, img_w: int, img_h: int):
    """
    YOLO detection 결과에서 [x1, y1, x2, y2] (0~1 정규화), scores, labels 추출
    """
    bboxes: List[List[float]] = []
    scores: List[float] = []
    labels: List[int] = []

    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return bboxes, scores, labels

    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0]
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])

        bboxes.append([
            x1.item() / img_w,
            y1.item() / img_h,
            x2.item() / img_w,
            y2.item() / img_h,
            ])
        scores.append(conf)
        labels.append(cls_id)

    return bboxes, scores, labels


def tta_inference(model: YOLO, img_pil: Image.Image):
    """
    하나의 YOLO 모델에 대해 TTA(원본, 가로 flip, 세로 flip) 적용 후
    모든 박스를 원본 좌표계(0~1) 기준으로 합쳐서 반환.
    """
    img_w, img_h = img_pil.size

    all_bboxes: List[List[float]] = []
    all_scores: List[float] = []
    all_labels: List[int] = []

    logger.info("🔁 TTA 실행: size=%s", img_pil.size)

    # 1) 원본
    base_res = model.predict(
        np.array(img_pil),
        conf=0.25,
        iou=0.6,
        verbose=False,
    )[0]
    b1, s1, l1 = extract_boxes(base_res, img_w, img_h)
    all_bboxes += b1
    all_scores += s1
    all_labels += l1

    # 2) 좌우 flip
    img_hflip = img_pil.transpose(Image.FLIP_LEFT_RIGHT)
    h_res = model.predict(
        np.array(img_hflip),
        conf=0.25,
        iou=0.6,
        verbose=False,
    )[0]
    b2, s2, l2 = extract_boxes(h_res, img_w, img_h)
    # 좌표 원복: x만 반전
    b2_restored = [
        [1 - x2, y1, 1 - x1, y2] for (x1, y1, x2, y2) in b2
    ]
    all_bboxes += b2_restored
    all_scores += s2
    all_labels += l2

    # 3) 상하 flip
    img_vflip = img_pil.transpose(Image.FLIP_TOP_BOTTOM)
    v_res = model.predict(
        np.array(img_vflip),
        conf=0.25,
        iou=0.6,
        verbose=False,
    )[0]
    b3, s3, l3 = extract_boxes(v_res, img_w, img_h)
    # 좌표 원복: y만 반전
    b3_restored = [
        [x1, 1 - y2, x2, 1 - y1] for (x1, y1, x2, y2) in b3
    ]
    all_bboxes += b3_restored
    all_scores += s3
    all_labels += l3

    return all_bboxes, all_scores, all_labels


class YOLOEnsemble:
    """
    🔥 YOLO11 Object Detection + Fold 앙상블 + TTA + WBF
    - 여러 fold 모델을 로드
    - 각 모델에 TTA inference
    - 모든 결과를 Weighted Box Fusion으로 합치고
    - 가장 confidence 높은 박스의 class를 최종 label로 사용
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
        logger.info(
            "YOLO 앙상블 로드 완료: crop=%s, class_count=%d",
            self.crop_type,
            len(self._class_names),
        )

    def predict(self, image: Image.Image) -> EnsemblePrediction:
        """
        Detection 결과 기반으로:
        - fold * TTA 결과 전부 모으고
        - WBF로 박스 합친 다음
        - confidence 가장 높은 class 하나만 최종 반환
        """
        with self._load_lock:
            self._ensure_loaded()

        img_w, img_h = image.size

        all_boxes_list: List[List[List[float]]] = []
        all_scores_list: List[List[float]] = []
        all_labels_list: List[List[int]] = []

        # 🔥 각 fold 모델에 TTA inference 적용
        for model in self._models:
            bboxes, scores, labels = tta_inference(model, image)
            all_boxes_list.append(bboxes)
            all_scores_list.append(scores)
            all_labels_list.append(labels)

        if not any(len(b) for b in all_boxes_list):
            raise RuntimeError("모델이 유효한 박스를 반환하지 않았습니다.")

        logger.info(
            "📦 WBF 입력 준비: folds=%d, total_boxes=%d",
            len(self._models),
            sum(len(b) for b in all_boxes_list),
        )


        # 🔥 Weighted Box Fusion
        fused_boxes, fused_scores, fused_labels = weighted_boxes_fusion(
            all_boxes_list,
            all_scores_list,
            all_labels_list,
            iou_thr=0.5,
            skip_box_thr=0.001,
        )

        if len(fused_boxes) == 0:
            raise RuntimeError("WBF 결과가 비어 있습니다.")

        # 🔥 가장 confidence 높은 박스 선택
        best_idx = int(np.argmax(fused_scores))
        best_score = float(fused_scores[best_idx])
        best_label_idx = int(fused_labels[best_idx])

        logger.info(
            "🔥 WBF 결과: fused=%d, top_score=%.4f, top_label=%d",
            len(fused_boxes),
            fused_scores[best_idx],
            best_label_idx,
        )


        if best_label_idx < len(self._class_names):
            label = self._class_names[best_label_idx]
        else:
            label = f"class_{best_label_idx}"

        return EnsemblePrediction(
            predicted_index=best_label_idx,
            confidence=best_score,
            label=label,
        )


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


# ===================== RAG 히스토리 구조 =====================

@dataclass
class HistoryEntry:
    id: str
    question: str
    answer: str
    pdf_links: List[ReferenceLink]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


class HistoryStore:
    def __init__(self, max_items: int = 100) -> None:
        self._items: Deque[HistoryEntry] = deque(maxlen=max_items)
        self._lock = Lock()

    def add(self, question: str, result: RAGResult) -> HistoryEntry:
        entry = HistoryEntry(
            id=str(uuid4()),
            question=question,
            answer=result.answer,
            pdf_links=list(result.pdf_links or []),
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


# 요청/응답 구조 정의

class SearchRequest(BaseModel):
    question: str = Field(..., min_length=1, description="사용자 질문")


class ReferenceLinkModel(BaseModel):
    title: str
    url: str


class HistoryItem(BaseModel):
    id: str
    question: str
    answer: str
    pdf_links: List[ReferenceLinkModel]
    embed_ids: List[str]
    prompt_type: Literal["greet", "answer", "fallback"]
    created_at: datetime


def _to_history_item(entry: HistoryEntry) -> HistoryItem:
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

# 전역 히스토리 저장소
history_store = HistoryStore()


@app.post("/api/ai/chat", response_model=HistoryItem)
async def search_ai(payload: SearchRequest) -> HistoryItem:
    try:
        logger.info("질문 수신: %s", payload.question)
        result = await run_in_threadpool(rag_service.ask, payload.question)
        logger.info("답변 생성 완료: prompt_type=%s", result.prompt_type)
    except InappropriateQueryError as exc:
        logger.warning("부적절한 질문: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except EmptyQueryError as exc:
        logger.warning("빈 질문: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RAGServiceError as exc:
        logger.error("RAG 서비스 에러 발생: %s", exc)
        logger.error("상세 traceback:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("예상치 못한 에러 발생: %s: %s", type(exc).__name__, exc)
        logger.error("상세 traceback:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {exc}") from exc

    entry = history_store.add(payload.question.strip(), result)
    return _to_history_item(entry)


@app.get("/api/ai/chat/history", response_model=List[HistoryItem])
async def get_history() -> List[HistoryItem]:
    entries = await run_in_threadpool(history_store.list)
    return [_to_history_item(entry) for entry in entries]


# ===== AI 글작성 도우미 엔드포인트 =====

class TextSuggestionRequest(BaseModel):
    content: str = Field(..., min_length=1, description="현재 작성 중인 내용")


class TextSuggestionResponse(BaseModel):
    suggestions: List[str] = Field(..., description="추천 문장 리스트 (2개)")


@app.post("/text-suggestions", response_model=TextSuggestionResponse)
async def get_text_suggestions(payload: TextSuggestionRequest) -> TextSuggestionResponse:
    try:
        logger.info("문장 추천 요청: 내용 길이=%d 글자", len(payload.content))
        suggestions = await run_in_threadpool(
            text_suggestion_service.get_suggestions,
            payload.content,
        )
        logger.info("문장 추천 완료: %d개 문장 생성", len(suggestions))
        return TextSuggestionResponse(suggestions=suggestions)
    except TextSuggestionError as exc:
        logger.error("문장 추천 에러: %s", exc)
        logger.error("상세 traceback:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("예상치 못한 에러: %s: %s", type(exc).__name__, exc)
        logger.error("상세 traceback:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"서버 내부 오류: {exc}") from exc


# ===== 작물 진단 엔드포인트 =====

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
    """YOLO TTA + WBF 앙상블을 활용한 작물 질병 진단 공통 함수"""
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
