"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, SETTINGS_KEY, parseSettings, serializeSettings, type Settings } from "@/lib/settings";

/*
 * A tiny store over localStorage. useSyncExternalStore renders the defaults on the server and during
 * hydration, then the stored values, so there is no hydration mismatch. Other tabs follow changes through
 * the storage event. If storage is blocked (private mode, disabled site data), settings still work for the
 * open page from memory.
 */
const listeners = new Set<() => void>();
let memoryOnly = false;
let memory: string | null = null;
let cachedRaw: string | null | undefined;
let cached: Settings = { ...DEFAULT_SETTINGS };

function readRaw(): string | null {
  if (memoryOnly) return memory;
  try {
    return window.localStorage.getItem(SETTINGS_KEY);
  } catch {
    memoryOnly = true;
    return memory;
  }
}

function writeRaw(raw: string | null) {
  memory = raw;
  if (!memoryOnly) {
    try {
      if (raw === null) window.localStorage.removeItem(SETTINGS_KEY);
      else window.localStorage.setItem(SETTINGS_KEY, raw);
    } catch {
      memoryOnly = true;
    }
  }
  listeners.forEach(listener => listener());
}

function getSnapshot(): Settings {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseSettings(raw);
  }
  return cached;
}

const getServerSnapshot = (): Settings => DEFAULT_SETTINGS;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateSettings(patch: Partial<Settings>) {
  writeRaw(serializeSettings({ ...getSnapshot(), ...patch }));
}

export function resetSettings() {
  writeRaw(null);
}
