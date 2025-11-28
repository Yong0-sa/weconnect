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


# =======================================================
# 기본 설정
# =======================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="WeConnect AI Search API")


@dataclass
class EnsemblePrediction:
    predicted_index: int
    confidence: float
    label: str


# -------------------------------------------------------
# 모델 디렉토리 자동 탐색
# -------------------------------------------------------
def _detect_model_root() -> Path:
    project_root = Path(__file__).resolve().parents[1]
    ai_models = project_root / "ai" / "models"
    if ai_models.exists():
        logger.info("저장소 ai/models 디렉터리를 사용합니다: %s", ai_models)
    return ai_models


MODEL_ROOT = _detect_model_root()

# crop → 모델 폴더 매핑
CROP_MODEL_FOLDERS: Dict[str, Dict[str, str]] = {
    "apple": {"folder": "apple_yolo11_models", "display_name": "사과"},
    "tomato": {"folder": "tomato_yolo11_models", "display_name": "토마토"},
    "grape": {"folder": "grape_yolo11_models", "display_name": "포도"},
}


def _normalise_class_names(names: Union[Dict[int, str], List[str]]) -> List[str]:
    if isinstance(names, dict):
        return [names[idx] for idx in sorted(names.keys())]
    return list(names)


# =======================================================
# YOLO Utils (추론 / TTA / 박스 추출)
# =======================================================
def extract_boxes(result, img_w: int, img_h: int):
    bboxes, scores, labels = [], [], []

    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return bboxes, scores, labels

    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0]
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])

        bboxes.append([x1.item() / img_w, y1.item() / img_h, x2.item() / img_w, y2.item() / img_h])
        scores.append(conf)
        labels.append(cls_id)

    return bboxes, scores, labels


def tta_inference(model: YOLO, img_pil: Image.Image):
    img_w, img_h = img_pil.size
    all_bboxes, all_scores, all_labels = [], [], []

    # 원본
    base_res = model.predict(np.array(img_pil), conf=0.25, iou=0.6, verbose=False)[0]
    b1, s1, l1 = extract_boxes(base_res, img_w, img_h)
    all_bboxes += b1; all_scores += s1; all_labels += l1

    # 좌우 flip
    img_hf = img_pil.transpose(Image.FLIP_LEFT_RIGHT)
    hf_res = model.predict(np.array(img_hf), conf=0.25, iou=0.6, verbose=False)[0]
    b2, s2, l2 = extract_boxes(hf_res, img_w, img_h)
    b2 = [[1 - x2, y1, 1 - x1, y2] for (x1, y1, x2, y2) in b2]
    all_bboxes += b2; all_scores += s2; all_labels += l2

    # 상하 flip
    img_vf = img_pil.transpose(Image.FLIP_TOP_BOTTOM)
    vf_res = model.predict(np.array(img_vf), conf=0.25, iou=0.6, verbose=False)[0]
    b3, s3, l3 = extract_boxes(vf_res, img_w, img_h)
    b3 = [[x1, 1 - y2, x2, 1 - y1] for (x1, y1, x2, y2) in b3]
    all_bboxes += b3; all_scores += s3; all_labels += l3

    return all_bboxes, all_scores, all_labels


# =======================================================
# YOLO 앙상블 클래스
# =======================================================
class YOLOEnsemble:
    def __init__(self, crop_type: str, model_paths: List[Path]):
        self.crop_type = crop_type
        self.model_paths = model_paths
        self._models = []
        self._class_names = []
        self._load_lock = Lock()

    def _ensure_loaded(self):
        if self._models:
            return

        loaded = []
        for path in self.model_paths:
            if path.exists():
                loaded.append(YOLO(str(path)))
            else:
                logger.warning("모델 파일 없음: %s", path)

        if not loaded:
            raise RuntimeError(f"{self.crop_type} 모델을 로드할 수 없습니다.")

        self._models = loaded
        self._class_names = _normalise_class_names(loaded[0].names)

    def predict(self, image: Image.Image) -> EnsemblePrediction:
        self._ensure_loaded()

        all_boxes, all_scores, all_labels = [], [], []

        # 모델별 TTA
        for model in self._models:
            b, s, l = tta_inference(model, image)
            all_boxes.append(b); all_scores.append(s); all_labels.append(l)

        if not any(len(b) for b in all_boxes):
            raise RuntimeError("모델이 유효한 박스를 반환하지 않았습니다.")

        # WBF
        fused_boxes, fused_scores, fused_labels = weighted_boxes_fusion(
            all_boxes, all_scores, all_labels, iou_thr=0.5, skip_box_thr=0.001
        )

        if len(fused_boxes) == 0:
            raise RuntimeError("WBF 결과가 비어 있습니다.")

        best_idx = int(np.argmax(fused_scores))
        confidence = float(fused_scores[best_idx])
        cls_idx = int(fused_labels[best_idx])
        label = self._class_names[cls_idx] if cls_idx < len(self._class_names) else f"class_{cls_idx}"

        return EnsemblePrediction(predicted_index=cls_idx, confidence=confidence, label=label)


