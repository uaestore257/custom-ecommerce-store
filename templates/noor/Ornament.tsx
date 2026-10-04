/**
 * Noor's one geometric ornament: a small eight-point star (two squares)
 * between two fine rules, used only as a section divider. Decorative.
 */
export function NoorOrnament({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-4 text-border ${className}`}>
      <span className="h-px w-16 bg-current sm:w-24" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.25">
        <rect x="5" y="5" width="14" height="14" />
        <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" />
      </svg>
      <span className="h-px w-16 bg-current sm:w-24" />
    </div>
  );
}
