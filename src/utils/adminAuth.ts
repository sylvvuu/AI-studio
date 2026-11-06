const ADMIN_PW_KEY = 'event_admin_password_hash_v1';
const ADMIN_SESSION_KEY = 'event_admin_session_auth_v1';
export const DEFAULT_ADMIN_PASSWORD = 'admin1234';

export function getAdminPassword(): string {
  try {
    const saved = localStorage.getItem(ADMIN_PW_KEY);
    return saved || DEFAULT_ADMIN_PASSWORD;
  } catch {
    return DEFAULT_ADMIN_PASSWORD;
  }
}

export function setAdminPassword(newPw: string): void {
  localStorage.setItem(ADMIN_PW_KEY, newPw);
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function loginAdmin(inputPw: string): boolean {
  const currentPw = getAdminPassword();
  if (inputPw === currentPw) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
