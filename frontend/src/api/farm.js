// API 기본 경로 (뒷슬래시 제거)
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

/* ------------------------------------------------------------
   공통 응답 처리
   - JSON 파싱 시도 → 실패 시 text fallback
   - 서버 에러 시 fallbackMessage 우선 사용
------------------------------------------------------------- */
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

// 농장 등록
export async function registerFarm(payload) {
  const res = await fetch(`${API_BASE}/api/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",  // 로그인 세션 필요
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "농장 정보를 저장하지 못했습니다.");
}

// 등록된 농장 목록 조회
export async function fetchFarms() {
  const res = await fetch(`${API_BASE}/api/farms`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "농장 목록을 불러오지 못했습니다.");
}

// 내 농장 정보 조회
export async function fetchMyFarm() {
  const res = await fetch(`${API_BASE}/api/farms/me`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "농장 정보를 불러오지 못했습니다.");
}

// 내 농장 정보 수정
export async function updateMyFarm(payload) {
  const res = await fetch(`${API_BASE}/api/farms/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "농장 정보를 저장하지 못했습니다.");
}
