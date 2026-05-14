/**
 * src/lib/useTestStatus.ts  (DROP-IN REPLACEMENT)
 *
 * Same hook signatures as before. On mount, data is fetched from the
 * API once and cached in memory. Updates are written to the API
 * optimistically (cache updates immediately, API call in background).
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

export type TestStatus = "pass" | "fail" | "pending" | "blocked";
export type TestPriority = "low" | "medium" | "high" | "critical";

// ── In-memory caches (populated from API on first access) ─────────

let statusCache: Record<string, TestStatus> = {};
let statusLoaded = false;
let statusLoadPromise: Promise<void> | null = null;
const statusListeners = new Set<() => void>();
function notifyStatus() { statusListeners.forEach((fn) => fn()); }

let priorityCache: Record<string, TestPriority> = {};
let priorityLoaded = false;
let priorityLoadPromise: Promise<void> | null = null;
const priorityListeners = new Set<() => void>();
function notifyPriority() { priorityListeners.forEach((fn) => fn()); }

let expectedCache: Record<string, boolean> = {};
let expectedLoaded = false;
let expectedLoadPromise: Promise<void> | null = null;
const expectedListeners = new Set<() => void>();
function notifyExpected() { expectedListeners.forEach((fn) => fn()); }

// Apply a remote WS update directly into the cache without a round-trip
export function applyStatusUpdate(slug: string, status: TestStatus) {
  statusCache = { ...statusCache, [slug]: status };
  notifyStatus();
}

export function applyPriorityUpdate(slug: string, priority: TestPriority) {
  priorityCache = { ...priorityCache, [slug]: priority };
  notifyPriority();
}

export function applyExpectedUpdate(key: string, checked: boolean) {
  expectedCache = { ...expectedCache, [key]: checked };
  notifyExpected();
}

// Reset caches on logout (call this from your logout handler)
export function clearCaches() {
  statusCache = {}; statusLoaded = false; statusLoadPromise = null;
  priorityCache = {}; priorityLoaded = false; priorityLoadPromise = null;
  expectedCache = {}; expectedLoaded = false; expectedLoadPromise = null;
}

// ── Loaders (fetch once from API, then serve from memory) ─────────

function ensureStatuses(): Promise<void> {
  if (statusLoaded) return Promise.resolve();
  if (statusLoadPromise) return statusLoadPromise;
  const p = api<Record<string, TestStatus>>("/data/statuses")
    .then((data) => {
      statusCache = data;
      statusLoaded = true;
      statusLoadPromise = null;
      notifyStatus();
    })
    .catch(() => {
      // Don't set statusLoaded — allow retry on next call
      statusLoadPromise = null;
    });
  statusLoadPromise = p;
  return p;
}

function ensurePriorities(): Promise<void> {
  if (priorityLoaded) return Promise.resolve();
  if (priorityLoadPromise) return priorityLoadPromise;
  const p = api<Record<string, TestPriority>>("/data/priorities")
    .then((data) => {
      priorityCache = data;
      priorityLoaded = true;
      priorityLoadPromise = null;
      notifyPriority();
    })
    .catch(() => {
      priorityLoadPromise = null;
    });
  priorityLoadPromise = p;
  return p;
}

function ensureExpected(): Promise<void> {
  if (expectedLoaded) return Promise.resolve();
  if (expectedLoadPromise) return expectedLoadPromise;
  const p = api<Record<string, boolean>>("/data/expected")
    .then((data) => {
      expectedCache = data;
      expectedLoaded = true;
      expectedLoadPromise = null;
      notifyExpected();
    })
    .catch(() => {
      expectedLoadPromise = null;
    });
  expectedLoadPromise = p;
  return p;
}

// ── Status hooks ──────────────────────────────────────────────────

export function useTestStatus(slug: string) {
  const [status, setStatusState] = useState<TestStatus>(() => statusCache[slug] ?? "pending");

  useEffect(() => {
    // Sync immediately in case cache changed while this component was unmounted
    setStatusState(statusCache[slug] ?? "pending");
    ensureStatuses().then(() => {
      setStatusState(statusCache[slug] ?? "pending");
    });

    const sync = () => setStatusState(statusCache[slug] ?? "pending");
    statusListeners.add(sync);
    return () => { statusListeners.delete(sync); };
  }, [slug]);

  const setStatus = useCallback(
    (next: TestStatus) => {
      if (!slug) return;
      statusCache = { ...statusCache, [slug]: next };
      notifyStatus();
      const body = JSON.stringify({ slug, status: next });
      api("/data/statuses", { method: "PUT", body })
        .catch(() => {
          // Retry once after 2s (handles server cold-start on Render free tier)
          setTimeout(() => {
            api("/data/statuses", { method: "PUT", body })
              .catch((err) => console.error("Failed to save status after retry:", err));
          }, 2000);
        });
    },
    [slug]
  );

  return { status, setStatus };
}

export function useAllTestStatuses() {
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>(() => ({ ...statusCache }));

  useEffect(() => {
    // Sync immediately in case cache changed while this component was unmounted
    setStatuses({ ...statusCache });
    ensureStatuses().then(() => setStatuses({ ...statusCache }));

    const sync = () => setStatuses({ ...statusCache });
    statusListeners.add(sync);
    return () => { statusListeners.delete(sync); };
  }, []);

  return statuses;
}

// ── Priority hooks ────────────────────────────────────────────────

export function useTestPriority(slug: string, defaultPriority: TestPriority) {
  const [priority, setPriorityState] = useState<TestPriority>(defaultPriority);

  useEffect(() => {
    ensurePriorities().then(() => {
      setPriorityState(priorityCache[slug] ?? defaultPriority);
    });

    const sync = () => setPriorityState(priorityCache[slug] ?? defaultPriority);
    priorityListeners.add(sync);
    return () => { priorityListeners.delete(sync); };
  }, [slug, defaultPriority]);

  const setPriority = useCallback(
    (next: TestPriority) => {
      if (!slug) return;
      priorityCache = { ...priorityCache, [slug]: next };
      notifyPriority();
      api("/data/priorities", {
        method: "PUT",
        body: JSON.stringify({ slug, priority: next }),
      }).catch((err) => console.error("Failed to save priority:", err));
    },
    [slug]
  );

  return { priority, setPriority };
}

export function useAllTestPriorities() {
  const [priorities, setPriorities] = useState<Record<string, TestPriority>>({});

  useEffect(() => {
    ensurePriorities().then(() => {
      setPriorities({ ...priorityCache });
    });

    const sync = () => setPriorities({ ...priorityCache });
    priorityListeners.add(sync);
    return () => { priorityListeners.delete(sync); };
  }, []);

  return priorities;
}

// ── Expected result checkbox hooks ────────────────────────────────

export function useExpectedChecked(key: string) {
  const [checked, setCheckedState] = useState(false);

  useEffect(() => {
    ensureExpected().then(() => {
      setCheckedState(expectedCache[key] ?? false);
    });

    const sync = () => setCheckedState(expectedCache[key] ?? false);
    expectedListeners.add(sync);
    return () => { expectedListeners.delete(sync); };
  }, [key]);

  const setChecked = useCallback(
    (next: boolean) => {
      if (!key) return;
      expectedCache = { ...expectedCache, [key]: next };
      notifyExpected();
      api("/data/expected", {
        method: "PUT",
        body: JSON.stringify({ key, checked: next }),
      }).catch((err) => console.error("Failed to save expected:", err));
    },
    [key]
  );

  return { checked, setChecked };
}

export function useAllExpectedCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const compute = () => {
      const result: Record<string, number> = {};
      Object.entries(expectedCache).forEach(([key, val]) => {
        if (!val) return;
        const match = key.match(/^(.+)__expected__.+$/);
        if (match) {
          const slug = match[1];
          result[slug] = (result[slug] ?? 0) + 1;
        }
      });
      setCounts(result);
    };

    ensureExpected().then(compute);
    expectedListeners.add(compute);
    return () => { expectedListeners.delete(compute); };
  }, []);

  return counts;
}

export function loadExpectedMap(): Record<string, boolean> {
  // Return from cache — data will have been loaded by hooks already
  return { ...expectedCache };
}

// ── Failed result checkbox hooks (reuses expectedCache / expectedListeners) ───

export function useFailedChecked(key: string) {
  const [checked, setCheckedState] = useState(false);

  useEffect(() => {
    ensureExpected().then(() => {
      setCheckedState(expectedCache[key] ?? false);
    });

    const sync = () => setCheckedState(expectedCache[key] ?? false);
    expectedListeners.add(sync);
    return () => { expectedListeners.delete(sync); };
  }, [key]);

  const setChecked = useCallback(
    (next: boolean) => {
      if (!key) return;
      expectedCache = { ...expectedCache, [key]: next };
      notifyExpected();
      api("/data/expected", {
        method: "PUT",
        body: JSON.stringify({ key, checked: next }),
      }).catch((err) => console.error("Failed to save failed result:", err));
    },
    [key]
  );

  return { checked, setChecked };
}

export function useAllFailedCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const compute = () => {
      const result: Record<string, number> = {};
      Object.entries(expectedCache).forEach(([k, val]) => {
        if (!val) return;
        const match = k.match(/^(.+)__failed__.+$/);
        if (match) {
          const slug = match[1];
          result[slug] = (result[slug] ?? 0) + 1;
        }
      });
      setCounts(result);
    };

    ensureExpected().then(compute);
    expectedListeners.add(compute);
    return () => { expectedListeners.delete(compute); };
  }, []);

  return counts;
}
