import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from ultralytics import YOLO


def load_image(image_path: Path) -> Image.Image:
    if not image_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image


def normalise_class_names(names) -> list[str]:
    if isinstance(names, dict):
        return [names[idx] for idx in sorted(names.keys())]
    return list(names)


def extract_scores(result, class_count: int) -> np.ndarray:
    scores = np.zeros(class_count, dtype=np.float32)
    probs = getattr(result, "probs", None)
    if probs is not None and getattr(probs, "data", None) is not None:
        data = probs.data.cpu().numpy()
        length = min(len(data), class_count)
        scores[:length] = data[:length]
        return scores

    boxes = getattr(result, "boxes", None)
    if boxes is not None and getattr(boxes, "cls", None) is not None and getattr(boxes, "conf", None) is not None:
        classes = boxes.cls.tolist()
        confidences = boxes.conf.tolist()
        for cls_idx, conf in zip(classes, confidences):
            idx = int(cls_idx)
            if 0 <= idx < class_count:
                scores[idx] = max(scores[idx], float(conf))
    return scores


def main():
    parser = argparse.ArgumentParser(description="로컬 YOLO 앙상블 추론")
    parser.add_argument("--crop-type", required=True, help="작물 타입 (apple, tomato 등)")
    parser.add_argument("--image", required=True, help="이미지 파일 경로")
    parser.add_argument("--models-root", required=True, help="모델 폴더 상위 경로")
    args = parser.parse_args()

    models_folder = Path(args.models_root) / f"{args.crop_type}_yolo11_models"
    if not models_folder.exists():
        raise FileNotFoundError(f"모델 폴더를 찾을 수 없습니다: {models_folder}")

    model_paths = sorted(models_folder.glob("*.pt"))
    if not model_paths:
        raise FileNotFoundError(f"모델 파일이 없습니다: {models_folder}")

    models = [YOLO(str(path)) for path in model_paths]
    class_names = normalise_class_names(models[0].names)
    image = load_image(Path(args.image))

    aggregated = np.zeros(len(class_names), dtype=np.float32)
    for model in models:
        result = model(image, verbose=False)[0]
        aggregated += extract_scores(result, len(class_names))

    if not np.any(aggregated):
        raise RuntimeError("모델이 유효한 예측을 반환하지 않았습니다.")

    averaged = aggregated / len(models)
    predicted_index = int(np.argmax(averaged))
    confidence = float(averaged[predicted_index])
    label = class_names[predicted_index] if 0 <= predicted_index < len(class_names) else ""

    output = {
        "predicted_index": predicted_index,
        "confidence": round(confidence, 4),
        "message": "진단이 완료되었습니다.",
        "label": label,
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()

