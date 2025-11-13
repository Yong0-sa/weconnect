const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function diagnoseCrop(formData) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnosis`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    console.log("진단 API 응답 상태:", res.status, res.statusText); // 디버깅용

    if (!res.ok) {
      let errorMessage = "";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || `서버 오류 (${res.status})`;
        console.error("진단 API 오류 응답:", errorData); // 디버깅용
      } catch (e) {
        const text = await res.text().catch(() => "");
        errorMessage = text || `서버 오류 (${res.status})`;
        console.error("진단 API 오류 텍스트:", text); // 디버깅용
      }
      throw new Error(errorMessage || "AI 진단 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    const result = await res.json();
    console.log("진단 API 성공 응답:", result); // 디버깅용
    return result;
  } catch (error) {
    console.error("진단 API 요청 실패:", error); // 디버깅용
    throw error;
  }
}
