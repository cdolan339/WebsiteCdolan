/**
 * src/components/WebSocketSync.tsx
 *
 * Invisible component that connects to the WebSocket and
 * invalidates caches when other users make changes.
 * Mount once in __root.tsx.
 */

import { useWebSocket, type WSEvent } from "@/lib/useWebSocket";
import { invalidateCustomCache } from "@/lib/customTestCases";
import { invalidateStoryCache } from "@/lib/stories";
import { invalidateProjectCache } from "@/lib/projects";
import { invalidateOrderCache } from "@/lib/useTestOrder";
import {
  applyStatusUpdate,
  applyPriorityUpdate,
  applyExpectedUpdate,
  type TestStatus,
  type TestPriority,
} from "@/lib/useTestStatus";
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

      case "story:created":
      case "story:updated":
      case "story:deleted":
        invalidateStoryCache();
        break;

      case "project:created":
      case "project:updated":
      case "project:deleted":
        invalidateProjectCache();
        break;

      case "order:updated":
        invalidateOrderCache();
        break;

      // Push status/priority/expected directly into cache — no re-fetch needed
      case "status:updated":
        applyStatusUpdate(event.slug, event.status as TestStatus);
        break;

      case "priority:updated":
        applyPriorityUpdate(event.slug, event.priority as TestPriority);
        break;

      case "expected:updated":
        applyExpectedUpdate(event.key, event.checked);
        break;
    }
  }, []);

  useWebSocket(handler);

  return null;
}
