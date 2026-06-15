import type { CSSProperties, MouseEventHandler } from "react";
import { cn } from "../lib/cn";

export interface CompanyCardProps {
  /** Funding stage label, top-left (e.g. "Series A"). */
  stage?: string;
  /** Category tag shown in the pill, top-right (e.g. "Software"). */
  category?: string;
  /** Company name (the card headline). */
  name?: string;
  /** One- to two-line summary under the name. */
  description?: string;
  /** Longer fine-print blurb under the summary. */
  details?: string;
  className?: string;
  /** Inline styles on the root (used to place the card on the 3D sphere). */
  style?: CSSProperties;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
}

/**
 * A single company "card" for the integrations sphere / listings — a white
 * glass-ish panel with a funding-stage label, a category pill, the company
 * name, a short description, and a fine-print blurb. Props default to lorem
 * placeholders so it renders on its own (see CardPreviewSection); real data is
 * passed in once it's wired into Section 3's sphere tiles.
 */
export function CompanyCard({
  stage = "Series A",
  category = "Software",
  name = "Company name",
  description = "Company description lorem ipsum Company description lorem ipsum",
  details = "Company description lorem ipsum Company description lorem ipsum" +
    "Company description lorem ipsumCompany description lorem ipsum",
  className,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: CompanyCardProps) {
  return (
    <article
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={cn(
        "relative w-full max-w-[420px] rounded-[24px] border border-black/[0.06] bg-white p-7 shadow-glass",
        className,
      )}
    >
      {/* Stage label + category pill */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-code text-[13px] font-medium uppercase tracking-[0.18em] text-[#5160c8]">
          {stage}
        </span>
        <span className="shrink-0 rounded-pill border border-black/15 px-3.5 py-1 font-code text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
          {category}
        </span>
      </div>

      {/* Company name */}
      <h3 className="mt-6 font-heading text-[30px] font-medium leading-tight text-ink">
        {name}
      </h3>

      {/* Short summary */}
      <p className="mt-3 font-heading text-[17px] font-normal leading-snug text-ink-muted">
        {description}
      </p>

      {/* Fine print */}
      <p className="mt-4 font-body text-[13px] leading-relaxed text-ink-muted/70">
        {details}
      </p>
    </article>
  );
}

export default CompanyCard;
