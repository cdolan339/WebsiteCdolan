/**
 * src/lib/auth.ts  (DROP-IN REPLACEMENT)
 *
 * Same exported functions as before — getSession, isAuthenticated,
 * getCurrentUser, login, logout — but now backed by the Express API
 * and JWT instead of a hardcoded user array.
 *
 * The JWT is stored in localStorage under "qa-token" and decoded
 * client-side for the session info. The server validates it on
 * every API call.
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

  // Check expiry (JWT exp is in seconds)
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

/**
 * Login — calls the API, stores the JWT on success.
 * Returns true on success, false on invalid credentials.
 */
export async function login(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const data = await api<{ user: { id: number; username: string }; token: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    );
    setToken(data.token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register — calls the API, stores the JWT on success.
 * Throws with an error message on failure.
 */
export async function register(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const data = await api<{ user: { id: number; username: string }; token: string }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    );
    setToken(data.token);
    return true;
  } catch (err) {
    throw err;
  }
}

export function logout(): void {
  setToken(null);
}
