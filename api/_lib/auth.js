import { parseCookie } from "cookie";

const SESSION_COOKIE = "rill_admin_session";

/**
 * Returns true if the incoming request carries a valid admin session cookie.
 * The cookie value is compared against the ADMIN_SESSION_SECRET env var
 * (set by the /api/admin/login endpoint after password verification).
 */
export function isAuthenticated(req) {
  const cookieHeader = req.headers["cookie"] || "";
  const cookies = parseCookie(cookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  return token === process.env.ADMIN_SESSION_SECRET;
}

/**
 * Build a Set-Cookie header string that plants the session token.
 * HttpOnly + SameSite=Strict; Secure only in production.
 */
export function buildSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${process.env.ADMIN_SESSION_SECRET}; HttpOnly; SameSite=Strict; Path=/${secure}; Max-Age=86400`;
}

/**
 * Build a Set-Cookie header that clears the session.
 */
export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
