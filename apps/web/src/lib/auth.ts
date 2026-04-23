const TOKEN_KEY = 'pulserank_token';
const USERNAME_KEY = 'pulserank_username';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Parse the JWT payload without verifying the signature.
 * Used only for display purposes on the client — the server re-validates on every request.
 */
export function parseTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
