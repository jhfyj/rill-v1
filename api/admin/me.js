import { isAuthenticated } from "../_lib/auth.js";

/**
 * GET /api/admin/me
 * Returns 200 if the session cookie is valid, 401 otherwise.
 * Used by the frontend to check if the admin is already logged in.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.status(200).json({ ok: true });
}
