import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { focusRing } from "../styles";

/** The empty frame at the end of the work: an invitation, not a fake project. */
export function NextStoreCard() {
  return (
    <Link
      href="/contact"
      data-reveal
      className={`studio-spotlight group relative flex min-h-72 flex-col justify-between overflow-hidden border border-dashed border-foreground/25 p-8 transition-colors duration-500 hover:border-accent sm:p-12 lg:min-h-80 ${focusRing}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground rtl:tracking-normal">Next</p>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <p className="max-w-3xl font-heading text-5xl leading-[0.98] tracking-tight sm:text-7xl rtl:tracking-normal">
          Your store <em className="text-accent">could be here</em>.
        </p>
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-foreground/30 transition-all duration-500 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground">
          <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
          <span className="sr-only">Start a project</span>
        </span>
      </div>
    </Link>
  );
}
