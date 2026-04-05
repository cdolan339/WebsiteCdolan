/**
 * src/lib/projects.ts
 *
 * API-backed project management with in-memory cache.
 * Same pattern as customTestCases.ts — optimistic updates, listener-based reactivity.
 */

import { useState, useEffect } from "react";
import { api } from "./api";

export type Project = {
  id: number;
  name: string;
  description: string;
  tags: string[];
  timelineStart: string | null;
  timelineEnd: string | null;
  deadline: string | null;
  createdBy: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
  tags?: string[];
  timelineStart?: string | null;
  timelineEnd?: string | null;
  deadline?: string | null;
};

// ── In-memory cache ───────────────────────────────────────────────

let projectCache: Project[] | null = null;
let loadPromise: Promise<void> | null = null;
let activeProjectId: number | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function clearProjectCache() {
  projectCache = null;
  loadPromise = null;
  activeProjectId = null;
}

async function ensureLoaded(): Promise<Project[]> {
  if (projectCache !== null) return projectCache;

  if (!loadPromise) {
    loadPromise = api<Project[]>("/projects")
      .then((data) => {
        projectCache = data;
      })
      .catch(() => {
        projectCache = [];
      });
  }

  await loadPromise;
  return projectCache!;
}

// ── Active project ────────────────────────────────────────────────

export function getActiveProjectId(): number | null {
  if (activeProjectId !== null) return activeProjectId;
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("qa-active-project");
  if (stored) {
    activeProjectId = Number(stored);
    return activeProjectId;
  }
  return null;
}

export function setActiveProjectId(id: number | null) {
  activeProjectId = id;
  if (id !== null) {
    localStorage.setItem("qa-active-project", String(id));
  } else {
    localStorage.removeItem("qa-active-project");
  }
  notify();
}

// ── CRUD operations ───────────────────────────────────────────────

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const project = await api<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await ensureLoaded();
  projectCache = [...(projectCache ?? []), project];
  notify();
  return project;
}

export async function updateProject(id: number, payload: Partial<CreateProjectPayload>): Promise<Project> {
  const project = await api<Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  await ensureLoaded();
  projectCache = (projectCache ?? []).map((p) => (p.id === id ? project : p));
  notify();
  return project;
}

export async function deleteProject(id: number): Promise<void> {
  await api(`/projects/${id}`, { method: "DELETE" });

  await ensureLoaded();
  projectCache = (projectCache ?? []).filter((p) => p.id !== id);

  // If we deleted the active project, clear selection
  if (activeProjectId === id) {
    setActiveProjectId(null);
  }
  notify();
}

// ── Hooks ─────────────────────────────────────────────────────────

export function useProjects(): { projects: Project[]; loading: boolean } {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureLoaded().then((data) => {
      setProjects([...data]);
      setLoading(false);
    });

    const sync = () => setProjects([...(projectCache ?? [])]);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { projects, loading };
}

export function useActiveProjectId(): [number | null, (id: number | null) => void] {
  const [id, setId] = useState<number | null>(() => getActiveProjectId());

  useEffect(() => {
    const sync = () => setId(getActiveProjectId());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return [id, setActiveProjectId];
}
