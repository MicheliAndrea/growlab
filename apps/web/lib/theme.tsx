"use client";

import * as React from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const storageKey = "growlab-theme";
const themeChangeEvent = "growlab-theme-change";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const saved = window.localStorage.getItem(storageKey);

  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function subscribeSystemTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function subscribeStoredTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener(themeChangeEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(themeChangeEvent, callback);
  };
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = React.useSyncExternalStore<ThemeMode>(
    subscribeStoredTheme,
    readStoredTheme,
    () => "system",
  );
  const systemResolvedTheme = React.useSyncExternalStore<ResolvedTheme>(
    subscribeSystemTheme,
    getSystemTheme,
    () => "light",
  );
  const resolvedTheme: ResolvedTheme =
    mode === "system" ? systemResolvedTheme : mode;

  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    window.localStorage.setItem(storageKey, nextMode);
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

  const value = React.useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
