/**
 * src/components/WebSocketSync.tsx
 *
 * Invisible component that connects to the WebSocket and
 * invalidates caches when other users make changes.
 * Mount once in __root.tsx.
 */

import { useWebSocket, type WSEvent } from "@/lib/useWebSocket";
import { invalidateCustomCache } from "@/lib/customTestCases";
import { invalidateProjectCache } from "@/lib/projects";
import { invalidateOrderCache } from "@/lib/useTestOrder";
import { useCallback } from "react";

export function WebSocketSync() {
  const handler = useCallback((event: WSEvent) => {
    switch (event.type) {
      case "test-case:created":
      case "test-case:updated":
      case "test-case:completed":
      case "test-case:deleted":
        invalidateCustomCache();
        break;

      case "project:created":
      case "project:updated":
      case "project:deleted":
        invalidateProjectCache();
        break;

      case "order:updated":
        invalidateOrderCache();
        break;
    }
  }, []);

  useWebSocket(handler);

  return null;
}
