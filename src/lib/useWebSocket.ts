/**
 * src/lib/useWebSocket.ts
 *
 * Establishes a WebSocket connection to the backend.
 * Listens for real-time change events and triggers cache invalidation
 * so all connected browsers stay in sync.
 */

import { useEffect, useRef } from "react";
import { getToken } from "./api";

export type WSEvent =
  | { type: "test-case:created" | "test-case:updated" | "test-case:completed" | "test-case:deleted"; id: string }
  | { type: "story:created" | "story:updated" | "story:deleted" | "story:completed"; id: string }
  | { type: "project:created" | "project:updated" | "project:deleted"; id: number }
  | { type: "order:updated" }
  | { type: "status:updated"; slug: string; status: string }
  | { type: "priority:updated"; slug: string; priority: string }
  | { type: "expected:updated"; key: string; checked: boolean }
  | { type: "ping" };

type EventHandler = (event: WSEvent) => void;

// ── Global singleton so multiple components don't open duplicate sockets ──

let globalSocket: WebSocket | null = null;
let refCount = 0;
const handlers = new Set<EventHandler>();

function connect() {
  if (globalSocket && globalSocket.readyState <= WebSocket.OPEN) return;

  const wsBase = import.meta.env.DEV
    ? `ws://${window.location.host}`
    : "wss://qa-assistant-api.onrender.com";

  const token = getToken();
  const url = token ? `${wsBase}/ws?token=${encodeURIComponent(token)}` : `${wsBase}/ws`;

  globalSocket = new WebSocket(url);

  globalSocket.onmessage = (ev) => {
    try {
      const event: WSEvent = JSON.parse(ev.data);
      handlers.forEach((h) => h(event));
    } catch {
      // ignore malformed messages
    }
  };

  globalSocket.onclose = () => {
    // Auto-reconnect after 3 seconds
    setTimeout(() => {
      if (refCount > 0) connect();
    }, 3000);
  };

  globalSocket.onerror = () => {
    globalSocket?.close();
  };
}

function disconnect() {
  if (globalSocket) {
    globalSocket.onclose = null; // prevent auto-reconnect
    globalSocket.close();
    globalSocket = null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────

export function useWebSocket(handler: EventHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler: EventHandler = (event) => handlerRef.current(event);
    handlers.add(wrappedHandler);
    refCount++;

    if (refCount === 1) connect();

    return () => {
      handlers.delete(wrappedHandler);
      refCount--;
      if (refCount === 0) disconnect();
    };
  }, []);
}
