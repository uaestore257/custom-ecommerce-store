"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { inputClass } from "@/components/ui";
import { filterSearchOptions, moveOptionIndex, type SearchOption } from "@/lib/admin/search-options";

export function SearchableSelect({
  id,
  label,
  value,
  options,
  placeholder,
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: SearchOption[];
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listbox = useRef<HTMLDivElement>(null);
  const filteredOptions = useMemo(() => filterSearchOptions(options, query), [options, query]);

  useEffect(() => {
    if (!open) return;
    listbox.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  function openOptions() {
    setQuery("");
    setActiveIndex(Math.max(0, filteredOptions.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function choose(option: SearchOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openOptions();
        return;
      }
      if (filteredOptions.length) {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((index) => moveOptionIndex(index, filteredOptions.length, direction));
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!open || !filteredOptions.length) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : filteredOptions.length - 1);
      return;
    }
    if (event.key === "Enter" && open && filteredOptions.length) {
      event.preventDefault();
      choose(filteredOptions[activeIndex] ?? filteredOptions[0]);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const activeOption = open ? filteredOptions[activeIndex] : undefined;

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        placeholder={open || value ? "Search options…" : placeholder}
        value={open ? query : selected?.label ?? ""}
        onFocus={openOptions}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={`${inputClass(invalid)} disabled:bg-slate-100 disabled:text-slate-500`}
      />
      <div
        id={`${id}-options`}
        ref={listbox}
        role="listbox"
        aria-label={`${label} options`}
        hidden={!open}
        className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        {filteredOptions.length ? (
          filteredOptions.map((option, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                id={`${id}-option-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                data-active={isActive || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                  isActive ? "bg-teal-50 text-teal-900" : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </div>
            );
          })
        ) : (
          <div role="option" aria-disabled="true" aria-selected="false" className="px-3 py-2 text-sm text-slate-500">
            No matching options.
          </div>
        )}
      </div>
    </div>
  );
}
