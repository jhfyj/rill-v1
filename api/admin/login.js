import { buildSessionCookie } from "../_lib/auth.js";

/**
 * POST /api/admin/login
 * Body: { password: string }
 *
 * Compares the submitted password against the ADMIN_PASSWORD env var.
 * On success, sets an HttpOnly session cookie and returns 200.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.setHeader("Set-Cookie", buildSessionCookie());
  return res.status(200).json({ ok: true });
}
