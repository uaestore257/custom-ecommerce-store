"use client";

import { useMemo, useState } from "react";
import { filterSearchOptions } from "@/lib/admin/search-options";
import { inputClass } from "@/components/ui";

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction: "LTR" | "RTL";
}

export function SearchableLanguageList({
  id,
  options,
  selected,
  invalid = false,
  describedBy,
  onChange,
}: {
  id: string;
  options: LanguageOption[];
  selected: string[];
  invalid?: boolean;
  describedBy?: string;
  onChange: (code: string, checked: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const searchOptions = useMemo(
    () =>
      options.map((language) => ({
        value: language.code,
        label: `${language.name} ${language.nativeName}`,
        language,
      })),
    [options],
  );
  const filtered = filterSearchOptions(searchOptions, query);

  return (
    <div>
      <label className="sr-only" htmlFor={`${id}-search`}>Search available languages</label>
      <input
        id={`${id}-search`}
        type="search"
        autoComplete="off"
        placeholder="Search languages…"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`${inputClass(invalid)} mb-3`}
      />
      <p className="mb-2 text-xs text-slate-500" aria-live="polite">
        {filtered.length} of {options.length} languages; {selected.length} selected.
      </p>
      {filtered.length ? (
        <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ language }) => (
            <label
              key={language.code}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                id={`${id}-${language.code}`}
                type="checkbox"
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                className="h-4 w-4 accent-teal-700"
                checked={selected.includes(language.code)}
                onChange={(event) => onChange(language.code, event.target.checked)}
              />
              <span>
                {language.name}
                {language.nativeName !== language.name && ` — ${language.nativeName}`}
                {language.direction === "RTL" && (
                  <span className="ml-1 text-xs text-slate-500">(right-to-left)</span>
                )}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
          No matching languages.
        </p>
      )}
    </div>
  );
}
