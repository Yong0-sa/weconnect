const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

async function handleResponse(res, fallbackMessage) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data?.message || fallbackMessage;
    throw new Error(message);
  }

  return data;
}

export async function registerFarm(payload) {
  const res = await fetch(`${API_BASE}/api/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "농장 정보를 저장하지 못했습니다.");
}

export async function fetchFarms() {
  const res = await fetch(`${API_BASE}/api/farms`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "농장 목록을 불러오지 못했습니다.");
}
