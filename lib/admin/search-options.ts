export interface SearchOption {
  value: string;
  label: string;
}

export function filterSearchOptions<T extends SearchOption>(options: readonly T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...options];
  return options.filter(({ value, label }) =>
    `${label} ${value}`.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function toggleSelectedOption(selected: readonly string[], value: string, checked: boolean) {
  if (checked) return selected.includes(value) ? [...selected] : [...selected, value];
  return selected.filter((item) => item !== value);
}

export function moveOptionIndex(index: number, count: number, direction: -1 | 1) {
  if (!count) return 0;
  return (index + direction + count) % count;
}
