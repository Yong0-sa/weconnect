import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ChatModal.css";
import { farms as farmListData } from "../data/farms";
import {
  ensureChatRoom,
  fetchChatMessages,
  fetchChatRooms,
  sendChatMessage,
} from "../api/chat";
import { fetchMyProfile } from "../api/profile";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

if (typeof window !== "undefined" && typeof window.global === "undefined") {
  window.global = window;
}

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");
const WS_ENDPOINT = `${API_BASE}/ws/chat`;

const formatListTime = (timestamp) => {
  if (!timestamp) return "";
  const target = new Date(timestamp);
  const now = new Date();
  const diffMs = now - target;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutesAgo = Math.max(1, Math.floor(diffMs / minute));
    return `${minutesAgo}분 전`;
  }
  if (diffMs < day) {
    return target.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffMs < day * 7) {
    const daysAgo = Math.floor(diffMs / day);
    return `${daysAgo}일 전`;
  }
  return target.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";
  const target = new Date(timestamp);
  return target.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveRoomName = (room, currentUserId) => {
  if (!room) return "채팅방";
  if (currentUserId && room.userId === currentUserId) {
    return room.farmerName || room.farmName || "농장주";
  }
  if (currentUserId && room.farmerId === currentUserId) {
    return room.userName || room.userNickname || "회원";
  }
  return room.userName || room.farmerName || room.farmName || "채팅방";
};

const toBubbleMessage = (message, currentUserId) => ({
  id: message.contentId ?? `${message.roomId}-${message.createdAt}`,
  from:
    currentUserId && message.senderId === currentUserId ? "me" : "partner",
  text: message.content,
  time: formatMessageTime(message.createdAt),
});

