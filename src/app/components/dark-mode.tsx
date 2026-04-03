import { useCallback, useEffect } from "react";

// ─── Dark mode is permanently disabled ───────────────────────────────────────
// The app always runs in light mode. This module keeps its exports intact so
// no other file needs to change its imports, but all functionality is no-op.

// Remove the `dark` class synchronously when this module is first imported,
// before the first React render, to prevent any dark-theme flash.
try {
  document.documentElement.classList.remove("dark");
  localStorage.removeItem("course-dark-mode");
} catch {}

// Hook — always returns isDark = false; toggle is a no-op.
export function useDarkMode() {
  useEffect(() => {
    // Guard: keep removing on every mount just in case another part of the app
    // tries to add the class.
    document.documentElement.classList.remove("dark");
  }, []);

  const toggle = useCallback(() => {
    // Dark mode disabled — intentional no-op.
  }, []);

  return { isDark: false as const, toggle };
}

// DarkModeToggle — renders nothing (button removed from UI).
export function DarkModeToggle(_props: { isDark: boolean; onToggle: () => void }) {
  return null;
}
