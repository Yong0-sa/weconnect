@echo off
REM AI 서버 시작 스크립트 (Windows)

echo AI 서버 시작 중...

REM 모델 디렉토리 확인
if "%MODEL_DIR%"=="" set MODEL_DIR=/app/ai/aiModel
echo 모델 디렉토리: %MODEL_DIR%

REM uvicorn으로 FastAPI 서버 시작
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause

