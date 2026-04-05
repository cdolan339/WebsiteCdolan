/**
 * src/lib/api.ts
 *
 * Thin fetch wrapper — attaches the JWT token to every request.
 * All your other lib files import from here instead of calling fetch directly.
 */

const API_BASE = import.meta.env.DEV
  ? "/api"                                          // local dev (proxied by Vite)
  : "https://qa-assistant-api.onrender.com/api";    // production (your Render URL)

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
  if (t) {
    localStorage.setItem("qa-token", t);
  } else {
    localStorage.removeItem("qa-token");
  }
}

export function getToken(): string | null {
  if (token) return token;
  if (typeof window === "undefined") return null;
  token = localStorage.getItem("qa-token");
  return token;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const t = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    // Only redirect if we're not already on the login page
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (path && !path.startsWith("/login") && path !== "/403" && path !== "/404") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
