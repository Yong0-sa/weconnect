const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
          errorMessage = json.message || json.error || json || fallbackMessage;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // ignore parsing errors
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchCoinBalance() {
  const res = await fetch(`${API_BASE}/api/coins/me`, {
    method: "GET",
    credentials: "include",
  });
  return parseResponse(res, "코인 잔액을 불러오지 못했습니다.");
}

export async function earnCoins(amount, reason) {
  const res = await fetch(`${API_BASE}/api/coins/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ amount, reason }),
  });
  return parseResponse(res, "코인을 적립하지 못했습니다.");
}

export async function spendCoins(price, itemName) {
  const res = await fetch(`${API_BASE}/api/coins/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ price, itemName }),
  });
  return parseResponse(res, "코인을 차감하지 못했습니다.");
}
