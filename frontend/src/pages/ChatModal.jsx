import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ChatModal.css";
import {
  ensureChatRoom,
  fetchChatMessages,
  fetchChatRooms,
  sendChatMessage,
} from "../api/chat";
import { fetchMyProfile } from "../api/profile";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// STOMP/SockJS 환경 호환 처리
if (typeof window !== "undefined" && typeof window.global === "undefined") {
  window.global = window;
}

// ============================================================
// 🌐 기본 API/WS 주소
// ============================================================
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");
const WS_ENDPOINT = `${API_BASE}/ws/chat`;

// ============================================================
// ⏱ 채팅 목록 시간 표시용 유틸리티들
// ============================================================
const formatListTime = (timestamp) => {
  // 최근 1시간 → "몇 분 전"
  // 오늘 → HH:MM
  // 최근 7일 → "N일 전"
  // 그 외 → MM/DD
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

// ============================================================
// 👥 채팅방 이름 생성 로직 (내가 누구인지에 따라 상대 표시)
// ============================================================
const resolveRoomName = (room, currentUserId) => {
  if (!room) return "채팅방";

  // 내가 user면 → farmer 이름
  if (currentUserId && room.userId === currentUserId) {
    return room.farmerName || room.farmName || "농장주";
  }

  // 내가 farmer면 → user 이름
  if (currentUserId && room.farmerId === currentUserId) {
    return room.userName || room.userNickname || "회원";
  }

  // 중립 fallback
  return room.userName || room.farmerName || room.farmName || "채팅방";
};

// ============================================================
// 💬 서버 메시지를 UI버블 구조로 변환
// ============================================================
const toBubbleMessage = (message, currentUserId) => ({
  id: message.contentId ?? `${message.roomId}-${message.createdAt}`,
  from:
    currentUserId && message.senderId === currentUserId ? "me" : "partner",
  text: message.content,
  time: formatMessageTime(message.createdAt),
});

// ============================================================
// 🧩 ChatModal 시작
// ============================================================
function ChatModal({ onClose, initialContact, lastChatCheck = Date.now() }) {

  // ------------------------------------------------------------
  // 상태: 채팅방 / 메시지 목록 / UI 플래그
  // ------------------------------------------------------------
  const [rooms, setRooms] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [selectedChatId, setSelectedChatId] = useState(null);

  const [messageInput, setMessageInput] = useState("");

  // 에러/로딩 상태들
  const [roomError, setRoomError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isEnsuringRoom, setIsEnsuringRoom] = useState(false);

  // 사용자/웹소켓 상태
  const [currentUserId, setCurrentUserId] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [wsError, setWsError] = useState("");
  const [clearedRoomIds, setClearedRoomIds] = useState({});

  // Ref: 스크롤/WS subscription
  const subscriptionRef = useRef(null);
  const chatScrollRef = useRef(null);
  const ensuredContactKeyRef = useRef(null);

  // ============================================================
  // 📌 1) 전체 채팅방 불러오기
  //    - 첫 방 자동 선택
  //    - 새 방 생성 후 특정 방 선택 기능 포함
  // ============================================================
  const loadRooms = useCallback(
    async ({ selectRoomId } = {}) => {
      setIsLoadingRooms(true);
      setRoomError("");

      try {
        const list = await fetchChatRooms();
        setRooms(list);

        // 채팅방 선택 우선순위
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

  // ============================================================
  // 📌 2) 특정 농장/상대 유저로 "채팅방 생성 또는 보장(ensure)"
  // ============================================================
  const ensureChatForContact = useCallback(
    async (contact) => {
      if (!contact) return;

      // 이미 roomId 있으면 바로 해당 방으로 이동
      if (contact.roomId) {
        await loadRooms({ selectRoomId: contact.roomId });
        return;
      }

      // 신규 방 생성에 필요한 정보 부족
      if (!contact.farmId || !contact.farmerId || !contact.userId) {
        setRoomError("채팅방을 생성할 정보가 부족합니다.");
        return;
      }

      // 신규 채팅방 생성 API 호출
      try {
        setIsEnsuringRoom(true);

        const room = await ensureChatRoom({
          farmId: contact.farmId,
          farmerId: contact.farmerId,
          userId: contact.userId,
        });

        await loadRooms({ selectRoomId: room.roomId });
      } catch (error) {
        setRoomError(error.message || "채팅방을 생성하지 못했습니다.");
      } finally {
        setIsEnsuringRoom(false);
      }
    },
    [loadRooms]
  );

  // ============================================================
  // 📌 3) WebSocket으로 받은 실시간 메시지 핸들링
  // ============================================================
  const handleIncomingMessage = useCallback((payload) => {
    if (!payload?.roomId) return;

    // 메시지 중복 체크 후 append
    setMessagesByChat((prev) => {
      const existing = prev[payload.roomId] || [];
      if (
        payload.contentId &&
        existing.some((message) => message.contentId === payload.contentId)
      ) {
        return prev;  // 이미 수신한 메시지
      }
      return {
        ...prev,
        [payload.roomId]: [...existing, payload],
      };
    });

    // 채팅방 목록의 업데이트 시간 갱신
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
    if (payload.roomId !== selectedChatId) {
      setClearedRoomIds((prev) => {
        if (!prev[payload.roomId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[payload.roomId];
        return next;
      });
    }
  }, [selectedChatId]);

  // ============================================================
  // 📌 4) 로그인 사용자 정보 로드
  // ============================================================
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
    return () => { ignore = true; };
  }, []);

  // ============================================================
  // 📌 5) 최초 진입 → 채팅방 목록 불러오기
  // ============================================================
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ============================================================
  // 📌 6) initialContact가 있으면 채팅방 생성/보장 처리
  // ============================================================
  useEffect(() => {
    if (!initialContact) {
      ensuredContactKeyRef.current = null;
      return;
    }

    const contactKey = JSON.stringify({
      roomId: initialContact.roomId ?? null,
      farmId: initialContact.farmId ?? null,
      farmerId: initialContact.farmerId ?? null,
      userId: initialContact.userId ?? null,
    });

    if (ensuredContactKeyRef.current === contactKey) {
      return;
    }

    ensuredContactKeyRef.current = contactKey;
    ensureChatForContact(initialContact);
  }, [initialContact, ensureChatForContact]);

  useEffect(() => {
    setClearedRoomIds({});
  }, [lastChatCheck]);

  useEffect(() => {
    if (!selectedChatId) return;
    setClearedRoomIds((prev) => {
      if (prev[selectedChatId]) {
        return prev;
      }
      return { ...prev, [selectedChatId]: true };
    });
  }, [selectedChatId]);

  // ============================================================
  // 📌 7) 특정 채팅방 메시지 로드
  //    - selectedChatId가 바뀔 때마다 호출
  // ============================================================
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



  // ============================================================
  // 📌 8) WebSocket(STOMP) 클라이언트 생성 및 연결
  // ============================================================
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

    // cleanup
    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      setIsWsConnected(false);
      client.deactivate();
      setStompClient(null);
    };
  }, []);

  // ============================================================
  // 📌 9) 선택된 채팅방 토픽에 WebSocket 구독
  // ============================================================
  useEffect(() => {
    if (!stompClient || !isWsConnected || !selectedChatId) {
      return undefined;
    }

    // 기존 구독 제거
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


  // ============================================================
  // 📌 10) 메시지 전송 (WS 우선, 실패 시 REST fallback)
  // ============================================================
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId) return;

    const trimmed = messageInput.trim();
    setMessageError("");
    setIsSendingMessage(true);

    try {
      // 1) WebSocket 연결된 경우 → WS 전송
      if (isWsConnected && stompClient?.connected) {
        stompClient.publish({
          destination: "/app/chat.send",
          body: JSON.stringify({ roomId: selectedChatId, content: trimmed }),
        });
        setMessageInput("");
      } else {
        // 2) WS 실패 또는 미연결 → REST 전송
        const newMessage = await sendChatMessage(selectedChatId, trimmed);

        // 메시지 목록에 append
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
        }));

        // 방 리스트 최신화
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


  // ============================================================
  // 📌 11) 채팅방 목록(좌측) 화면용 가공 리스트
  // ============================================================
  const chatList = useMemo(() => {
    return rooms.map((room) => {
      const history = messagesByChat[room.roomId] || [];
      const lastMessage = history[history.length - 1];
      const lastTimestamp = room.lastMessageAt || room.updatedAt;
      const lastMs = lastTimestamp ? new Date(lastTimestamp).getTime() : NaN;
      const isUnread =
        Number.isFinite(lastMs) &&
        lastMs > (lastChatCheck ?? 0) &&
        !clearedRoomIds[room.roomId];

      return {
        id: room.roomId,
        name: resolveRoomName(room, currentUserId),  // 상대방 이름 결정
        preview: lastMessage?.content || "",  // 마지막 메시지
        lastTime: formatListTime(lastTimestamp),
        isUnread,
      };
    });
  }, [rooms, messagesByChat, currentUserId, lastChatCheck, clearedRoomIds]);

  // ============================================================
  // 📌 12) 현재 선택된 채팅방 정보
  // ============================================================
  const selectedChat = useMemo(
    () => rooms.find((room) => room.roomId === selectedChatId) ?? null,
    [rooms, selectedChatId]
  );

  const selectedChatName = useMemo(
    () => resolveRoomName(selectedChat, currentUserId),
    [selectedChat, currentUserId]
  );

  // ============================================================
  // 📌 13) 현재 채팅방의 메시지 목록 → 말풍선 데이터로 변환
  // ============================================================
  const messages = useMemo(() => {
    const raw = messagesByChat[selectedChatId] || [];
    return raw.map((message) => toBubbleMessage(message, currentUserId));
  }, [messagesByChat, selectedChatId, currentUserId]);

  // ============================================================
  // 📌 14) 메시지 추가 시 스크롤 맨 아래 유지
  // ============================================================
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
        <aside className="chat-list-panel">
          <div className="chat-panel-content">
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
                  }${chat.isUnread ? " unread" : ""}`}
                  onClick={() => setSelectedChatId(chat.id)}
                  aria-label={
                    chat.isUnread ? `${chat.name} (읽지 않은 메시지)` : undefined
                  }
                >
                  <strong>{chat.name}</strong>
                  <p>{chat.preview || "메시지를 시작해 보세요."}</p>
                  <span className="chat-item-time">{chat.lastTime}</span>
                  {chat.isUnread && (
                    <span className="chat-item-unread" aria-hidden="true" />
                  )}
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
              <p className="chat-feedback chat-feedback--error">{wsError}</p>
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
