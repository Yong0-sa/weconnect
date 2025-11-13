from __future__ import annotations

import logging
import traceback
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Deque, List, Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from rag_service import (
    EmptyQueryError,
    InappropriateQueryError,
    RAGResult,
    RAGService,
    RAGServiceError,
)

app = FastAPI(title="WeConnect AI Search API")

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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
