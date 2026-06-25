import { isAuthenticated } from "../_lib/auth.js";
import { getAllCompanies, saveAllCompanies } from "../_lib/db.js";
import { randomUUID } from "crypto";

/**
 * /api/admin/companies
 *
 * All routes require a valid admin session cookie.
 *
 * GET    — list all companies (full list, no 12-cap)
 * POST   — create a new company  (body: CompanyPayload)
 * PUT    — update a company      (body: CompanyPayload with id)
 * DELETE — delete a company      (body: { id: string })
 */
export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    switch (req.method) {
      case "GET": {
        const companies = await getAllCompanies();
        return res.status(200).json(companies);
      }

      case "POST": {
        const payload = req.body;
        if (!payload?.name) {
          return res.status(400).json({ error: "name is required" });
        }
        const companies = await getAllCompanies();
        const newCompany = {
          id: randomUUID(),
          stage: payload.stage ?? "",
          category: payload.category ?? "",
          name: payload.name,
          description: payload.description ?? "",
          details: payload.details ?? "",
          longer: payload.longer ?? "",
          roles: Array.isArray(payload.roles) ? payload.roles : [],
          team: Array.isArray(payload.team) ? payload.team : [],
          createdAt: new Date().toISOString(),
        };
        companies.push(newCompany);
        await saveAllCompanies(companies);
        return res.status(201).json(newCompany);
      }

      case "PUT": {
        const payload = req.body;
        if (!payload?.id) {
          return res.status(400).json({ error: "id is required" });
        }
        const companies = await getAllCompanies();
        const idx = companies.findIndex((c) => c.id === payload.id);
        if (idx === -1) {
          return res.status(404).json({ error: "Company not found" });
        }
        companies[idx] = {
          ...companies[idx],
          stage: payload.stage ?? companies[idx].stage,
          category: payload.category ?? companies[idx].category,
          name: payload.name ?? companies[idx].name,
          description: payload.description ?? companies[idx].description,
          details: payload.details ?? companies[idx].details,
          longer: payload.longer ?? companies[idx].longer,
          roles: Array.isArray(payload.roles) ? payload.roles : companies[idx].roles,
          team: Array.isArray(payload.team) ? payload.team : companies[idx].team,
          updatedAt: new Date().toISOString(),
        };
        await saveAllCompanies(companies);
        return res.status(200).json(companies[idx]);
      }

      case "DELETE": {
        const { id } = req.body || {};
        if (!id) {
          return res.status(400).json({ error: "id is required" });
        }
        const companies = await getAllCompanies();
        const filtered = companies.filter((c) => c.id !== id);
        if (filtered.length === companies.length) {
          return res.status(404).json({ error: "Company not found" });
        }
        await saveAllCompanies(filtered);
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("[/api/admin/companies]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
