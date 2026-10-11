export type DateRangePreset =
  | "this-month"
  | "last-7-days"
  | "last-month"
  | "this-year";

export const DEFAULT_PRESET: DateRangePreset = "this-month";

export const DATE_PRESETS: ReadonlyArray<{
  value: DateRangePreset;
  label: string;
}> = [
  { value: "this-month", label: "This Month" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
];

export interface DateRange {
  start: string;
  end: string;
}

export function isDateRangePreset(value: unknown): value is DateRangePreset {
  return DATE_PRESETS.some((preset) => preset.value === value);
}

export function getPresetLabel(preset: DateRangePreset): string {
  return DATE_PRESETS.find((item) => item.value === preset)?.label ?? "This Month";
}

export function computePresetRange(
  preset: DateRangePreset,
  today: Date = new Date(),
): DateRange {
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  switch (preset) {
    case "last-7-days": {
      const start = new Date(current);
      start.setDate(current.getDate() - 6);
      return { start: toIsoDate(start), end: toIsoDate(current) };
    }
    case "last-month": {
      const start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      const end = new Date(current.getFullYear(), current.getMonth(), 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case "this-year": {
      const start = new Date(current.getFullYear(), 0, 1);
      return { start: toIsoDate(start), end: toIsoDate(current) };
    }
    case "this-month":
    default: {
      const start = new Date(current.getFullYear(), current.getMonth(), 1);
      return { start: toIsoDate(start), end: toIsoDate(current) };
    }
  }
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
