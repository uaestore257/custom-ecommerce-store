import { SERVICE_CATEGORIES } from "@/lib/platform/services";

/**
 * A slow ribbon of what the studio builds. The list is real text once for
 * assistive technology; the moving copy is decorative. Pauses on hover and
 * stands still under reduced motion.
 */
export function ServiceMarquee() {
  const labels = SERVICE_CATEGORIES.map((category) => category.title);
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {labels.map((label) => (
        <li key={label} className="flex items-center font-heading text-3xl italic text-foreground/80 sm:text-5xl">
          <span className="px-6 sm:px-10">{label}</span>
          <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-accent" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="What we build" className="studio-marquee overflow-hidden border-y border-border py-7 sm:py-9">
      <div className="studio-marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
