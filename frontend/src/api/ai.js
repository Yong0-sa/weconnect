const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function diagnoseCrop(formData) {
  const res = await fetch(`${API_BASE}/api/ai/diagnosis`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(
      message || "AI 진단 요청에 실패했습니다. 잠시 후 다시 시도해 주세요."
    );
  }

  return res.json();
}
