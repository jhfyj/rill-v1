import { Button } from "./Button";

interface Role {
  title: string;
  type: string;
}

interface Member {
  name: string;
  role: string;
  bio: string;
}

export interface CompanyDetailPanelProps {
  stage?: string;
  category?: string;
  name?: string;
  description?: string;
  details?: string;
  longer?: string;
  roles?: Role[];
  team?: Member[];
  /** Back-arrow handler — closes the panel. */
  onClose?: () => void;
}

const DEFAULT_ROLES: Role[] = [
  { title: "Data engineer", type: "full time" },
  { title: "Data engineer", type: "full time" },
];

const DEFAULT_TEAM: Member[] = [
  {
    name: "John Smith",
    role: "Founding engineer",
    bio: "Personal bio description personal description personal description",
  },
  {
    name: "John Smith",
    role: "Founding engineer",
    bio: "Personal bio description personal description personal description",
  },
];

/** Small blue mono section label (Open roles / Team). */
function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="font-code text-[12px] uppercase tracking-[0.18em] text-[#5160c8]">
      {children}
    </h3>
  );
}

/**
 * Expanded detail view for a company card — shown in the side panel that opens
 * beside the sphere (see FauxSphereSection). Mirrors CompanyCard's header, then
 * adds a longer description, an open-roles list (dotted leaders), and a team
 * grid. Props default to lorem placeholders so it renders standalone; real data
 * is passed in once cards carry it.
 */
export function CompanyDetailPanel({
  stage = "Series A",
  category = "Software",
  name = "Company name",
  description = "Company description lorem ipsum Company description lorem ipsum",
  details = "Company description lorem ipsum Company description lorem ipsum" +
    "Company description lorem ipsumCompany description lorem ipsum",
  longer = "Longer description",
  roles = DEFAULT_ROLES,
  team = DEFAULT_TEAM,
  onClose,
}: CompanyDetailPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Back arrow */}
      <div className="px-8 pt-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="text-ink-muted transition-colors hover:text-ink"
        >
          {/* IBM Carbon — ArrowLeft (32px) */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M14 26L15.41 24.59 7.83 17 28 17 28 15 7.83 15 15.41 7.41 14 6 4 16 14 26z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-12 pt-5">
        {/* Stage + category */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-code text-[13px] font-medium uppercase tracking-[0.18em] text-[#5160c8]">
            {stage}
          </span>
          <span className="shrink-0 rounded-pill border border-black/15 px-3.5 py-1 font-code text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
            {category}
          </span>
        </div>

        {/* Name + descriptions */}
        <h2 className="mt-6 font-heading text-[28px] font-medium leading-tight text-ink">
          {name}
        </h2>
        <p className="mt-3 font-heading text-[16px] font-normal leading-snug text-ink-muted">
          {description}
        </p>
        <p className="mt-4 font-body text-[13px] leading-relaxed text-ink-muted/70">
          {details}
        </p>
        <p className="mt-4 font-body text-[13px] leading-relaxed text-ink-muted">
          {longer}
        </p>

        {/* Open roles */}
        <div className="mt-9">
          <SectionLabel>Open roles</SectionLabel>
          <div className="mt-3">
            {roles.map((r, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 py-1.5 font-body text-sm text-ink"
              >
                <span>{r.title}</span>
                <span className="mb-1 flex-1 border-b border-dotted border-black/30" />
                <span className="text-ink-muted">{r.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mt-9">
          <SectionLabel>Team</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-5">
            {team.map((m, i) => (
              <div key={i}>
                <div className="aspect-square w-full rounded-lg bg-surface-muted" />
                <div className="mt-3 font-heading text-base text-ink">
                  {m.name}
                </div>
                <div className="font-body text-xs text-ink-muted">{m.role}</div>
                <p className="mt-2 font-body text-[11px] leading-relaxed text-ink-muted/70">
                  {m.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-10 text-center">
          <p className="font-body text-sm text-ink-muted">
            Interested in learning more?
          </p>
          <Button variant="primary" size="lg" className="mt-4">
            Get in touch
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CompanyDetailPanel;
