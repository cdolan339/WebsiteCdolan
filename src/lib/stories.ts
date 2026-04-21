/**
 * src/lib/stories.ts
 *
 * API-backed BA Story persistence, project-scoped. Mirrors customTestCases.ts:
 * in-memory cache, optimistic updates, listener-based reactivity, WS invalidation.
 */

import { useEffect, useState } from "react";
import { api } from "./api";
import { getActiveProjectId } from "./projects";

// ── Types ─────────────────────────────────────────────────────────

export type RaciRole = "R" | "A" | "C" | "I";

export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  raci: RaciRole;
};

export type AcceptanceCriterion = {
  id: string;
  given: string;
  when: string;
  then: string;
};

export type UserStoryPriority = "low" | "medium" | "high" | "critical";
export type UserStoryStatus = "draft" | "ready" | "in-progress" | "done";

export type UserStory = {
  id: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: AcceptanceCriterion[];
  priority: UserStoryPriority;
  status: UserStoryStatus;
};

export type RequirementType = "functional" | "non-functional";
export type MoscowPriority = "must" | "should" | "could" | "wont";

export type Requirement = {
  id: string;
  code: string;
  type: RequirementType;
  description: string;
  priority: MoscowPriority;
};

export type ProcessFlowStep = {
  id: string;
  actor: string;
  action: string;
};

export type ProcessFlow = {
  id: string;
  name: string;
  description: string;
  steps: ProcessFlowStep[];
};

export type Wireframe = {
  id: string;
  name: string;
  imageUrl: string;
  notes: string;
};

export type RtmStatus = "not-covered" | "covered" | "verified";

export type RtmEntry = {
  id: string;
  requirementCode: string;
  userStoryId: string;
  testCaseRef: string;
  status: RtmStatus;
};

export type RaidType = "risk" | "assumption" | "issue" | "dependency";
export type RaidImpact = "low" | "medium" | "high";
export type RaidStatus = "open" | "mitigated" | "closed";

export type RaidEntry = {
  id: string;
  type: RaidType;
  description: string;
  impact: RaidImpact;
  owner: string;
  status: RaidStatus;
};

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

export type StoryStatus = "discovery" | "analysis" | "development" | "uat" | "done";

export type Story = {
  id: string;
  userId?: number;
  projectId?: number | null;
  title: string;
  summary: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
  businessCase: string;
  objectives: string[];
  scopeIn: string[];
  scopeOut: string[];
  stakeholders: Stakeholder[];
  userStories: UserStory[];
  requirements: Requirement[];
  processFlows: ProcessFlow[];
  wireframes: Wireframe[];
  rtm: RtmEntry[];
  raid: RaidEntry[];
  attachments: Attachment[];
  notes: string;
  completed?: boolean;
  completedAt?: string | null;
  manualProgress?: number | null;
};

// ── In-memory cache ───────────────────────────────────────────────

let storyCache: Story[] | null = null;
let loadPromise: Promise<void> | null = null;
let cachedProjectId: number | null | undefined = undefined;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function clearStoryCache() {
  storyCache = null;
  loadPromise = null;
  cachedProjectId = undefined;
}

/** Called by WebSocket handler to force a re-fetch from the API */
export function invalidateStoryCache() {
  storyCache = null;
  loadPromise = null;
  notify();
}

export function reloadStoriesForProject(projectId: number | null) {
  if (cachedProjectId === projectId && storyCache !== null) return;
  storyCache = null;
  loadPromise = null;
  cachedProjectId = projectId;
  notify();
}

async function ensureLoaded(): Promise<Story[]> {
  const activeProject = getActiveProjectId();

  if (cachedProjectId !== activeProject) {
    storyCache = null;
    loadPromise = null;
    cachedProjectId = activeProject;
  }

  if (storyCache !== null) return storyCache;

  if (!loadPromise) {
    const qs = activeProject ? `?projectId=${activeProject}` : "";
    loadPromise = api<Story[]>(`/stories${qs}`)
      .then((data) => {
        storyCache = data;
      })
      .catch(() => {
        storyCache = [];
      });
  }

  await loadPromise;
  return storyCache!;
}

// ── Id helper ─────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Factories (unchanged) ─────────────────────────────────────────

