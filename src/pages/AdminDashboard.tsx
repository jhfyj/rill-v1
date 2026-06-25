import { useEffect, useState } from "react";
import type { Company } from "../types/company";
import {
  adminFetchCompanies,
  adminCreateCompany,
  adminUpdateCompany,
  adminDeleteCompany,
  adminLogout,
} from "../lib/api";
import { CompanyForm } from "../components/admin/CompanyForm";

interface AdminDashboardProps {
  onLogout: () => void;
}

type Modal =
  | { type: "add" }
  | { type: "edit"; company: Company }
  | { type: "delete"; company: Company }
  | null;

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminFetchCompanies();
      setCompanies(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLogout() {
    await adminLogout();
    onLogout();
  }

  async function handleCreate(
    data: Omit<Company, "id" | "createdAt" | "updatedAt">
  ) {
    await adminCreateCompany(data);
    setModal(null);
    await load();
  }

  async function handleUpdate(
    data: Omit<Company, "id" | "createdAt" | "updatedAt">
  ) {
    if (modal?.type !== "edit") return;
    await adminUpdateCompany({ ...data, id: modal.company.id });
    setModal(null);
    await load();
  }

  async function handleDelete() {
    if (modal?.type !== "delete") return;
    setDeleteError("");
    try {
      await adminDeleteCompany(modal.company.id);
      setModal(null);
      await load();
    } catch {
      setDeleteError("Failed to delete. Please try again.");
    }
  }

  const MAX_DISPLAY = 12;
  const overLimit = companies.length > MAX_DISPLAY;

  return (
    <div className="min-h-screen bg-[#fbfaf7]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-black/[0.07] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <span className="font-title text-xl text-brand-900">Rill</span>
            <span className="ml-2 font-body text-sm text-ink-muted">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setModal({ type: "add" })}
              className="rounded-xl bg-[#5160c8] px-5 py-2 font-body text-sm font-medium text-white transition hover:bg-[#3d4eb8]"
            >
              + Add company
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-black/15 px-4 py-2 font-body text-sm text-ink-muted transition hover:bg-surface"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* ── Stats banner ── */}
        <div className="mb-8 flex items-center gap-6">
          <div className="rounded-2xl border border-black/[0.07] bg-white px-6 py-4 shadow-glass">
            <p className="font-body text-xs uppercase tracking-[0.12em] text-ink-muted">
              Total companies
            </p>
            <p className="mt-1 font-heading text-3xl text-ink">{companies.length}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.07] bg-white px-6 py-4 shadow-glass">
            <p className="font-body text-xs uppercase tracking-[0.12em] text-ink-muted">
              Displayed on site
            </p>
            <p className="mt-1 font-heading text-3xl text-ink">
              {Math.min(companies.length, MAX_DISPLAY)}
            </p>
          </div>
          {overLimit && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
              <p className="font-body text-xs text-amber-700">
                You have more than {MAX_DISPLAY} companies. Section 3 will randomly
                display {MAX_DISPLAY} on each page load.
              </p>
            </div>
          )}
        </div>

        {/* ── Company list ── */}
        {loading ? (
          <p className="font-body text-sm text-ink-muted">Loading…</p>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/20 py-20 text-center">
            <p className="font-body text-sm text-ink-muted">
              No companies yet.{" "}
              <button
                onClick={() => setModal({ type: "add" })}
                className="text-[#5160c8] underline"
              >
                Add your first one.
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-glass"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    {c.stage && (
                      <span className="font-code text-[11px] uppercase tracking-[0.15em] text-[#5160c8]">
                        {c.stage}
                      </span>
                    )}
                    <h3 className="mt-1 font-heading text-lg font-medium text-ink">
                      {c.name}
                    </h3>
                  </div>
                  {c.category && (
                    <span className="shrink-0 rounded-pill border border-black/15 px-3 py-0.5 font-code text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                      {c.category}
                    </span>
                  )}
                </div>

                {c.description && (
                  <p className="mb-3 line-clamp-2 font-body text-xs leading-relaxed text-ink-muted">
                    {c.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-ink-muted/60">
                  <span>{c.roles.length} role{c.roles.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{c.team.length} member{c.team.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="mt-4 flex gap-2 border-t border-black/[0.06] pt-4">
                  <button
                    onClick={() => setModal({ type: "edit", company: c })}
                    className="flex-1 rounded-lg border border-black/15 py-1.5 font-body text-xs text-ink-muted transition hover:bg-surface"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setModal({ type: "delete", company: c })}
                    className="flex-1 rounded-lg border border-red-200 py-1.5 font-body text-xs text-red-500 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Add modal ── */}
      {modal?.type === "add" && (
        <ModalShell title="Add company" onClose={() => setModal(null)}>
          <CompanyForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </ModalShell>
      )}

      {/* ── Edit modal ── */}
      {modal?.type === "edit" && (
        <ModalShell title="Edit company" onClose={() => setModal(null)}>
          <CompanyForm
            initial={modal.company}
            onSave={handleUpdate}
            onCancel={() => setModal(null)}
          />
        </ModalShell>
      )}

      {/* ── Delete confirm modal ── */}
      {modal?.type === "delete" && (
        <ModalShell title="Delete company" onClose={() => setModal(null)}>
          <p className="font-body text-sm text-ink-muted">
            Are you sure you want to delete{" "}
            <strong className="text-ink">{modal.company.name}</strong>? This cannot
            be undone.
          </p>
          {deleteError && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 font-body text-xs text-red-600">
              {deleteError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              className="rounded-xl border border-black/15 px-5 py-2.5 font-body text-sm text-ink-muted transition hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-xl bg-red-500 px-6 py-2.5 font-body text-sm font-medium text-white transition hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ── Shared modal shell ──────────────────────────────────────────────────────

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-black/[0.07] bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-xl font-medium text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AdminDashboard;
