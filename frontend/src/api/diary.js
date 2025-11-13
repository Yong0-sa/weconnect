const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
          errorMessage = json.message || json.error || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch (e) {
      // 에러 메시지 파싱 실패 시 기본 메시지 사용
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

// 일기 목록 조회
export async function getDiaries() {
  const res = await fetch(`${API_BASE}/api/diary`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "일기 목록을 불러오지 못했습니다.");
}

// 일기 상세 조회
export async function getDiary(diaryId) {
  const res = await fetch(`${API_BASE}/api/diary/${diaryId}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "일기를 불러오지 못했습니다.");
}

// 일기 검색
export async function searchDiaries(keyword) {
  const res = await fetch(`${API_BASE}/api/diary/search?keyword=${encodeURIComponent(keyword)}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "일기 검색에 실패했습니다.");
}

// 일기 작성
export async function createDiary(diaryData, imageFile) {
  const formData = new FormData();

  // DiaryRequest를 JSON으로 변환하여 추가
  const diaryJson = JSON.stringify({
    title: diaryData.title || null,
    content: diaryData.content || null,
    date: diaryData.date || null, // 선택한 날짜 전송
  });
  formData.append("diary", new Blob([diaryJson], { type: "application/json" }));

  // 이미지 파일 추가 (있는 경우)
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await fetch(`${API_BASE}/api/diary`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res, "일기 작성에 실패했습니다.");
}

// 일기 수정
export async function updateDiary(diaryId, diaryData, imageFile) {
  const formData = new FormData();

  // DiaryRequest를 JSON으로 변환하여 추가
  const diaryJson = JSON.stringify({
    title: diaryData.title || null,
    content: diaryData.content || null,
    date: diaryData.date || null, // 선택한 날짜 전송
  });
  formData.append("diary", new Blob([diaryJson], { type: "application/json" }));

  // 이미지 파일 추가 (있는 경우)
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await fetch(`${API_BASE}/api/diary/${diaryId}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res, "일기 수정에 실패했습니다.");
}

// 일기 삭제
export async function deleteDiary(diaryId) {
  const res = await fetch(`${API_BASE}/api/diary/${diaryId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "일기 삭제에 실패했습니다.");
  }
  // 204 No Content인 경우 빈 응답 반환
  if (res.status === 204) {
    return;
  }
  return res.json();
}

