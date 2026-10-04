"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { getTemplateDefinition, TEMPLATE_KEYS, type TemplateKey } from "@/lib/templates/registry";
import { describeSpecimen, resolveSpecimenPalette, SpecimenFrame, SpecimenScreen, type SpecimenDirection } from "./specimens/TemplateSpecimen";
import { SPECIMEN_VIEW_LABELS, SPECIMEN_VIEWS, type SpecimenView } from "./specimens/types";
import { focusRing } from "./styles";

type Device = "browser" | "phone";

/**
 * Lets a visitor compare the templates directly: template, page, palette,
 * width and writing direction. Every option comes from the registered
 * template definitions; the stage is a scrollable specimen painted by the
 * template's own tokens. Controls are native radio groups (arrow keys move
 * within a group), so the explorer needs no custom keyboard handling.
 */
export function TemplateExplorer({
  initialTemplate = "atelier",
  demoUrls,
}: {
  initialTemplate?: TemplateKey;
  /** Live demo homepage per template, when the platform has one. */
  demoUrls: Partial<Record<TemplateKey, string>>;
}) {
  const [template, setTemplate] = useState<TemplateKey>(initialTemplate);
  const [palette, setPalette] = useState<string>(() => resolveSpecimenPalette(initialTemplate, undefined).key);
  const [view, setView] = useState<SpecimenView>("home");
  const [device, setDevice] = useState<Device>("browser");
  const [direction, setDirection] = useState<SpecimenDirection>("ltr");
  const definition = getTemplateDefinition(template);
  const palettes = Object.entries(definition.theme.palettes);
  const settings = { template, palette, view, direction };
  const description = describeSpecimen(settings);
  const demoUrl = demoUrls[template];

  const chooseTemplate = (key: TemplateKey) => {
    setTemplate(key);
    setPalette(resolveSpecimenPalette(key, undefined).key);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="space-y-7 lg:col-span-3">
        <Choice
          legend="Template"
          value={template}
          onChange={(value) => chooseTemplate(value as TemplateKey)}
          options={TEMPLATE_KEYS.map((key) => ({ value: key, label: getTemplateDefinition(key).manifest.name }))}
        />
        <Choice
          legend="Page"
          value={view}
          onChange={(value) => setView(value as SpecimenView)}
          options={SPECIMEN_VIEWS.map((key) => ({ value: key, label: SPECIMEN_VIEW_LABELS[key] }))}
        />
        <Choice
          legend="Palette"
          value={palette}
          onChange={setPalette}
          options={palettes.map(([key, entry]) => ({
            value: key,
            label: entry.label,
            swatch: [entry.tokens.background, entry.tokens.foreground],
          }))}
        />
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-1 lg:gap-7">
          <Choice
            legend="Width"
            value={device}
            onChange={(value) => setDevice(value as Device)}
            options={[
              { value: "browser", label: "Desktop" },
              { value: "phone", label: "Phone" },
            ]}
          />
          <Choice
            legend="Direction"
            value={direction}
            onChange={(value) => setDirection(value as SpecimenDirection)}
            options={[
              { value: "ltr", label: "LTR" },
              { value: "rtl", label: <>RTL <span lang="ar">· عربي</span></> },
            ]}
          />
        </div>
      </div>

      <div className="min-w-0 lg:col-span-9">
        <div className={device === "phone" ? "mx-auto w-full max-w-[19rem]" : ""}>
          <SpecimenFrame device={device} caption={`${definition.manifest.name} · ${definition.theme.palettes[palette]?.label ?? ""} · ${SPECIMEN_VIEW_LABELS[view]}`}>
            <div
              role="region"
              aria-label={`${description} Scroll inside to explore.`}
              tabIndex={0}
              className={`overflow-y-auto overscroll-contain [scrollbar-width:thin] ${focusRing} ${
                device === "phone" ? "h-full" : "h-[28rem] sm:h-[34rem] lg:h-[38rem]"
              }`}
            >
              <SpecimenScreen {...settings} className="min-h-full" />
            </div>
          </SpecimenFrame>
        </div>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground" aria-live="polite">
            {description}
            {direction === "rtl" && " Store content is Arabic; the template's interface labels are English today."}
          </p>
          {demoUrl && (
            <a href={demoUrl} target="_blank" rel="noopener" className={`group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium underline decoration-foreground/30 underline-offset-[6px] hover:decoration-foreground ${focusRing}`}>
              Open the live {definition.manifest.name} demo
              <span className="sr-only"> (opens in a new tab)</span>
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Choice({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: string;
  options: { value: string; label: ReactNode; swatch?: [string, string] }[];
  onChange: (value: string) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground rtl:tracking-normal">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 border border-border px-3.5 text-sm transition-colors hover:border-foreground has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.swatch && (
              <span aria-hidden className="flex h-3.5 w-3.5 shrink-0 overflow-hidden ring-1 ring-current/30">
                <span className="w-1/2" style={{ backgroundColor: option.swatch[0] }} />
                <span className="w-1/2" style={{ backgroundColor: option.swatch[1] }} />
              </span>
            )}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
