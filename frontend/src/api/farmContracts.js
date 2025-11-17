const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

async function handleResponse(res, fallbackMessage) {
  const text = await res.text();
  const message = text || fallbackMessage;
  if (!res.ok) {
    throw new Error(message);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

export async function applyToFarm(farmId) {
  const res = await fetch(`${API_BASE}/api/farm-contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ farmId }),
  });
  return handleResponse(res, "농장 신청에 실패했습니다.");
}

export async function fetchOwnerContracts() {
  const res = await fetch(`${API_BASE}/api/farm-contracts/owner`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res, "계약 목록을 불러오지 못했습니다.");
}

export async function updateContractStatus(contractId, payload) {
  const res = await fetch(
    `${API_BASE}/api/farm-contracts/${contractId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );
  return handleResponse(res, "계약 상태를 업데이트하지 못했습니다.");
}

export async function deleteContract(contractId) {
  const res = await fetch(`${API_BASE}/api/farm-contracts/${contractId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (res.status === 204) {
    return null;
  }
  return handleResponse(res, "계약을 삭제하지 못했습니다.");
}
