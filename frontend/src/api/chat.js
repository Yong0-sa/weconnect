const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

async function handleResponse(res, fallbackMessage) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function fetchChatRooms() {
  const res = await fetch(`${API_BASE}/api/chat/rooms`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "채팅방 목록을 불러오지 못했습니다.");
}

export async function ensureChatRoom(payload) {
  const res = await fetch(`${API_BASE}/api/chat/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "채팅방을 생성하지 못했습니다.");
}

export async function fetchChatMessages(roomId) {
  const res = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/messages`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "채팅 메시지를 불러오지 못했습니다.");
}

export async function sendChatMessage(roomId, content) {
  const res = await fetch(`${API_BASE}/api/chat/rooms/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ roomId, content }),
  });
  return handleResponse(res, "메시지를 전송하지 못했습니다.");
}
