const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

/**
 * 공통 응답 처리 함수
 */
async function handleResponse(res, fallbackMessage) {
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
          errorMessage = json?.message || json?.error || text || fallbackMessage;
        } catch {
          errorMessage = text;
        }
      }
    } catch {
      // ignore parsing error
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

/**
 * AI 문장 추천 API 호출
 *
 * @param {string} content - 현재 작성 중인 내용
 * @param {number} farmId - 농장 ID (권한 검증용)
 * @returns {Promise<{suggestions: string[]}>} 추천 문장 리스트 (2개)
 */
export async function getTextSuggestions(content, farmId) {
  const res = await fetch(`${API_BASE}/api/ai/text-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",  // 세션 쿠키 포함
    body: JSON.stringify({ content, farmId }),
  });

  return handleResponse(res, "문장 추천을 가져오지 못했습니다.");
}
