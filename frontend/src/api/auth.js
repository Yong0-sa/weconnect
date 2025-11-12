// api/auth.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

export async function signUp(payload) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "회원가입에 실패했습니다.");
}

export async function login(payload) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "로그인에 실패했습니다.");
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res, "로그아웃에 실패했습니다.");
}
