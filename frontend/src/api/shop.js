const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

async function parseResponse(res, fallbackMessage) {
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    let errorMessage = fallbackMessage;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage =
            json?.message || json?.error || text || fallbackMessage;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // ignore parsing error
    }
    throw new Error(errorMessage);
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
}

export async function fetchShopItems() {
  const res = await fetch(`${API_BASE}/api/shop-items`, {
    method: "GET",
    credentials: "include",
  });
  return parseResponse(res, "상점 아이템을 불러오지 못했습니다.");
}
