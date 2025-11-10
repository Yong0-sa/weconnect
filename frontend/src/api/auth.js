// api/auth.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export async function signUp(payload) {
  const res = await fetch(
    `${API_BASE}/api/auth/signup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
