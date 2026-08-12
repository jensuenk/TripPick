const STORAGE_PREFIX = "trippick:member:";

export function getStoredMemberId(tripToken: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${tripToken}`);
  } catch {
    return null;
  }
}

export function setStoredMemberId(tripToken: string, memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tripToken}`, memberId);
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearStoredMemberId(tripToken: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${tripToken}`);
  } catch {
    // ignore
  }
}
