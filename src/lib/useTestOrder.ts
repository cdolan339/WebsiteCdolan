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

export function useTestOrder(defaultSlugs: string[]) {
  const [order, setOrderState] = useState<string[]>(defaultSlugs);
  const loaded = useRef(false);

  // Fetch saved order from API on mount
  useEffect(() => {
    api<string[]>("/data/order")
      .then((saved) => {
        if (saved && saved.length > 0) {
          // Merge: keep saved order for known slugs, append new ones
          const known = new Set(saved);
          const merged = [
            ...saved.filter((s) => defaultSlugs.includes(s)),
            ...defaultSlugs.filter((s) => !known.has(s)),
          ];
          setOrderState(merged);
        } else {
          setOrderState(defaultSlugs);
        }
        loaded.current = true;
      })
      .catch(() => {
        setOrderState(defaultSlugs);
        loaded.current = true;
      });
  }, []); // only on mount

  // Append newly-created slugs (e.g. new custom test cases)
  useEffect(() => {
    if (!loaded.current) return;
    setOrderState((prev) => {
      const newSlugs = defaultSlugs.filter((s) => !prev.includes(s));
      if (newSlugs.length === 0) return prev;
      const next = [...prev, ...newSlugs];
      // Save in background
      api("/data/order", {
        method: "PUT",
        body: JSON.stringify({ slugs: next }),
      }).catch(console.error);
      return next;
    });
  }, [defaultSlugs]);

  const setOrder = useCallback((next: string[]) => {
    setOrderState(next);
    // Persist to API in background
    api("/data/order", {
      method: "PUT",
      body: JSON.stringify({ slugs: next }),
    }).catch(console.error);
  }, []);

  return { order, setOrder };
}
