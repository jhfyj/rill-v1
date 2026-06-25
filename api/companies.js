import { getAllCompanies } from "./_lib/db.js";

const MAX_DISPLAY = 12;

/**
 * GET /api/companies
 *
 * Returns up to MAX_DISPLAY companies for Section 3.
 * If more than MAX_DISPLAY companies exist in the database, a random
 * sample of MAX_DISPLAY is returned on every request.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const all = await getAllCompanies();

    let selected;
    if (all.length <= MAX_DISPLAY) {
      selected = all;
    } else {
      // Fisher-Yates partial shuffle to pick MAX_DISPLAY random items
      const pool = [...all];
      for (let i = 0; i < MAX_DISPLAY; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      selected = pool.slice(0, MAX_DISPLAY);
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(selected);
  } catch (err) {
    console.error("[GET /api/companies]", err);
    return res.status(500).json({ error: "Failed to fetch companies" });
  }
}
