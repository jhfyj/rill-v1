import type { Company } from "../types/company";

const BASE = "/api";

// ─── Public ──────────────────────────────────────────────────────────────────

/** Fetch up to 12 randomly-sampled companies for Section 3. */
export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${BASE}/companies`);
  if (!res.ok) throw new Error("Failed to fetch companies");
  return res.json();
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** Returns true if the current session cookie is valid. */
export async function checkAdminSession(): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/me`);
  return res.ok;
}

/** Attempt to log in with the given password. Returns true on success. */
export async function adminLogin(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

/** Log out the admin session. */
export async function adminLogout(): Promise<void> {
  await fetch(`${BASE}/admin/logout`, { method: "POST" });
}

/** Fetch the full (uncapped) company list for the admin dashboard. */
export async function adminFetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${BASE}/admin/companies`);
  if (!res.ok) throw new Error("Unauthorized or failed to fetch");
  return res.json();
}

/** Create a new company. */
export async function adminCreateCompany(
  data: Omit<Company, "id" | "createdAt" | "updatedAt">
): Promise<Company> {
  const res = await fetch(`${BASE}/admin/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create company");
  return res.json();
}

/** Update an existing company. */
export async function adminUpdateCompany(
  data: Partial<Company> & { id: string }
): Promise<Company> {
  const res = await fetch(`${BASE}/admin/companies`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update company");
  return res.json();
}

/** Delete a company by id. */
export async function adminDeleteCompany(id: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/companies`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete company");
}
