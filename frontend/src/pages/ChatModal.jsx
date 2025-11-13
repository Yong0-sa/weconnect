import { useCallback, useEffect, useMemo, useState } from "react";
import "./ChatModal.css";
import { farms as farmListData } from "../data/farms";

const baseChats = [
  {
    id: "owner",
    name: "OO 농장주",
    preview: "안녕하세요~",
    lastTime: "AM 04:28",
  },
  {
    id: "basic",
    name: "기본 캐릭터",
    preview: "언제든지 문의 주세요.",
    lastTime: "어제",
  },
  {
    id: "mentor",
    name: "주말농장 멘토",
    preview: "다음 모임은 이번 주 토요일입니다.",
    lastTime: "3일 전",
  },
];

const baseMessages = {
  owner: [
    {
      id: "owner-1",
      from: "partner",
      text: "안녕하세요~",
      time: "AM 04:28",
    },
  ],
  basic: [
    {
      id: "basic-1",
      from: "partner",
      text: "언제든지 문의 주세요.",
      time: "PM 02:10",
    },
  ],
  mentor: [
    {
      id: "mentor-1",
      from: "partner",
      text: "다음 모임은 이번 주 토요일입니다.",
      time: "AM 09:12",
    },
  ],
};

const formatTimeLabel = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const period = hours < 12 ? "AM" : "PM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour.toString().padStart(2, "0")}:${minutes}`;
};

function ChatModal({ onClose, initialContact }) {
  const [chatList, setChatList] = useState(baseChats);
  const [messagesByChat, setMessagesByChat] = useState(baseMessages);
  const [selectedChatId, setSelectedChatId] = useState(
    baseChats[0]?.id ?? null
  );
  const [messageInput, setMessageInput] = useState("");
  const [activeSidebarView, setActiveSidebarView] = useState("chats");

  const selectedChat = useMemo(
    () => chatList.find((chat) => chat.id === selectedChatId),
    [chatList, selectedChatId]
  );

  const farmList = useMemo(() => farmListData, []);

  const ensureChatForContact = useCallback(
    (contact) => {
      if (!contact?.name) return;

      setChatList((prev) => {
        const existing =
          prev.find((chat) => chat.id === contact.id) ||
          prev.find((chat) => chat.name === contact.name);

        if (existing) {
          setSelectedChatId(existing.id);
          return prev;
        }

        const newId = contact.id || `farm-${Date.now()}`;
      setMessagesByChat((msgs) => {
        if (msgs[newId]) return msgs;
        return {
          ...msgs,
          [newId]: [],
        };
      });
        setSelectedChatId(newId);
        return [
        {
          id: newId,
          name: contact.name,
          preview: "",
          lastTime: "",
        },
          ...prev,
        ];
      });
      setActiveSidebarView("chats");
    },
    [setMessagesByChat, setSelectedChatId]
  );

  useEffect(() => {
    if (initialContact?.name) {
      ensureChatForContact(initialContact);
    }
  }, [initialContact, ensureChatForContact]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId) return;
    const trimmed = messageInput.trim();
    const newMessage = {
      id: `${selectedChatId}-${Date.now()}`,
      from: "me",
      text: trimmed,
      time: formatTimeLabel(),
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
    }));

    setChatList((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              preview: trimmed,
              lastTime: "방금",
            }
          : chat
      )
    );

    setMessageInput("");
  };

  const messages = messagesByChat[selectedChatId] || [];

  return (
    <div className="chat-modal-card">
      {onClose && (
        <button
          type="button"
          className="chat-modal-close"
          onClick={onClose}
          aria-label="채팅 창 닫기"
        >
          ×
        </button>
      )}
      <div className="chat-modal-grid">
        <div className="chat-nav-panel">
          <button
            type="button"
            className={`chat-nav-btn ${
              activeSidebarView === "farms" ? "active" : ""
            }`}
            onClick={() => setActiveSidebarView("farms")}
            aria-label="농장 리스트 보기"
          >
            <span className="chat-nav-icon" aria-hidden="true">
              🌾
            </span>
            <span className="chat-nav-label">농장</span>
          </button>
          <button
            type="button"
            className={`chat-nav-btn ${
              activeSidebarView === "chats" ? "active" : ""
            }`}
            onClick={() => setActiveSidebarView("chats")}
            aria-label="채팅 목록 보기"
          >
            <span className="chat-nav-icon" aria-hidden="true">
              💬
            </span>
            <span className="chat-nav-label">채팅</span>
          </button>
        </div>
        <aside
          className={`chat-list-panel ${
            activeSidebarView === "farms" ? "farms-mode" : ""
          }`}
        >
          <div className="chat-panel-content">
            {activeSidebarView === "chats" ? (
              <>
                <div className="chat-list-header">
                  <span className="chat-list-icon" aria-hidden="true">
                    ✉️
                  </span>
                  <h3>채팅</h3>
                </div>
                <div className="chat-list-scroll">
                  {chatList.map((chat) => (
                    <button
                      type="button"
                      key={chat.id}
                      className={`chat-list-item${
                        chat.id === selectedChatId ? " active" : ""
                      }`}
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <strong>{chat.name}</strong>
                      <p>{chat.preview}</p>
                      <span className="chat-item-time">{chat.lastTime}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="chat-list-header">
                  <span className="chat-list-icon" aria-hidden="true">
                    🌾
                  </span>
                  <h3>농장</h3>
                </div>
                <div className="farm-list-scroll">
                  {farmList.map((farm) => (
                    <button
                      type="button"
                      key={farm.id}
                      className="farm-list-item"
                      onClick={() =>
                        ensureChatForContact({
                          id: `farm-${farm.id}`,
                          name: `${farm.name} 농장주`,
                        })
                      }
                    >
                      <div className="farm-list-texts">
                        <strong>{farm.name}</strong>
                        <p className="farm-meta">{farm.address}</p>
                        <p className="farm-meta">{farm.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
        <section className="chat-room-panel">
          {selectedChat ? (
            <>
              <header className="chat-room-header">
                <h3>{selectedChat.name}</h3>
              </header>
              <div className="chat-room-scroll">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble-row ${message.from}`}
                  >
                    <div className="chat-bubble">
                      <p>{message.text}</p>
                      <span className="chat-bubble-time">{message.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-input-bar">
                <input
                  type="text"
                  placeholder="메시지를 입력하세요"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button type="button" onClick={handleSendMessage}>
                  전송
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty-panel">
              대화를 선택하면 메시지가 표시됩니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ChatModal;
