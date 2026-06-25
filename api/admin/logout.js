import { clearSessionCookie } from "../_lib/auth.js";

/**
 * POST /api/admin/logout
 * Clears the session cookie.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.status(200).json({ ok: true });
}
