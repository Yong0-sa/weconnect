import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./AIInfoSearchPage.css";
import { fetchAIHistory, sendAIQuestion } from "../api/ai";

const LINK_PATTERN = /(https?:\/\/[^\s)]+)/g;

const sanitizeAssistantMessage = (text, pdfLinks) => {
  if (!text) return "";
  const references = new Set(pdfLinks || []);
  const lines = text.split(/\n+/).map((line) => line.trim());
  return lines
    .filter((line) => {
      if (!line) return false;
      if (/^\[\s*참고\s*링크/i.test(line)) {
        return false;
      }
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
  const defaultMessage = useMemo(
    () => ({
      id: "ai-welcome",
      role: "assistant",
      message:
        "작물 이름이나 증상을 입력하면 AI가 맞춤형 농사 정보를 안내해 드립니다.",
    }),
    []
  );

  const [history, setHistory] = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const [pendingPair, setPendingPair] = useState(null);
  const [query, setQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const historyRef = useRef(null);
  const messageRefs = useRef({});

  const setMessageRef = useCallback((id, node) => {
    if (!node) {
      delete messageRefs.current[id];
      return;
    }
    messageRefs.current[id] = node;
  }, []);

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

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isSending) return;

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
      setPendingPair(null);
      setHistory((prev) => [...prev, response]);
    } catch (error) {
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

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

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

  const formatTimestamp = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

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

  const summarizeQuestion = (text) => {
    if (!text) return "질문 없음";
    return text.length > 32 ? `${text.slice(0, 32)}…` : text;
  };

  const sidebarEntries = history.slice().reverse();

  const renderMessageBlocks = (text) => {
    if (!text) return [];
    return text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  };

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

  const dedupePdfLinks = (entry) => {
    if (entry.role !== "assistant" || !entry.pdfLinks?.length) return [];
    return Array.from(new Set(entry.pdfLinks));
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
                            {references.map((link, index) => (
                              <a
                                key={`${entry.id}-pdf-${index}`}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="ai-link-chip"
                              >
                                {link.length > 60 ? `${link.slice(0, 57)}…` : link}
                              </a>
                            ))}
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
