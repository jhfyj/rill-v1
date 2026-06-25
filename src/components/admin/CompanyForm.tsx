import { useState } from "react";
import type { Company, Role, TeamMember } from "../../types/company";

interface CompanyFormProps {
  initial?: Partial<Company>;
  onSave: (data: Omit<Company, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: Omit<Company, "id" | "createdAt" | "updatedAt"> = {
  stage: "",
  category: "",
  name: "",
  description: "",
  details: "",
  longer: "",
  roles: [],
  team: [],
};

// Word count limits
const LIMITS = {
  description: { min: 5, max: 20 },
  details: { min: 10, max: 30 },
  longer: { min: 30, max: 120 },
} as const;

function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function WordCount({
  text,
  min,
  max,
}: {
  text: string;
  min: number;
  max: number;
}) {
  const count = wordCount(text);
  const over = count > max;
  const under = text.trim() !== "" && count < min;
  return (
    <span
      className={`ml-auto font-body text-[11px] ${
        over ? "text-red-500" : under ? "text-amber-500" : "text-ink-muted/50"
      }`}
    >
      {count} / {max} words
      {under && count > 0 ? ` (min ${min})` : ""}
    </span>
  );
}

export function CompanyForm({ initial, onSave, onCancel }: CompanyFormProps) {
  const [form, setForm] = useState<Omit<Company, "id" | "createdAt" | "updatedAt">>({
    ...EMPTY,
    ...initial,
    roles: initial?.roles ?? [],
    team: initial?.team ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Roles helpers ─────────────────────────────────────────────────────────
  function addRole() {
    set("roles", [...form.roles, { title: "", type: "" }]);
  }
  function updateRole(i: number, field: keyof Role, value: string) {
    const updated = form.roles.map((r, idx) =>
      idx === i ? { ...r, [field]: value } : r
    );
    set("roles", updated);
  }
  function removeRole(i: number) {
    set("roles", form.roles.filter((_, idx) => idx !== i));
  }

  // ── Team helpers ──────────────────────────────────────────────────────────
  function addMember() {
    set("team", [...form.team, { name: "", role: "", bio: "" }]);
  }
  function updateMember(i: number, field: keyof TeamMember, value: string) {
    const updated = form.team.map((m, idx) =>
      idx === i ? { ...m, [field]: value } : m
    );
    set("team", updated);
  }
  function removeMember(i: number) {
    set("team", form.team.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required.");
      return;
    }

    // Word count validation
    const checks: Array<[string, string, number, number]> = [
      ["Short Description", form.description, LIMITS.description.min, LIMITS.description.max],
      ["Card Text", form.details, LIMITS.details.min, LIMITS.details.max],
      ["Long Description", form.longer, LIMITS.longer.min, LIMITS.longer.max],
    ];
    for (const [label, text, min, max] of checks) {
      if (text.trim() === "") continue; // optional fields — skip if empty
      const wc = wordCount(text);
      if (wc < min) {
        setError(`${label} must be at least ${min} words (currently ${wc}).`);
        return;
      }
      if (wc > max) {
        setError(`${label} must be at most ${max} words (currently ${wc}).`);
        return;
      }
    }

    setError("");
    setSaving(true);
    try {
      await onSave(form);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-black/15 bg-surface px-4 py-2.5 font-body text-sm text-ink outline-none transition focus:border-[#5160c8] focus:ring-2 focus:ring-[#5160c8]/20";
  const labelCls =
    "mb-1 flex items-center gap-2 font-body text-xs uppercase tracking-[0.12em] text-ink-muted";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Core fields ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Stage</label>
          <input
            className={inputCls}
            placeholder="e.g. Series A"
            value={form.stage}
            onChange={(e) => set("stage", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input
            className={inputCls}
            placeholder="e.g. Software"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Company Name *</label>
        <input
          className={inputCls}
          placeholder="Acme Corp"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      {/* Short Description */}
      <div>
        <label className={labelCls}>
          Short Description
          <WordCount
            text={form.description}
            min={LIMITS.description.min}
            max={LIMITS.description.max}
          />
        </label>
        <textarea
          className={inputCls}
          rows={2}
          placeholder={`One- to two-line summary shown on the card (${LIMITS.description.min}–${LIMITS.description.max} words)`}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {/* Card Text (was "Details / fine print") */}
      <div>
        <label className={labelCls}>
          Card Text
          <span className="normal-case tracking-normal text-ink-muted/60">
            — shown on card only
          </span>
          <WordCount
            text={form.details}
            min={LIMITS.details.min}
            max={LIMITS.details.max}
          />
        </label>
        <textarea
          className={inputCls}
          rows={3}
          placeholder={`Fine-print blurb displayed on the company card (${LIMITS.details.min}–${LIMITS.details.max} words)`}
          value={form.details}
          onChange={(e) => set("details", e.target.value)}
        />
      </div>

      {/* Long Description (was "Extended Description") */}
      <div>
        <label className={labelCls}>
          Long Description
          <span className="normal-case tracking-normal text-ink-muted/60">
            — panel only
          </span>
          <WordCount
            text={form.longer}
            min={LIMITS.longer.min}
            max={LIMITS.longer.max}
          />
        </label>
        <textarea
          className={inputCls}
          rows={4}
          placeholder={`Full description shown in the side panel when a card is clicked (${LIMITS.longer.min}–${LIMITS.longer.max} words)`}
          value={form.longer}
          onChange={(e) => set("longer", e.target.value)}
        />
      </div>

      {/* ── Open Roles ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={labelCls + " mb-0"}>
            Open Roles
            <span className="normal-case tracking-normal text-ink-muted/60">
              — leave empty to hide on site
            </span>
          </span>
          <button
            type="button"
            onClick={addRole}
            className="rounded-lg border border-[#5160c8]/40 px-3 py-1 font-body text-xs text-[#5160c8] transition hover:bg-[#5160c8]/5"
          >
            + Add role
          </button>
        </div>
        {form.roles.length === 0 && (
          <p className="font-body text-xs text-ink-muted/60">No roles added — section will be hidden on the site.</p>
        )}
        {form.roles.map((r, i) => (
          <div key={i} className="mb-2 flex items-center gap-2">
            <input
              className={inputCls}
              placeholder="Role title"
              value={r.title}
              onChange={(e) => updateRole(i, "title", e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Type (e.g. full time)"
              value={r.type}
              onChange={(e) => updateRole(i, "type", e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeRole(i)}
              className="shrink-0 rounded-lg px-2 py-2 text-red-400 transition hover:bg-red-50"
              aria-label="Remove role"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Team ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={labelCls + " mb-0"}>
            Team Members
            <span className="normal-case tracking-normal text-ink-muted/60">
              — leave empty to hide on site
            </span>
          </span>
          <button
            type="button"
            onClick={addMember}
            className="rounded-lg border border-[#5160c8]/40 px-3 py-1 font-body text-xs text-[#5160c8] transition hover:bg-[#5160c8]/5"
          >
            + Add member
          </button>
        </div>
        {form.team.length === 0 && (
          <p className="font-body text-xs text-ink-muted/60">No members added — section will be hidden on the site.</p>
        )}
        {form.team.map((m, i) => (
          <div
            key={i}
            className="mb-3 rounded-xl border border-black/[0.07] bg-surface p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-body text-xs font-medium text-ink-muted">
                Member {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="rounded-lg px-2 py-1 text-xs text-red-400 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Name"
                value={m.name}
                onChange={(e) => updateMember(i, "name", e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Role (e.g. Founding Engineer)"
                value={m.role}
                onChange={(e) => updateMember(i, "role", e.target.value)}
              />
            </div>
            <textarea
              className={inputCls + " mt-2"}
              rows={2}
              placeholder="Short bio"
              value={m.bio}
              onChange={(e) => updateMember(i, "bio", e.target.value)}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 font-body text-xs text-red-600">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 border-t border-black/[0.07] pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-black/15 px-5 py-2.5 font-body text-sm text-ink-muted transition hover:bg-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#5160c8] px-6 py-2.5 font-body text-sm font-medium text-white transition hover:bg-[#3d4eb8] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save company"}
        </button>
      </div>
    </form>
  );
}

export default CompanyForm;
