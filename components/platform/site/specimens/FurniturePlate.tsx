import type { ComponentType } from "react";

// ---------------------------------------------------------------
// Furniture "plates": line elevations in the manner of an architect's
// drawing, used where a specimen storefront shows product photography.
// Every colour is a semantic --sf-* role, so a plate re-colours with the
// palette it sits in (Linen, Stone, Charcoal, Light, Soft grey) — the
// same mechanism a real storefront uses. Purely decorative: always
// aria-hidden; the surrounding specimen carries the description.
// ---------------------------------------------------------------

export type PlateKind = "sofa" | "armchair" | "table" | "bed" | "desk" | "wardrobe" | "shelf" | "lamp";
export type PlateRatio = "4:5" | "1:1" | "16:10";

const VIEW_BOXES: Record<PlateRatio, string> = {
  "4:5": "0 -28 160 200",
  "1:1": "0 12 160 160",
  "16:10": "-40 22 240 150",
};

const line = {
  fill: "var(--sf-surface-elevated)",
  stroke: "var(--sf-foreground)",
  strokeWidth: 1,
  vectorEffect: "non-scaling-stroke",
  strokeLinejoin: "round",
} as const;
const accentFill = { fill: "var(--sf-accent)", fillOpacity: 0.5, stroke: "var(--sf-foreground)", strokeWidth: 1, vectorEffect: "non-scaling-stroke" } as const;
const stroke = { fill: "none", stroke: "var(--sf-foreground)", strokeWidth: 1, vectorEffect: "non-scaling-stroke", strokeLinecap: "round" } as const;

function Sofa() {
  return (
    <g>
      <rect x="29" y="140" width="3" height="10" {...line} />
      <rect x="128" y="140" width="3" height="10" {...line} />
      <rect x="30" y="92" width="100" height="32" rx="6" {...line} />
      <rect x="22" y="116" width="116" height="26" rx="3" {...line} />
      <rect x="34" y="111" width="45" height="11" rx="3" {...line} />
      <rect x="81" y="111" width="45" height="11" rx="3" {...line} />
      <rect x="14" y="104" width="18" height="38" rx="5" {...line} />
      <rect x="128" y="104" width="18" height="38" rx="5" {...line} />
      <rect x="98" y="96" width="22" height="16" rx="5" {...accentFill} />
    </g>
  );
}

function Armchair() {
  return (
    <g>
      <path d="M50 136 L45 150 M110 136 L115 150" {...stroke} />
      <rect x="52" y="84" width="56" height="46" rx="12" {...line} />
      <rect x="46" y="118" width="68" height="18" rx="4" {...line} />
      <rect x="40" y="106" width="13" height="30" rx="4" {...line} />
      <rect x="107" y="106" width="13" height="30" rx="4" {...line} />
      <rect x="66" y="98" width="28" height="18" rx="6" {...accentFill} />
    </g>
  );
}

function Table() {
  return (
    <g>
      <rect x="34" y="129" width="4" height="21" {...line} />
      <rect x="122" y="129" width="4" height="21" {...line} />
      <path d="M38 142 H122" {...stroke} />
      <rect x="26" y="124" width="108" height="5" rx="1" {...line} />
      <path d="M68 124 C64 113 66 105 72 101 L72 96 L78 96 L78 101 C84 105 86 113 82 124 Z" {...accentFill} />
      <path d="M75 96 C73 86 66 80 60 78 M75 96 C78 86 86 82 92 82" {...stroke} />
      <rect x="96" y="118" width="26" height="6" {...line} />
      <rect x="99" y="113" width="20" height="5" {...line} />
    </g>
  );
}

