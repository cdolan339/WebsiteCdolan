/**
 * src/lib/useTestOrder.ts  (NEW FILE)
 *
 * Replaces the loadOrder / saveOrder / ORDER_KEY_BASE logic that
 * lived inline in homepage.tsx. Import this hook instead.
 *
 * Usage in homepage.tsx:
 *   const { order, setOrder } = useTestOrder(defaultSlugs)
 *
 *   // In handleDragEnd:
 *   setOrder(arrayMove(order, oldIndex, newIndex))
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";

// Module-level cache so the saved order survives tab switches / re-renders
let savedOrderCache: string[] | null = null;
const orderListeners = new Set<() => void>();

/** Called by WebSocket handler to force a re-fetch of the order */
export function invalidateOrderCache() {
  savedOrderCache = null;
  orderListeners.forEach((fn) => fn());
}

export function useTestOrder(defaultSlugs: string[]) {
  const [order, setOrderState] = useState<string[]>(() =>
    mergeOrder(savedOrderCache, defaultSlugs)
  );
  const loaded = useRef(savedOrderCache !== null);

  // Fetch saved order from API once (globally), and re-fetch on WS invalidation
  useEffect(() => {
    const fetchOrder = () => {
      api<string[]>("/data/order")
        .then((saved) => {
          if (saved && saved.length > 0) {
            savedOrderCache = saved;
          }
          setOrderState(mergeOrder(savedOrderCache, defaultSlugs));
          loaded.current = true;
        })
        .catch(() => {
          loaded.current = true;
        });
    };

    if (!loaded.current) fetchOrder();

    // Re-fetch when WebSocket invalidates the cache
    orderListeners.add(fetchOrder);
    return () => { orderListeners.delete(fetchOrder); };
  }, []);

  // Re-merge whenever defaultSlugs changes (tab switch, new TC created, etc.)
  useEffect(() => {
    if (!loaded.current) return;
    setOrderState(mergeOrder(savedOrderCache, defaultSlugs));
  }, [defaultSlugs]);

  const setOrder = useCallback((next: string[]) => {
    setOrderState(next);
    // Update cache and persist
    savedOrderCache = updateCache(savedOrderCache, next);
    api("/data/order", {
      method: "PUT",
      body: JSON.stringify({ slugs: savedOrderCache }),
    }).catch(console.error);
  }, []);

  return { order, setOrder };
}

/** Keep saved ordering for slugs in the current view, append any new ones */
function mergeOrder(saved: string[] | null, current: string[]): string[] {
  if (!saved || saved.length === 0) return current;
  const currentSet = new Set(current);
  const savedSet = new Set(saved);
  return [
    ...saved.filter((s) => currentSet.has(s)),
    ...current.filter((s) => !savedSet.has(s)),
  ];
}

/** Splice reordered slugs back into the full saved cache */
function updateCache(cache: string[] | null, reordered: string[]): string[] {
  if (!cache) return reordered;
  const reorderedSet = new Set(reordered);
  // Remove old positions of the reordered slugs, then append them
  const rest = cache.filter((s) => !reorderedSet.has(s));
  return [...reordered, ...rest];
}
