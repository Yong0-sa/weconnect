// API 기본 경로
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/* ------------------------------------------------------------
   공통 응답 처리
   - 401: 로그인 필요
   - 서버 에러 시 text 메시지 우선 사용
   - 정상 응답: JSON 반환
------------------------------------------------------------- */
async function handleResponse(res, fallbackMessage) {
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || fallbackMessage);
  }

  return res.json();
}

// 내 프로필 정보 조회
export async function fetchMyProfile() {
  const res = await fetch(`${API_BASE}/api/profile/me`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "회원 정보를 불러오지 못했습니다.");
}

// 닉네임 중복 체크
export async function checkNicknameAvailability(nickname) {
  const res = await fetch(`${API_BASE}/api/profile/check-nickname`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ nickname }),
  });

  return handleResponse(res, "닉네임 중복 확인에 실패했습니다.");
}

// 프로필 수정
export async function updateProfile(payload) {
  const res = await fetch(`${API_BASE}/api/profile/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleResponse(res, "회원 정보를 저장하지 못했습니다.");
}

// 현재 비밀번호 확인
export async function verifyCurrentPassword(password) {
  const res = await fetch(`${API_BASE}/api/profile/verify-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });

  return handleResponse(res, "비밀번호를 확인하지 못했습니다.");
}

// 회원 탈퇴
export async function deleteAccount() {
  const res = await fetch(`${API_BASE}/api/profile/me`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse(res, "회원 탈퇴를 완료하지 못했습니다.");
}

// 농장 등록 안내 모달 클릭 기록
export async function acknowledgeFarmPrompt() {
  const res = await fetch(`${API_BASE}/api/profile/farm-prompt/shown`, {
    method: "POST",
    credentials: "include",
  });
  
  return handleResponse(res, "알림 상태를 업데이트하지 못했습니다.");
}
