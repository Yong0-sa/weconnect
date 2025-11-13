#!/bin/bash
# AI 서버 시작 스크립트

echo "AI 서버 시작 중..."

# 가상환경 활성화 (필요한 경우)
# source venv/bin/activate

# 모델 디렉토리 확인
MODEL_DIR=${MODEL_DIR:-/app/ai/aiModel}
echo "모델 디렉토리: $MODEL_DIR"

# uvicorn으로 FastAPI 서버 시작
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

