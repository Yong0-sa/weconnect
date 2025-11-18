import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./AIInfoSearchPage.css";
import { fetchAIHistory, sendAIQuestion } from "../api/ai";

// 공통: 링크 URL 감지 정규식
const LINK_PATTERN = /(https?:\/\/[^\s)]+)/g;

// 📌 AI 응답 텍스트에서 “참고링크”/pdf 링크 제거
const normalizeReferenceLink = (link) => {
  if (!link) return null;
  if (typeof link === "string") {
    const trimmed = link.trim();
    if (!trimmed) return null;
    return { title: trimmed, url: trimmed };
  }
  const url = (link.url || "").trim();
  if (!url) return null;
  const title = (link.title || "").trim() || url;
  return { title, url };
};

const extractReferenceUrls = (pdfLinks) =>
  (pdfLinks || [])
    .map((link) => normalizeReferenceLink(link)?.url)
    .filter(Boolean);

const sanitizeAssistantMessage = (text, pdfLinks) => {
  if (!text) return "";
  const references = new Set(extractReferenceUrls(pdfLinks));

  const lines = text.split(/\n+/).map((line) => line.trim());

  return lines
    .filter((line) => {
      if (!line) return false;
      // ‘참고 링크’ 문장 제거
      if (/^\[\s*참고\s*링크/i.test(line)) {
        return false;
      }
      // pdfLinks에 존재하는 URL 제거
      for (const ref of references) {
        if (line.includes(ref)) {
          return false;
        }
      }
      return true;
    })
    .join("\n\n");
};

function AIInfoSearchPage({ onClose }) {
  // 기본 안내 메시지 (대화가 비어 있을 때 사용)
  const defaultMessage = useMemo(
    () => ({
      id: "ai-welcome",
      role: "assistant",
      message:
        "작물 이름이나 증상을 입력하면 AI가 맞춤형 농사 정보를 안내해 드립니다.",
    }),
    []
  );

  // 상태 관리
  const [history, setHistory] = useState([]);  // DB에서 불러온 전체 대화 기록
  const [localMessages, setLocalMessages] = useState([]);  // 서버 저장 실패한 로컬 메시지들
  const [pendingPair, setPendingPair] = useState(null);  // "답변 생성 중…" 상태 표시
  const [query, setQuery] = useState("");  // 입력창 텍스트
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // 스크롤/메시지 DOM 접근용 ref
  const historyRef = useRef(null);
  const messageRefs = useRef({});

  // 메시지 DOM ref 저장
  // side navigation에서 특정 메시지로 스크롤하기 위해 필요
  const setMessageRef = useCallback((id, node) => {
    if (!node) {
      delete messageRefs.current[id];
      return;
    }
    messageRefs.current[id] = node;
  }, []);

  // 📌 서버에서 AI 히스토리 불러오기
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const logs = await fetchAIHistory();
      setHistory(logs || []);
      setHistoryError("");
    } catch (error) {
      setHistoryError(error.message || "대화 기록을 불러오지 못했습니다.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // 최초 1회: 대화 기록 로드
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 📌 DB 기록을 메시지 형태로 평탄화(flatten)
  //   - 각 로그를 user/assistant 두 줄로 변환
  const flattenedHistory = useMemo(() => {
    if (!history?.length) {
      return [];
    }

    return history.flatMap((log) => {
      const timestamp = log.createdAt;
      return [
        {
          id: `${log.logId}-user`,
          role: "user",
          message: log.question,
          timestamp,
        },
        {
          id: `${log.logId}-assistant`,
          role: "assistant",
          message: sanitizeAssistantMessage(log.answer, log.pdfLinks),
          timestamp,
          pdfLinks: log.pdfLinks,
          promptType: log.promptType,
        },
      ];
    });
  }, [history]);

  // 📌 최종 표시할 메시지 목록
  //  1) 서버 history
  //  2) pending 메시지 (답변 생성 중…)
  //  3) 실패한 로컬 메시지
  //  4) 아무것도 없으면 defaultMessage
  const conversationMessages = useMemo(() => {
    const baseMessages = flattenedHistory.length ? flattenedHistory : [];
    const extras = [];

    if (pendingPair) {
      extras.push(pendingPair.userMessage, pendingPair.assistantMessage);
    }
    if (localMessages.length) {
      extras.push(...localMessages);
    }

    if (!baseMessages.length && !extras.length) {
      return [defaultMessage];
    }
    return [...baseMessages, ...extras];
  }, [flattenedHistory, pendingPair, localMessages, defaultMessage]);

  // 📌 메시지가 추가될 때마다 스크롤 맨 아래 유지
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  // 📌 질문 제출 → pending 표시 → 서버 요청 → 결과 업데이트
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSending) return;

    // 로컬ID로 임시 메시지 생성
    const localId = `local-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const userMessage = {
      id: `${localId}-user`,
      role: "user",
      message: trimmed,
      timestamp,
    };

    const assistantMessage = {
      id: `${localId}-assistant`,
      role: "assistant",
      message: "답변을 생성하는 중입니다...",
      pending: true,
      timestamp,
    };


    setPendingPair({ userMessage, assistantMessage });
    setQuery("");
    setIsSending(true);

    try {
      const response = await sendAIQuestion(trimmed);

      // 성공 → pending 제거 + history에 추가
      setPendingPair(null);
      setHistory((prev) => [...prev, response]);
    } catch (error) {
      // 실패 → 로컬 에러 메시지로 추가
      setPendingPair(null);
      const errorMessage = {
        ...assistantMessage,
        message: error.message || "응답을 가져오지 못했습니다.",
        pending: false,
        isError: true,
      };
      setLocalMessages((prev) => [...prev, userMessage, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // 사이드바 열기/닫기
  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // 사이드바에서 특정 로그 선택 → 해당 위치로 스크롤 이동
  const handleSidebarSelect = (logId) => {
    const target = messageRefs.current[`${logId}-user`];
    if (target && historyRef.current) {
      const offset = target.offsetTop - historyRef.current.offsetTop;

      historyRef.current.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    }
    setIsSidebarOpen(false);
  };

  // 시간 포맷팅 (HH:MM)
  const formatTimestamp = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  // 프롬프트 분류 라벨
  const promptLabel = (promptType) => {
    if (!promptType) return "";
    switch (promptType) {
      case "greet":
        return "인사";
      case "fallback":
        return "일반 안내";
      default:
        return "지식 기반";
    }
  };

  // 질문 요약(사이드바)
  const summarizeQuestion = (text) => {
    if (!text) return "질문 없음";
    return text.length > 32 ? `${text.slice(0, 32)}…` : text;
  };

  const sidebarEntries = history.slice().reverse();

  // 메시지 렌더링 유틸 (블록 단위 분할)
  const renderMessageBlocks = (text) => {
    if (!text) return [];
    return text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  };

  // 링크 자동 감지 → <a> 태그 변환
  const renderWithLinks = (text) => {
    const parts = text.split(LINK_PATTERN);

    return parts.map((segment, index) => {
      LINK_PATTERN.lastIndex = 0;
      if (LINK_PATTERN.test(segment)) {
        const label = segment.length > 50 ? `${segment.slice(0, 47)}…` : segment;
        
        return (
          <a
            key={`lnk-${index}-${segment}`}
            href={segment}
            target="_blank"
            rel="noreferrer"
          >
            {label}
          </a>
        );
      }
      return <span key={`txt-${index}`}>{segment}</span>;
    });
  };

  // pdfLinks 중복 제거 + title/url 정규화
  const dedupePdfLinks = (entry) => {
    if (entry.role !== "assistant" || !entry.pdfLinks?.length) return [];
    const seen = new Set();
    const normalized = [];
    entry.pdfLinks.forEach((link) => {
      const normalizedLink = normalizeReferenceLink(link);
      if (!normalizedLink || seen.has(normalizedLink.url)) return;
      seen.add(normalizedLink.url);
      normalized.push(normalizedLink);
    });
    return normalized;
  };

  return (
    <div className={`ai-info-page${isSidebarOpen ? " sidebar-visible" : ""}`}>
      <div className={`ai-info-shell${isSidebarOpen ? " with-sidebar" : ""}`}>
        <aside className={`ai-info-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3>최근 질문</h3>
            <button
              type="button"
              className="history-refresh-btn"
              onClick={loadHistory}
              disabled={isHistoryLoading}
            >
              새로고침
            </button>
          </div>
          <ul className="chat-room-list">
            {sidebarEntries.length ? (
              sidebarEntries.map((log) => (
                <li key={log.logId}>
                  <button
                    type="button"
                    className="chat-room-item"
                    onClick={() => handleSidebarSelect(log.logId)}
                  >
                    <strong>{summarizeQuestion(log.question)}</strong>
                    <span>{formatTimestamp(log.createdAt)}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="chat-room-empty">아직 질문 기록이 없습니다.</li>
            )}
          </ul>
        </aside>
        <div className="ai-info-card">
          {onClose && (
            <button
              type="button"
              className="ai-close-btn"
              onClick={onClose}
              aria-label="AI 정보 검색 창 닫기"
            >
              ×
            </button>
          )}
          <header className="ai-info-header">
            <div>
              <p className="ai-info-eyebrow">AI 농사 정보 챗봇</p>
              <h2>나의 대화</h2>
            </div>
            <button
              type="button"
              className="chat-room-toggle"
              onClick={handleSidebarToggle}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? "목록 닫기" : "질문 기록"}
            </button>
          </header>
          {historyError && (
            <p className="ai-info-error" role="alert">
              {historyError}
            </p>
          )}
          <section className="ai-info-body">
            <div
              className="ai-info-history"
              ref={historyRef}
              aria-live="polite"
            >
              {isHistoryLoading ? (
                <div className="ai-info-placeholder">대화 기록을 불러오는 중입니다...</div>
              ) : (
                conversationMessages.map((entry) => (
                  <div
                    key={entry.id}
                    ref={(node) => setMessageRef(entry.id, node)}
                    className={`ai-info-bubble ${entry.role}${
                      entry.isError ? " error" : ""
                    }${entry.pending ? " pending" : ""}`}
                  >
                    <div className="bubble-header">
                      <span className="bubble-role">
                        {entry.role === "user" ? "나" : "AI"}
                      </span>
                      {entry.promptType && (
                        <span className="bubble-tag">
                          {promptLabel(entry.promptType)}
                        </span>
                      )}
                      {entry.timestamp && (
                        <span className="bubble-time">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="bubble-body">
                      {renderMessageBlocks(entry.message).map((block, blockIndex) => (
                        <p key={`${entry.id}-block-${blockIndex}`}>
                          {renderWithLinks(block)}
                        </p>
                      ))}
                    </div>
                    {entry.role === "assistant" && (() => {
                      const references = dedupePdfLinks(entry);
                      if (!references.length) return null;
                      return (
                        <div className="ai-pdf-links">
                          <span>참고 링크</span>
                          <div className="ai-link-grid">
                            {references.map((link, index) => {
                              const label = link.title.length > 60 ? `${link.title.slice(0, 57)}…` : link.title;
                              return (
                                <a
                                  key={`${entry.id}-pdf-${index}-${link.url}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ai-link-chip"
                                >
                                  {label}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
            <form className="ai-info-form" onSubmit={handleSubmit}>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예) 토마토 잎이 노랗게 변할 때 대처법 알려줘"
                disabled={isSending}
              />
              <button type="submit" disabled={!query.trim() || isSending}>
                {isSending ? "전송 중..." : "검색"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AIInfoSearchPage;
