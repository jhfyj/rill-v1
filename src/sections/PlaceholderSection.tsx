interface PlaceholderSectionProps {
  index: number;
  label: string;
}

/** Stub for sections 2-4 until they're built out. Fills the viewport. */
export function PlaceholderSection({ index, label }: PlaceholderSectionProps) {
  return (
    <section className="flex h-full w-full flex-col items-center justify-center bg-surface">
      <span className="font-body text-sm uppercase tracking-[0.3em] text-ink-muted">
        Section {index + 1}
      </span>
      <h2 className="mt-3 font-title text-5xl text-brand-900 sm:text-6xl">{label}</h2>
    </section>
  );
}

export default PlaceholderSection;
