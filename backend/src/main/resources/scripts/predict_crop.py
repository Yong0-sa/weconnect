"""
작물 질병 진단 Python 스크립트

주의사항:
- 이 파일은 클라우드 AI 서버에서 실행되는 스크립트입니다.
- Spring Boot 애플리케이션에서는 이 스크립트를 직접 실행하지 않습니다.
- 현재는 외부 AI 서버(http://10.171.4.7:8000)로 HTTP 요청을 보내는 방식으로 작동합니다.
- 모델 파일 경로(/app/ai/aiModel/)는 클라우드 서버 경로이므로 로컬에서는 존재하지 않습니다.
- IntelliJ에서 빨간 밑줄이 표시될 수 있으나, 이는 정상입니다 (로컬 환경에서는 실행되지 않음).

참고:
- 실제 진단은 AiDiagnosisService.java에서 외부 AI 서버로 HTTP 요청을 보내 처리합니다.
"""

import argparse
import json
import numpy as np
from pathlib import Path
from tensorflow import keras
from PIL import Image
import sys

# 모델 로드 (전역 변수로 한 번만 로드 - 스크립트 시작 시 모든 모델을 메모리에 로드)
# 주의: 모델 경로는 클라우드 서버 경로입니다. 로컬에서는 존재하지 않습니다.
try:
    pepperbell_model = keras.models.load_model('/app/ai/aiModel/pepperbell_finetuned_model.keras')
    potato_model = keras.models.load_model('/app/ai/aiModel/potato_finetuned_model.keras')
    tomato_model = keras.models.load_model('/app/ai/aiModel/tomato_finetuned_model_final2.keras')
except Exception as e:
    # 모델 로드 실패 시 에러 출력 후 종료
    error_result = {
        "predicted_index": -1,
        "confidence": 0.0,
        "message": f"모델 로드 실패: {str(e)}",
        "label": ""
    }
    print(json.dumps(error_result, ensure_ascii=False))
    sys.exit(1)

# 이미지 전처리 함수
def preprocess_image(image_path, target_size=(224, 224)):
    """이미지를 모델 입력 형태로 전처리"""
    try:
        img = Image.open(image_path)
        # RGB로 변환 (RGBA나 다른 형식 대응)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # 리사이즈
        img = img.resize(target_size)
        # numpy 배열로 변환
        img_array = np.array(img)
        # 정규화 (0-255 -> 0-1)
        img_array = img_array.astype('float32') / 255.0
        # 배치 차원 추가 (1, 224, 224, 3)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        raise ValueError(f"이미지 전처리 실패: {str(e)}")

# 작물 타입에 따라 모델 선택
def get_model(crop_type):
    """작물 타입에 따라 해당 모델 반환"""
    if crop_type == "potato":
        return potato_model
    elif crop_type == "paprika":
        return pepperbell_model
    elif crop_type == "tomato":
        return tomato_model
    else:
        raise ValueError(f"지원하지 않는 작물 타입: {crop_type}")

# 예측 수행
def predict(model, image_array):
    """모델을 사용하여 예측 수행"""
    try:
        predictions = model.predict(image_array, verbose=0)
        predicted_index = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_index])
        return predicted_index, confidence
    except Exception as e:
        raise RuntimeError(f"예측 실패: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="작물 질병 진단 스크립트")
    parser.add_argument("--crop-type", required=True, help="작물 타입 (potato, paprika, tomato)")
    parser.add_argument("--image", required=True, help="이미지 파일 경로")
    args = parser.parse_args()

    crop_type = args.crop_type
    image_path = Path(args.image)

    # 이미지 파일 존재 확인
    if not image_path.exists():
        error_result = {
            "predicted_index": -1,
            "confidence": 0.0,
            "message": f"이미지 파일을 찾을 수 없습니다: {image_path}",
            "label": ""
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

    try:
        # 작물 타입에 따라 모델 선택
        model = get_model(crop_type)
        
        # 이미지 전처리
        image_array = preprocess_image(image_path)
        
        # 예측 수행
        predicted_index, confidence = predict(model, image_array)
        
        # 결과 반환
        result = {
            "predicted_index": predicted_index,
            "confidence": round(confidence, 4),
            "message": "진단이 완료되었습니다.",
            "label": ""
        }
        
        print(json.dumps(result, ensure_ascii=False))
        
    except ValueError as e:
        error_result = {
            "predicted_index": -1,
            "confidence": 0.0,
            "message": str(e),
            "label": ""
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        error_result = {
            "predicted_index": -1,
            "confidence": 0.0,
            "message": f"진단 중 오류 발생: {str(e)}",
            "label": ""
        }
        print(json.dumps(error_result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