# =======================================================
# 모델 로딩 캐시
# =======================================================
_ensemble_registry = {}
_ensemble_lock = Lock()


def _collect_model_paths(crop_type: str) -> List[Path]:
    folder = MODEL_ROOT / CROP_MODEL_FOLDERS[crop_type]["folder"]
    model_files = sorted(folder.glob("*.pt"))
    if not model_files:
        raise FileNotFoundError(f"{crop_type} 모델 파일을 찾을 수 없습니다.")
    return model_files


def get_yolo_ensemble(crop_type: str) -> YOLOEnsemble:
    with _ensemble_lock:
        if crop_type not in _ensemble_registry:
            paths = _collect_model_paths(crop_type)
            _ensemble_registry[crop_type] = YOLOEnsemble(crop_type, paths)
        return _ensemble_registry[crop_type]


# =======================================================
# 이미지 로딩
# =======================================================
def load_image(image_bytes: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except Exception:
        raise ValueError("이미지 파일을 불러올 수 없습니다.")


# =======================================================
# RAG + 글추천 관련 기존 코드 (생략: 그대로 유지)
# =======================================================
# ... (여기까지 네 코드 그대로 유지하면 됨) ...


# =======================================================
# 🔥 작물 진단 API (완전히 정리된 최종 버전)
# =======================================================

@app.post("/predict/apple")
async def predict_apple(file: UploadFile = File(...)):
    return await predict_crop("apple", file)


@app.post("/predict/grape")
async def predict_grape(file: UploadFile = File(...)):
    return await predict_crop("grape", file)


@app.post("/predict/tomato")
async def predict_tomato(file: UploadFile = File(...)):
    return await predict_crop("tomato", file)


async def predict_crop(crop_type: str, file: UploadFile):
    normalized = crop_type.lower()

    # 이미지 읽기
    img_bytes = await file.read()
    if not img_bytes:
        raise HTTPException(
            status_code=400,
            detail="진단에 실패했습니다. 병해를 다른 각도에서 선명하게 찍어 다시 시도해주세요."
        )

    # 이미지 로딩 오류
    try:
        image = await run_in_threadpool(load_image, img_bytes)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="진단에 실패했습니다. 병해를 다른 각도에서 선명하게 찍어 다시 시도해주세요."
        )

    # 모델 로드 실패
    try:
        ensemble = get_yolo_ensemble(normalized)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="필요한 모델 파일이 누락되었습니다. 관리자에게 문의해주세요."
        )

    # YOLO 예측
    try:
        prediction = await run_in_threadpool(ensemble.predict, image.copy())

    # 박스 없음 / WBF 실패 / RuntimeError → 동일 메시지
    except RuntimeError:
        raise HTTPException(
            status_code=400,
            detail="진단에 실패했습니다. 병해를 다른 각도에서 선명하게 찍어 다시 시도해주세요."
        )

    # 흐림 / 좌표 에러 / 타입 에러 → 동일 메시지
    except (ValueError, IndexError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="진단에 실패했습니다. 병해를 다른 각도에서 선명하게 찍어 다시 시도해주세요."
        )

    # 기타 예상 못한 오류
    except Exception:
        logger.error("YOLO 예측 중 내부 오류 발생", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="AI 서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        )

    # 정상 응답
    return {
        "predicted_index": prediction.predicted_index,
        "confidence": round(prediction.confidence, 4),
        "label": prediction.label,
        "message": "진단이 완료되었습니다."
    }


