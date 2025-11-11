import { useMemo, useState } from "react";
import "./AIInfoSearchPage.css";

function AIInfoSearchPage({ onClose }) {
  const defaultMessage = useMemo(
    () => ({
      role: "assistant",
      message:
        "작물 이름이나 증상을 입력하면 AI가 맞춤형 농사 정보를 안내해 드립니다.",
    }),
    []
  );

  const [rooms, setRooms] = useState([
    { id: "general", title: "기본 상담" },
    { id: "disease", title: "병해충 질문" },
  ]);
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [threads, setThreads] = useState({
    general: [defaultMessage],
    disease: [
      defaultMessage,
      {
        role: "user",
        message: "딸기 잎에 갈색 반점이 퍼져요. 해결법이 있을까요?",
      },
    ],
  });
  const [query, setQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setThreads((prev) => {
      const current = prev[activeRoomId] || [defaultMessage];
      const updated = [
        ...current,
        { role: "user", message: trimmed },
        {
          role: "assistant",
          message: "AI 응답 자리입니다. 추후 LLM 결과를 여기에 표시하세요.",
        },
      ];
      return { ...prev, [activeRoomId]: updated };
    });
    setQuery("");
  };

  const handleRoomSelect = (roomId) => {
    setActiveRoomId(roomId);
    setIsSidebarOpen(false);
    if (!threads[roomId]) {
      setThreads((prev) => ({ ...prev, [roomId]: [defaultMessage] }));
    }
  };

  const handleNewChat = () => {
    const newId = `chat-${rooms.length + 1}`;
    const newRoom = { id: newId, title: `새 대화 ${rooms.length - 1}` };
    setRooms((prev) => [...prev, newRoom]);
    setActiveRoomId(newId);
    setThreads((prev) => ({ ...prev, [newId]: [defaultMessage] }));
    setIsSidebarOpen(false);
  };

  const activeEntries = threads[activeRoomId] || [defaultMessage];
  const activeRoomTitle =
    rooms.find((room) => room.id === activeRoomId)?.title || "새 대화";

  return (
    <div className={`ai-info-page${isSidebarOpen ? " sidebar-visible" : ""}`}>
      <div className={`ai-info-shell${isSidebarOpen ? " with-sidebar" : ""}`}>
        <aside className={`ai-info-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3>채팅 목록</h3>
          </div>
          <ul className="chat-room-list">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={`chat-room-item${
                    room.id === activeRoomId ? " active" : ""
                  }`}
                  onClick={() => handleRoomSelect(room.id)}
                >
                  {room.title}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="new-chat-btn" onClick={handleNewChat}>
            + 새 대화
          </button>
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
            <h2>{activeRoomTitle}</h2>
          </div>
          <button
            type="button"
            className="chat-room-toggle"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? "목록 닫기" : "채팅 목록"}
          </button>
        </header>
        <section className="ai-info-body">
          <div className="ai-info-history" aria-live="polite">
            {activeEntries.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`ai-info-bubble ${entry.role}`}
              >
                <span className="bubble-role">
                  {entry.role === "user" ? "나" : "AI"}
                </span>
                <p>{entry.message}</p>
              </div>
            ))}
          </div>
          <form className="ai-info-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예) 토마토 잎이 노랗게 변할 때 대처법 알려줘"
            />
            <button type="submit" disabled={!query.trim()}>
              검색
            </button>
          </form>
        </section>
      </div>
      </div>
    </div>
  );
}

export default AIInfoSearchPage;
