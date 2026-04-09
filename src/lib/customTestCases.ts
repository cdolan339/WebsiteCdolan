/**
 * src/lib/customTestCases.ts  (DROP-IN REPLACEMENT)
 *
 * Same exported functions and hooks. Data is fetched from the API
 * on first access and cached in memory. Writes go to the API with
 * optimistic local cache updates.
 */

import { useState, useEffect } from "react";
import { api } from "./api";
import { getActiveProjectId } from "./projects";

export type CustomTC = {
  id: string;
  name: string;
  priority: "low" | "medium" | "high" | "critical";
  steps: string[];
  expected: string;
};

export type CustomTestCase = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  objective: string;
  preconditions: string[];
  priority: "low" | "medium" | "high" | "critical";
  testCases: CustomTC[];
  completed?: boolean;
  completedAt?: string | null;
  projectId?: number | null;
};

// ── In-memory cache ───────────────────────────────────────────────

let caseCache: CustomTestCase[] | null = null;
let loadPromise: Promise<void> | null = null;
let cachedProjectId: number | null | undefined = undefined; // tracks which project was loaded
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

// Reset on logout
export function clearCustomCache() {
  caseCache = null;
  loadPromise = null;
  cachedProjectId = undefined;
}

/** Called by WebSocket handler to force a re-fetch from the API */
export function invalidateCustomCache() {
  caseCache = null;
  loadPromise = null;
  // Keep cachedProjectId so ensureLoaded fetches for the same project
  notify();
}

// Force reload when switching projects
export function reloadForProject(projectId: number | null) {
  if (cachedProjectId === projectId && caseCache !== null) return;
  caseCache = null;
  loadPromise = null;
  cachedProjectId = projectId;
  notify();
}

async function ensureLoaded(): Promise<CustomTestCase[]> {
  const activeProject = getActiveProjectId();

  // If project changed since last load, invalidate
  if (cachedProjectId !== activeProject) {
    caseCache = null;
    loadPromise = null;
    cachedProjectId = activeProject;
  }

  if (caseCache !== null) return caseCache;

  if (!loadPromise) {
    const qs = activeProject ? `?projectId=${activeProject}` : "";
    loadPromise = api<CustomTestCase[]>(`/custom-test-cases${qs}`)
      .then((data) => {
        caseCache = data;
      })
      .catch(() => {
        caseCache = [];
      });
  }

  await loadPromise;
  return caseCache!;
}

// ── Factory functions (unchanged) ─────────────────────────────────

export function createCustomTC(): CustomTC {
  return {
    id: `subtc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    priority: "medium",
    steps: [""],
    expected: "",
  };
}

export function createCustomTestCase(): CustomTestCase {
  const now = new Date().toISOString();
  return {
    id: `tc-${Date.now()}`,
    title: "",
    summary: "",
    createdAt: now,
    updatedAt: now,
    tags: [],
    objective: "",
    preconditions: [],
    priority: "medium",
    testCases: [],
  };
}

// ── CRUD operations ───────────────────────────────────────────────

export async function addCustomTestCase(tc: CustomTestCase): Promise<void> {
  // Attach current project
  const projectId = getActiveProjectId();
  const payload = { ...tc, projectId };

  // Optimistic update
  await ensureLoaded();
  caseCache = [...(caseCache ?? []), { ...tc, projectId }];
  notify();

  // Persist to API
  try {
    await api("/custom-test-cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to save test case:", err);
  }
}

export async function updateCustomTestCase(
  updated: CustomTestCase
): Promise<void> {
  await ensureLoaded();
  caseCache = (caseCache ?? []).map((tc) =>
    tc.id === updated.id ? updated : tc
  );
  notify();

  try {
    await api(`/custom-test-cases/${updated.id}`, {
      method: "PUT",
      body: JSON.stringify(updated),
    });
  } catch (err) {
    console.error("Failed to update test case:", err);
  }
}

export async function getCustomTestCase(
  id: string
): Promise<CustomTestCase | undefined> {
  const cases = await ensureLoaded();
  return cases.find((tc) => tc.id === id);
}

export async function completeTestCase(
  id: string,
  completed: boolean
): Promise<void> {
  await ensureLoaded();
  caseCache = (caseCache ?? []).map((tc) =>
    tc.id === id
      ? { ...tc, completed, completedAt: completed ? new Date().toISOString() : null }
      : tc
  );
  notify();

  try {
    await api(`/custom-test-cases/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  } catch (err) {
    console.error("Failed to complete test case:", err);
  }
}

// ── Hooks (same signatures) ───────────────────────────────────────

export function useCustomTestCases(): { cases: CustomTestCase[]; loading: boolean } {
  const [cases, setCases] = useState<CustomTestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ensureLoaded().then((data) => {
      setCases([...data]);
      setLoading(false);
    });

    const sync = () => {
      // When notify fires (e.g. project switch), re-fetch
      ensureLoaded().then((data) => {
        setCases([...data]);
        setLoading(false);
      });
    };
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { cases, loading };
}

export function useCustomTestCase(
  id: string
): { tc: CustomTestCase | undefined; ready: boolean } {
  const [tc, setTc] = useState<CustomTestCase | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLoaded().then((data) => {
      setTc(data.find((c) => c.id === id));
      setReady(true);
    });

    const sync = () => setTc((caseCache ?? []).find((c) => c.id === id));
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [id]);

  return { tc, ready };
}
