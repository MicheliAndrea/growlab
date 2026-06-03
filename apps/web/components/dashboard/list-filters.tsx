"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterOption = {
  label: string;
  value: string;
};

export function uniqueFilterOptions(
  values: Array<string | null | undefined>,
  allLabel: string,
): FilterOption[] {
  const uniqueValues = Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort((first, second) => first.localeCompare(second));

  return [
    { label: allLabel, value: "all" },
    ...uniqueValues.map((value) => ({ label: value, value })),
  ];
}

export function ListFilterBar({
  children,
  hasActiveFilters = false,
  onReset,
  resultCount,
  totalCount,
}: {
  children: ReactNode;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {hasActiveFilters && onReset ? (
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onReset}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        ) : null}
        <div className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
          {resultCount} / {totalCount}
        </div>
      </div>
    </div>
  );
}

export function SearchFilter({
  value,
  onValueChange,
  placeholder,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        className="pl-8"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectFilter({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  label: string;
  className?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
