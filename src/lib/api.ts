/**
 * src/lib/api.ts
 *
 * Thin fetch wrapper — attaches the JWT token to every request.
 * All your other lib files import from here instead of calling fetch directly.
 */

/** Thrown when the API returns an error response. May include extra fields from the body. */
export class ApiError extends Error {
  status: number;
  aiMessage?: string;
  constructor(message: string, status: number, aiMessage?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.aiMessage = aiMessage;
  }
}

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
    const body = await res.json().catch(() => ({})) as { error?: string; aiMessage?: string };
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status, body.aiMessage);
  }

  return res.json() as Promise<T>;
}

/**
 * Upload files via FormData (multipart).
 * Does NOT set Content-Type — the browser adds the boundary automatically.
 */
export async function apiUpload<T = unknown>(
  path: string,
  body: FormData,
): Promise<T> {
  const t = getToken();
  const headers: Record<string, string> = {};
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (res.status === 401) {
    setToken(null);
    const p = typeof window !== "undefined" ? window.location.pathname : "";
    if (p && !p.startsWith("/login") && p !== "/403" && p !== "/404") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Build a full URL to an attachment file (for img src, download links, etc.)
 */
export function attachmentUrl(testCaseId: string, attachmentId: number): string {
  const t = getToken();
  return `${API_BASE}/attachments/${testCaseId}/${attachmentId}/file${t ? `?token=${t}` : ""}`;
}
