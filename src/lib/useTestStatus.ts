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
const statusListeners = new Set<() => void>();
function notifyStatus() { statusListeners.forEach((fn) => fn()); }

let priorityCache: Record<string, TestPriority> = {};
let priorityLoaded = false;
const priorityListeners = new Set<() => void>();
function notifyPriority() { priorityListeners.forEach((fn) => fn()); }

let expectedCache: Record<string, boolean> = {};
let expectedLoaded = false;
const expectedListeners = new Set<() => void>();
function notifyExpected() { expectedListeners.forEach((fn) => fn()); }

// Reset caches on logout (call this from your logout handler)
export function clearCaches() {
  statusCache = {}; statusLoaded = false;
  priorityCache = {}; priorityLoaded = false;
  expectedCache = {}; expectedLoaded = false;
}

// ── Loaders (fetch once from API, then serve from memory) ─────────

async function ensureStatuses() {
  if (statusLoaded) return;
  try {
    statusCache = await api<Record<string, TestStatus>>("/data/statuses");
  } catch { statusCache = {}; }
  statusLoaded = true;
  notifyStatus();
}

async function ensurePriorities() {
  if (priorityLoaded) return;
  try {
    priorityCache = await api<Record<string, TestPriority>>("/data/priorities");
  } catch { priorityCache = {}; }
  priorityLoaded = true;
  notifyPriority();
}

async function ensureExpected() {
  if (expectedLoaded) return;
  try {
    expectedCache = await api<Record<string, boolean>>("/data/expected");
  } catch { expectedCache = {}; }
  expectedLoaded = true;
  notifyExpected();
}

// ── Status hooks ──────────────────────────────────────────────────

export function useTestStatus(slug: string) {
  const [status, setStatusState] = useState<TestStatus>("pending");

  useEffect(() => {
    ensureStatuses().then(() => {
      setStatusState(statusCache[slug] ?? "pending");
    });

    const sync = () => setStatusState(statusCache[slug] ?? "pending");
    statusListeners.add(sync);
    return () => { statusListeners.delete(sync); };
  }, [slug]);

  const setStatus = useCallback(
    (next: TestStatus) => {
      statusCache = { ...statusCache, [slug]: next };
      notifyStatus();
      // Persist to API in background
      api("/data/statuses", {
        method: "PUT",
        body: JSON.stringify({ slug, status: next }),
      }).catch(console.error);
    },
    [slug]
  );

  return { status, setStatus };
}

export function useAllTestStatuses() {
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({});

  useEffect(() => {
    ensureStatuses().then(() => {
      setStatuses({ ...statusCache });
    });

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
      priorityCache = { ...priorityCache, [slug]: next };
      notifyPriority();
      api("/data/priorities", {
        method: "PUT",
        body: JSON.stringify({ slug, priority: next }),
      }).catch(console.error);
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
      expectedCache = { ...expectedCache, [key]: next };
      notifyExpected();
      api("/data/expected", {
        method: "PUT",
        body: JSON.stringify({ key, checked: next }),
      }).catch(console.error);
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