function Bed() {
  return (
    <g>
      <rect x="22" y="144" width="3" height="6" {...line} />
      <rect x="135" y="144" width="3" height="6" {...line} />
      <rect x="28" y="84" width="104" height="50" rx="4" {...line} />
      <rect x="18" y="136" width="124" height="8" rx="1" {...line} />
      <rect x="20" y="121" width="120" height="16" rx="3" {...line} />
      <rect x="34" y="109" width="38" height="13" rx="5" {...line} />
      <rect x="88" y="109" width="38" height="13" rx="5" {...line} />
      <rect x="96" y="121" width="44" height="16" rx="2" {...accentFill} />
    </g>
  );
}

function Desk() {
  return (
    <g>
      <rect x="28" y="113" width="3" height="37" {...line} />
      <rect x="129" y="113" width="3" height="37" {...line} />
      <rect x="96" y="113" width="33" height="15" {...line} />
      <path d="M106 120.5 H119" {...stroke} />
      <rect x="22" y="108" width="116" height="5" {...line} />
      <path d="M40 108 L46 84 L58 78" {...stroke} />
      <ellipse cx="40" cy="107" rx="7" ry="1.6" {...line} />
      <path d="M54 72 L68 78 L60 88 Z" {...accentFill} />
      <rect x="78" y="98" width="20" height="10" {...line} />
    </g>
  );
}

function Wardrobe() {
  return (
    <g>
      <rect x="47" y="143" width="66" height="7" {...line} />
      <rect x="42" y="40" width="76" height="104" rx="2" {...line} />
      <path d="M80 44 V140 M76 86 V98 M84 86 V98" {...stroke} />
      <rect x="54" y="28" width="22" height="12" {...accentFill} />
    </g>
  );
}

function Shelf() {
  return (
    <g>
      <rect x="36" y="60" width="88" height="90" {...line} />
      <path d="M65.3 60 V150 M94.6 60 V150 M36 90 H124 M36 120 H124" {...stroke} />
      <rect x="40" y="96" width="21" height="24" {...accentFill} />
      <rect x="99" y="126" width="21" height="24" {...accentFill} />
      <path d="M70 90 V72 M74 90 V70 M78 90 V74 M82 90 V71" {...stroke} />
      <path d="M108 120 C104 114 105 107 109 104 L109 100 L113 100 L113 104 C117 107 118 114 114 120 Z" {...line} />
    </g>
  );
}

function Lamp() {
  return (
    <g>
      <ellipse cx="80" cy="148" rx="15" ry="3" {...line} />
      <path d="M80 147 V62" {...stroke} />
      <path d="M60 62 L100 62 L91 38 L69 38 Z" {...accentFill} />
    </g>
  );
}

const PLATES: Record<PlateKind, ComponentType> = {
  sofa: Sofa,
  armchair: Armchair,
  table: Table,
  bed: Bed,
  desk: Desk,
  wardrobe: Wardrobe,
  shelf: Shelf,
  lamp: Lamp,
};

/**
 * One furniture plate filling its box (object-fit: cover semantics through
 * preserveAspectRatio "slice"). `arch` adds a softly drawn arched opening
 * behind the piece — the hero composition.
 */
export function FurniturePlate({
  kind,
  ratio = "4:5",
  arch = false,
  className = "",
}: {
  kind: PlateKind;
  ratio?: PlateRatio;
  arch?: boolean;
  className?: string;
}) {
  const Plate = PLATES[kind];
  return (
    <svg
      viewBox={VIEW_BOXES[ratio]}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
      className={`block bg-muted ${className}`}
    >
      <rect x="-120" y="-60" width="400" height="210" fill="var(--sf-muted)" />
      <rect x="-120" y="150" width="400" height="80" fill="var(--sf-surface)" />
      <path d="M-120 150 H280" {...stroke} strokeOpacity={0.35} />
      {arch && (
        <path
          d="M34 150 V74 A46 46 0 0 1 126 74 V150"
          fill="var(--sf-surface-elevated)"
          fillOpacity={0.55}
          stroke="var(--sf-border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <ellipse cx="80" cy="150" rx="64" ry="2.4" fill="var(--sf-foreground)" fillOpacity={0.08} />
      <Plate />
    </svg>
  );
}
