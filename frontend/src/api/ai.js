const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

export async function fetchAIHistory(limit = 50) {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/api/ai/chat/history${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",
    }
  );
  return handleResponse(res, "대화 기록을 불러오지 못했습니다.");
}

export async function sendAIQuestion(question, topK) {
  const payload = { question };
  if (typeof topK === "number") {
    payload.topK = topK;
  }
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "AI와 대화를 진행하지 못했습니다.");
}

