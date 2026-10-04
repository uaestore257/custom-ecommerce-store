/**
 * The agency's brand lockup, from Agency settings. With a logo image the
 * artwork is shown as-is — height-constrained, never cropped, rounded or
 * boxed — and the name is set beside it unless the logo already contains
 * it. Without one, a monogram mark in a softly rounded container (the same
 * 6px radius as the site's buttons) stands in. Plain markup, so it works
 * in server and client components alike.
 */
export function AgencyLogo({
  name,
  logoUrl,
  logoIsWordmark = false,
  size = "md",
}: {
  name: string;
  logoUrl?: string;
  logoIsWordmark?: boolean;
  size?: "md" | "lg";
}) {
  const nameClass = size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl";
  return (
    <span className="flex min-w-0 items-center gap-3">
      {logoUrl ? (
        // A plain <img>: the logo URL is set in Agency settings and may be on any https host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={logoIsWordmark ? name : ""}
          decoding="async"
          className={`block w-auto shrink-0 object-contain ${size === "lg" ? "h-12 max-w-[16rem]" : "h-8 max-w-[11rem]"}`}
        />
      ) : (
        <span
          aria-hidden
          className={`grid shrink-0 place-items-center rounded-md border border-accent/45 bg-accent/10 font-heading leading-none text-accent transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground ${
            size === "lg" ? "h-12 w-12 text-3xl" : "h-9 w-9 text-xl"
          }`}
        >
          <span className="translate-y-[-0.04em]">{name.trim().charAt(0).toUpperCase() || "A"}</span>
        </span>
      )}
      {!(logoUrl && logoIsWordmark) && (
        <span className={`truncate font-heading leading-none tracking-tight rtl:tracking-normal ${nameClass}`}>{name}</span>
      )}
    </span>
  );
}
