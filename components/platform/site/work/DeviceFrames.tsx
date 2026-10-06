import Image, { type StaticImageData } from "next/image";

// Frames for real storefront screenshots. The frame chrome uses the
// surrounding studio tokens; the screenshot is the store exactly as
// captured. Alt text describes the store, not the frame.

/**
 * A browser window showing a tall homepage screenshot that slowly scrolls
 * inside the frame on hover or keyboard focus of the surrounding .group
 * (globals.css .studio-pan; off under reduced motion).
 */
export function BrowserShot({
  image,
  alt,
  host,
  priority = false,
  sizes = "(min-width: 1024px) 58vw, 100vw",
  className = "",
}: {
  image: StaticImageData | string;
  alt: string;
  host?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden border border-white/10 bg-[#1b1a18] shadow-[0_40px_120px_-40px_rgb(0_0_0/0.8)] ${className}`}>
      <div className="flex h-8 items-center gap-3 border-b border-white/10 px-3" dir="ltr">
        <span aria-hidden className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
        </span>
        {host && (
          <span className="mx-auto max-w-[60%] truncate rounded-sm bg-white/[0.06] px-3 py-0.5 font-mono text-[10px] text-white/55">{host}</span>
        )}
      </div>
      <div className="studio-pan relative aspect-[16/10] overflow-hidden bg-white">
        <Image
          src={image}
          alt={alt}
          width={typeof image === "string" ? 1440 : undefined}
          height={typeof image === "string" ? 1380 : undefined}
          sizes={sizes}
          priority={priority}
          placeholder={typeof image === "string" ? "empty" : "blur"}
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

/** A phone showing a mobile screenshot (first viewport). */
export function PhoneShot({
  image,
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 16vw, 40vw",
  className = "",
}: {
  image: StaticImageData | string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-[2rem] border border-white/15 bg-[#0b0a09] p-1.5 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.85)] ${className}`}>
      <div className="relative aspect-[390/800] overflow-hidden rounded-[1.6rem] bg-white">
        <Image
          src={image}
          alt={alt}
          width={typeof image === "string" ? 390 : undefined}
          height={typeof image === "string" ? 844 : undefined}
          sizes={sizes}
          priority={priority}
          placeholder={typeof image === "string" ? "empty" : "blur"}
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
