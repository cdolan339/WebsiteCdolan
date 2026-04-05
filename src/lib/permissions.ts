/**
 * src/lib/permissions.ts
 *
 * Fetches the current user's permissions from the API and caches them.
 * Provides a hook for checking permissions in components.
 */

import { useState, useEffect } from "react";
import { api } from "./api";

let permCache: string[] | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function clearPermissionCache() {
  permCache = null;
  loadPromise = null;
}

async function ensureLoaded(): Promise<string[]> {
  if (permCache !== null) return permCache;

  if (!loadPromise) {
    loadPromise = api<string[]>("/permissions")
      .then((data) => {
        permCache = data;
      })
      .catch(() => {
        permCache = [];
      });
  }

  await loadPromise;
  return permCache!;
}

export function usePermissions(): { permissions: string[]; loading: boolean } {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureLoaded().then((data) => {
      setPermissions([...data]);
      setLoading(false);
    });

    const sync = () => setPermissions([...(permCache ?? [])]);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { permissions, loading };
}

export function useHasPermission(permission: string): boolean {
  const { permissions } = usePermissions();
  return permissions.includes(permission);
}