export function createStory(): Story {
  const now = new Date().toISOString();
  return {
    id: uid("story"),
    title: "",
    summary: "",
    status: "discovery",
    createdAt: now,
    updatedAt: now,
    businessCase: "",
    objectives: [],
    scopeIn: [],
    scopeOut: [],
    stakeholders: [],
    userStories: [],
    requirements: [],
    processFlows: [],
    wireframes: [],
    rtm: [],
    raid: [],
    attachments: [],
    notes: "",
    completed: false,
    completedAt: null,
    manualProgress: null,
  };
}

export function createStakeholder(): Stakeholder {
  return { id: uid("stk"), name: "", role: "", raci: "I" };
}

export function createAcceptanceCriterion(): AcceptanceCriterion {
  return { id: uid("ac"), given: "", when: "", then: "" };
}

export function createUserStory(): UserStory {
  return {
    id: uid("us"),
    asA: "",
    iWant: "",
    soThat: "",
    criteria: [createAcceptanceCriterion()],
    priority: "medium",
    status: "draft",
  };
}

export function createRequirement(type: RequirementType = "functional"): Requirement {
  return {
    id: uid("req"),
    code: "",
    type,
    description: "",
    priority: "should",
  };
}

export function createProcessFlow(): ProcessFlow {
  return {
    id: uid("pf"),
    name: "",
    description: "",
    steps: [{ id: uid("step"), actor: "", action: "" }],
  };
}

export function createProcessStep(): ProcessFlowStep {
  return { id: uid("step"), actor: "", action: "" };
}

export function createWireframe(): Wireframe {
  return { id: uid("wf"), name: "", imageUrl: "", notes: "" };
}

export function createRtmEntry(): RtmEntry {
  return {
    id: uid("rtm"),
    requirementCode: "",
    userStoryId: "",
    testCaseRef: "",
    status: "not-covered",
  };
}

export function createRaidEntry(type: RaidType = "risk"): RaidEntry {
  return {
    id: uid("raid"),
    type,
    description: "",
    impact: "medium",
    owner: "",
    status: "open",
  };
}

// ── CRUD (API-backed, optimistic) ─────────────────────────────────

export async function getStory(id: string): Promise<Story | undefined> {
  const stories = await ensureLoaded();
  return stories.find((s) => s.id === id);
}

export async function addStory(story: Story): Promise<void> {
  // Respect caller-provided projectId (including null to mean "unassigned");
  // fall back to the active project when the caller didn't set one.
  const projectId = story.projectId !== undefined ? story.projectId : getActiveProjectId();
  const payload = { ...story, projectId };

  await ensureLoaded();
  storyCache = [{ ...story, projectId }, ...(storyCache ?? [])];
  notify();

  try {
    await api("/stories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to save story:", err);
  }
}

export async function updateStory(updated: Story): Promise<void> {
  await ensureLoaded();
  const next = { ...updated, updatedAt: new Date().toISOString() };
  storyCache = (storyCache ?? []).map((s) => (s.id === updated.id ? next : s));
  notify();

  try {
    await api(`/stories/${updated.id}`, {
      method: "PUT",
      body: JSON.stringify(next),
    });
  } catch (err) {
    console.error("Failed to update story:", err);
  }
}

export async function completeStory(id: string, completed: boolean): Promise<void> {
  await ensureLoaded();
  storyCache = (storyCache ?? []).map((s) =>
    s.id === id
      ? { ...s, completed, completedAt: completed ? new Date().toISOString() : null }
      : s,
  );
  notify();

  try {
    await api(`/stories/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  } catch (err) {
    console.error("Failed to complete story:", err);
  }
}

export async function deleteStory(id: string): Promise<void> {
  await ensureLoaded();
  storyCache = (storyCache ?? []).filter((s) => s.id !== id);
  notify();

  try {
    await api(`/stories/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error("Failed to delete story:", err);
  }
}

// ── Hooks ─────────────────────────────────────────────────────────

export function useStories(): { stories: Story[]; loading: boolean } {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ensureLoaded().then((data) => {
      setStories([...data]);
      setLoading(false);
    });

    const sync = () => {
      ensureLoaded().then((data) => {
        setStories([...data]);
        setLoading(false);
      });
    };
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { stories, loading };
}

export function useStory(id: string): { story: Story | undefined; ready: boolean } {
  const [story, setStory] = useState<Story | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLoaded().then((data) => {
      setStory(data.find((s) => s.id === id));
      setReady(true);
    });

    const sync = () => ensureLoaded().then((data) => setStory(data.find((s) => s.id === id)));
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [id]);

  return { story, ready };
}