function ChatModal({ onClose, initialContact }) {
  const [rooms, setRooms] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [activeSidebarView, setActiveSidebarView] = useState("chats");
  const [roomError, setRoomError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isEnsuringRoom, setIsEnsuringRoom] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [wsError, setWsError] = useState("");
  const subscriptionRef = useRef(null);
  const chatScrollRef = useRef(null);

  const farmList = useMemo(() => farmListData, []);

  const loadRooms = useCallback(
    async ({ selectRoomId } = {}) => {
      setIsLoadingRooms(true);
      setRoomError("");
      try {
        const list = await fetchChatRooms();
        setRooms(list);
        setSelectedChatId((prev) => {
          if (selectRoomId != null) return selectRoomId;
          if (!list.length) return null;
          if (prev && list.some((room) => room.roomId === prev)) {
            return prev;
          }
          return list[0]?.roomId ?? null;
        });
      } catch (error) {
        setRoomError(error.message || "채팅방 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingRooms(false);
      }
    },
    []
  );

  const ensureChatForContact = useCallback(
    async (contact) => {
      if (!contact) return;
      if (contact.roomId) {
        await loadRooms({ selectRoomId: contact.roomId });
        setActiveSidebarView("chats");
        return;
      }

      if (!contact.farmId || !contact.farmerId || !contact.userId) {
        setRoomError("채팅방을 생성할 정보가 부족합니다.");
        setActiveSidebarView("chats");
        return;
      }

      try {
        setIsEnsuringRoom(true);
        const room = await ensureChatRoom({
          farmId: contact.farmId,
          farmerId: contact.farmerId,
          userId: contact.userId,
        });
        await loadRooms({ selectRoomId: room.roomId });
        setActiveSidebarView("chats");
      } catch (error) {
        setRoomError(error.message || "채팅방을 생성하지 못했습니다.");
      } finally {
        setIsEnsuringRoom(false);
      }
    },
    [loadRooms]
  );

  const handleIncomingMessage = useCallback((payload) => {
    if (!payload?.roomId) return;
    setMessagesByChat((prev) => {
      const existing = prev[payload.roomId] || [];
      if (
        payload.contentId &&
        existing.some((message) => message.contentId === payload.contentId)
      ) {
        return prev;
      }
      return {
        ...prev,
        [payload.roomId]: [...existing, payload],
      };
    });
    setRooms((prev) =>
      prev.map((room) =>
        room.roomId === payload.roomId
          ? {
              ...room,
              lastMessageAt: payload.createdAt,
              updatedAt: payload.createdAt,
            }
          : room
      )
    );
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      try {
        const profile = await fetchMyProfile();
        if (!ignore) {
          setCurrentUserId(profile?.userId ?? null);
        }
      } catch {
        if (!ignore) {
          setCurrentUserId(null);
        }
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (initialContact) {
      ensureChatForContact(initialContact);
    }
  }, [initialContact, ensureChatForContact]);

  useEffect(() => {
    if (!selectedChatId) return;
    let ignore = false;
    setIsLoadingMessages(true);
    setMessageError("");
    fetchChatMessages(selectedChatId)
      .then((messages) => {
        if (ignore) return;
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChatId]: messages,
        }));
      })
      .catch((error) => {
        if (!ignore) {
          setMessageError(error.message || "메시지를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingMessages(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [selectedChatId]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => {
      setIsWsConnected(true);
      setWsError("");
    };
    client.onDisconnect = () => {
      setIsWsConnected(false);
    };
    client.onStompError = (frame) => {
      setWsError(
        frame.headers["message"] || "채팅 서버와 통신 중 오류가 발생했습니다."
      );
    };
    client.onWebSocketClose = () => {
      setIsWsConnected(false);
    };

    client.activate();
    setStompClient(client);

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      setIsWsConnected(false);
      client.deactivate();
      setStompClient(null);
    };
  }, []);

  useEffect(() => {
    if (!stompClient || !isWsConnected || !selectedChatId) {
      return undefined;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const destination = `/topic/chat/${selectedChatId}`;
    const subscription = stompClient.subscribe(destination, (frame) => {
      try {
        const payload = JSON.parse(frame.body);
        handleIncomingMessage(payload);
      } catch (error) {
        console.error("채팅 메시지 파싱 실패", error);
      }
    });
    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      if (subscriptionRef.current === subscription) {
        subscriptionRef.current = null;
      }
    };
  }, [stompClient, isWsConnected, selectedChatId, handleIncomingMessage]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId) return;
    const trimmed = messageInput.trim();
    setMessageError("");
    setIsSendingMessage(true);
    try {
      if (isWsConnected && stompClient?.connected) {
        stompClient.publish({
          destination: "/app/chat.send",
          body: JSON.stringify({ roomId: selectedChatId, content: trimmed }),
        });
        setMessageInput("");
      } else {
        const newMessage = await sendChatMessage(selectedChatId, trimmed);
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
        }));
        setRooms((prev) =>
          prev.map((room) =>
            room.roomId === selectedChatId
              ? {
                  ...room,
                  lastMessageAt: newMessage.createdAt,
                  updatedAt: newMessage.createdAt,
                }
              : room
          )
        );
        setMessageInput("");
      }
    } catch (error) {
      setMessageError(error.message || "메시지를 전송하지 못했습니다.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const chatList = useMemo(() => {
    return rooms.map((room) => {
      const history = messagesByChat[room.roomId] || [];
      const lastMessage = history[history.length - 1];
      return {
        id: room.roomId,
        name: resolveRoomName(room, currentUserId),
        preview: lastMessage?.content || "",
        lastTime: formatListTime(room.lastMessageAt || room.updatedAt),
      };
    });
  }, [rooms, messagesByChat, currentUserId]);

  const selectedChat = useMemo(
    () => rooms.find((room) => room.roomId === selectedChatId) ?? null,
    [rooms, selectedChatId]
  );

  const selectedChatName = useMemo(
    () => resolveRoomName(selectedChat, currentUserId),
    [selectedChat, currentUserId]
  );

  const messages = useMemo(() => {
    const raw = messagesByChat[selectedChatId] || [];
    return raw.map((message) => toBubbleMessage(message, currentUserId));
  }, [messagesByChat, selectedChatId, currentUserId]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);

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
                  {isLoadingRooms && (
                    <p className="chat-feedback">채팅방을 불러오는 중...</p>
                  )}
                  {!isLoadingRooms && !chatList.length && (
                    <p className="chat-feedback">아직 시작한 대화가 없어요.</p>
                  )}
                  {roomError && (
                    <p className="chat-feedback chat-feedback--error">
                      {roomError}
                    </p>
                  )}
                  {chatList.map((chat) => (
                    <button
                      type="button"
                      key={chat.id}
                      className={`chat-list-item${
                        chat.id === selectedChatId ? " active" : ""
                      }`}
                      onClick={() => {
                        setSelectedChatId(chat.id);
                        setActiveSidebarView("chats");
                      }}
                    >
                      <strong>{chat.name}</strong>
                      <p>{chat.preview || "메시지를 시작해 보세요."}</p>
                      <span className="chat-item-time">{chat.lastTime}</span>
                    </button>
                  ))}
                </div>
                {isEnsuringRoom && (
                  <p className="chat-feedback">채팅방을 준비 중입니다...</p>
                )}
                <p
                  className={`chat-connection-badge ${
                    isWsConnected ? "online" : "offline"
                  }`}
                >
                  {isWsConnected ? "실시간 연결됨" : "실시간 연결 대기 중..."}
                </p>
                {wsError && (
                  <p className="chat-feedback chat-feedback--error">
                    {wsError}
                  </p>
                )}
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
                          farmId: farm.id,
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
                <h3>{selectedChatName}</h3>
              </header>
              <div className="chat-room-scroll" ref={chatScrollRef}>
                {isLoadingMessages ? (
                  <p className="chat-feedback">메시지를 불러오는 중...</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-bubble-row ${message.from}`}
                    >
                      <div className="chat-bubble">
                        <p>{message.text}</p>
                        <span className="chat-bubble-time">{message.time}</span>
                      </div>
                    </div>
                  ))
                )}
                {messageError && (
                  <p className="chat-feedback chat-feedback--error">
                    {messageError}
                  </p>
                )}
                {!isLoadingMessages && !messages.length && (
                  <p className="chat-feedback">아직 메시지가 없습니다.</p>
                )}
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
                  disabled={isSendingMessage}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSendingMessage}
                >
                  {isSendingMessage ? "전송 중..." : "전송"}
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
