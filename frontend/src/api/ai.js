// ✅ AI API 통합 파일

// 기본 API 경로 설정 (뒤의 슬래시 자동 제거)
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

/* ------------------------------------------------------------
   공통 응답 처리 함수
   - JSON 파싱 시도 → 실패하면 text로 fallback
   - 401 처리, 일반 에러 처리
------------------------------------------------------------- */
async function handleResponse(res, fallbackMessage) {
  const text = await res.text();
  let data = null;

  // JSON 파싱 시도
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  // 인증 필요
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }

  // 서버 오류 처리
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

// 🧠 1️⃣ AI 대화 기록 불러오기
export async function fetchAIHistory(limit = 50) {

  // limit 파라미터 적용
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/api/ai/chat/history${query ? `?${query}` : ""}`,
    {
      method: "GET",
      credentials: "include",  // 세션 유지
    }
  );
  return handleResponse(res, "대화 기록을 불러오지 못했습니다.");
}

// 💬 2️⃣ AI 질문 전송
export async function sendAIQuestion(question, topK) {

  // payload 구성
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

// 📝 4️⃣ 진단 결과를 재배일기로 공유
export async function shareDiagnosisToDiary(diagnosisId) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnosis/${diagnosisId}/share-to-diary`, {
      method: "POST",
      credentials: "include",
    });

    // 실패 시 상세 메시지 추출
    if (!res.ok) {
      let errorMessage = "";

      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || `서버 오류 (${res.status})`;
      } catch (e) {
        const text = await res.text().catch(() => "");
        errorMessage = text || `서버 오류 (${res.status})`;
      }
      
      throw new Error(errorMessage || "재배일기 공유에 실패했습니다.");
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error("재배일기 공유 요청 실패:", error);
    throw error;
  }
}

// 🌾 3️⃣ 작물 진단 요청
export async function diagnoseCrop(formData) {
  try {
    const requestUrl = `${API_BASE}/api/ai/diagnosis`;
    console.log("진단 API 요청 URL:", requestUrl);
    console.log("API_BASE 값:", API_BASE);

    // 이미지 업로드 요청
    const res = await fetch(requestUrl, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    console.log("진단 API 응답 상태:", res.status, res.statusText);

    // 오류 응답 처리
    if (!res.ok) {
      let errorMessage = "";

      try {
        const errorData = await res.json();
        errorMessage =
          errorData.message || errorData.error || `서버 오류 (${res.status})`;
        console.error("진단 API 오류 응답:", errorData);
      } catch (e) {
        const text = await res.text().catch(() => "");
        errorMessage = text || `서버 오류 (${res.status})`;
        console.error("진단 API 오류 텍스트:", text);
      }

      throw new Error(
        errorMessage ||
          "AI 진단 요청에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    }

    const result = await res.json();
    console.log("진단 API 성공 응답:", result);

    return result;

  } catch (error) {
    console.error("진단 API 요청 실패:", error);
    throw error;
  }
}

// 🗂️ 5️⃣ 진단 내역 목록 조회
export async function fetchDiagnosisHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnosis/history`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("로그인이 필요합니다.");
      }
      throw new Error("진단 내역을 불러오지 못했습니다.");
    }

    const history = await res.json();
    return history;
  } catch (error) {
    console.error("진단 내역 조회 실패:", error);
    throw error;
  }
}

// 🗑️ 6️⃣ 진단 내역 삭제
export async function deleteDiagnosisEntry(diagnosisId) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/diagnosis/${diagnosisId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401) {
      throw new Error("로그인이 필요합니다.");
    }
    if (res.status === 404) {
      throw new Error("삭제할 진단 내역을 찾을 수 없습니다.");
    }
    if (!res.ok) {
      throw new Error("진단 내역을 삭제하지 못했습니다.");
    }
  } catch (error) {
    console.error("진단 내역 삭제 실패:", error);
    throw error;
  }
}
