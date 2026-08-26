// Admin / Guru Authentication Utilities for Website MBB

const AUTH_SESSION_KEY = 'mbb_admin_session_v1';
const CUSTOM_PIN_KEY = 'mbb_admin_custom_pin_v1';

// Default Passwords accepted if no custom PIN is set
const DEFAULT_PINS = ['123456', 'admin', 'guru123', 'mbb2026'];

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const session = localStorage.getItem(AUTH_SESSION_KEY);
    if (!session) return false;
    const parsed = JSON.parse(session);
    // Session valid if timestamp exists (e.g., valid for 24 hours)
    if (parsed && parsed.authenticated && parsed.timestamp) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - parsed.timestamp < oneDay) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function setAdminAuthenticated(remember: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    const session = {
      authenticated: true,
      timestamp: Date.now(),
      remember,
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getCustomAdminPin(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CUSTOM_PIN_KEY);
  } catch {
    return null;
  }
}

export function setCustomAdminPin(newPin: string): boolean {
  if (typeof window === 'undefined') return false;
  const trimmed = newPin.trim();
  if (trimmed.length < 4) return false;
  try {
    localStorage.setItem(CUSTOM_PIN_KEY, trimmed);
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminPassword(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const customPin = getCustomAdminPin();
  if (customPin) {
    if (trimmed === customPin) return true;
  }

  // Check default accepted PINs
  return DEFAULT_PINS.includes(trimmed);
}
