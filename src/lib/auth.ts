/**
 * src/lib/auth.ts
 *
 * JWT is stored in localStorage under "qa-token" and decoded client-side
 * for the session info. The server validates it on every API call.
 */

import { api, setToken, getToken } from "./api";

type Session = { id: number; username: string; exp: number };

/** Decode a JWT payload without a library (works in all browsers). */
function decodePayload(token: string): Session | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const t = getToken();
  if (!t) return null;

  const payload = decodePayload(t);
  if (!payload) {
    setToken(null);
    return null;
  }

  if (Date.now() / 1000 > payload.exp) {
    setToken(null);
    return null;
  }

  return payload;
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getCurrentUser(): string | null {
  return getSession()?.username ?? null;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; needsVerification?: boolean; needsApproval?: boolean };

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const data = await api<{ user: { id: number; username: string }; token: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    setToken(data.token);
    return { ok: true };
  } catch (err) {
    const e = err as { status?: number; message?: string; body?: Record<string, unknown> };
    // The api() helper strips the body — fall back to a fresh fetch so we can read flags.
    const detail = await readLoginError(username, password);
    return {
      ok: false,
      error: detail?.error || e.message || "Login failed",
      needsVerification: !!detail?.needsVerification,
      needsApproval:     !!detail?.needsApproval,
    };
  }
}

async function readLoginError(username: string, password: string) {
  try {
    const res = await fetch(
      (import.meta.env.DEV ? "/api" : "https://qa-assistant-api.onrender.com/api") + "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }
    );
    if (res.ok) return null;
    return await res.json().catch(() => null) as
      | { error?: string; needsVerification?: boolean; needsApproval?: boolean }
      | null;
  } catch {
    return null;
  }
}

export type RegisterInput = {
  username: string;
  email:    string;
  password: string;
  teamName: string;
};

export type RegisterResult = {
  user: { id: number; username: string; email: string; role: "owner" | "manager" | "associate" };
  teamName: string;
  joiningExisting: boolean;
  requiresApproval: boolean;
};

export async function register(input: RegisterInput): Promise<RegisterResult> {
  return api<RegisterResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function checkTeamName(name: string): Promise<{
  exists: boolean;
  displayName?: string;
  memberCount?: number;
}> {
  const q = encodeURIComponent(name);
  return api(`/teams/check?name=${q}`, { method: "GET" });
}

export async function verifyEmail(token: string): Promise<{ ok: true; username: string }> {
  return api("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function getRegistrationStatus(username: string): Promise<{
  email_verified: boolean;
  pending_approval: boolean;
}> {
  const q = encodeURIComponent(username);
  return api(`/auth/status?username=${q}`, { method: "GET" });
}

export function logout(): void {
  setToken(null);
}
