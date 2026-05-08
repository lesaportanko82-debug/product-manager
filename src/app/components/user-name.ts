// Centralized user name management
const STORAGE_KEY = "user-name";

export function getUserName(): string {
  try {
    // Primary: dedicated user-name key
    const name = localStorage.getItem(STORAGE_KEY);
    if (name) return name;
    // Fallback: auth-state (legacy)
    const authState = localStorage.getItem("auth-state");
    if (authState) {
      const parsed = JSON.parse(authState);
      if (parsed.name) return parsed.name;
    }
  } catch {}
  return "Вы";
}

export function saveUserName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name.trim());
    // Also sync to auth-state for backward compatibility
    const existing = localStorage.getItem("auth-state");
    const state = existing ? JSON.parse(existing) : {};
    state.name = name.trim();
    localStorage.setItem("auth-state", JSON.stringify(state));
  } catch {}
}

export function hasUserName(): boolean {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    return !!name && name.trim().length > 0;
  } catch {
    return false;
  }
}
