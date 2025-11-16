
// API 기본 경로 (환경 변수 없으면 localhost)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/* ------------------------------------------------------------
   공통 응답 처리
   - JSON 파싱 시도 → 실패 시 text fallback
   - res.ok 아닌 경우 에러 메시지 반환
------------------------------------------------------------- */
async function handleResponse(res, defaultMessage) {
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
    const message =
      data?.message || defaultMessage || "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }

  return data;
}

// 회원가입 요청
export async function signUp(payload) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "회원가입에 실패했습니다.");
}

// 로그인 요청
export async function login(payload) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",  // 세션 쿠키 포함
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "로그인에 실패했습니다.");
}

// 로그아웃 요청
export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res, "로그아웃에 실패했습니다.");
}
