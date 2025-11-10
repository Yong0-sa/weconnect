// api/auth.js
export async function signUp(payload) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
