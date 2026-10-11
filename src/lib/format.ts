const numberFormatter = new Intl.NumberFormat("en-US");
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return `Rp ${compactFormatter.format(value)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

export function formatDate(isoDate: string): string {
  return dayFormatter.format(toLocalDate(isoDate));
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return `${dayFormatter.format(date)}, ${date.getFullYear()} · ${timeFormatter.format(date)}`;
}

export function formatDateRange(startIsoDate: string, endIsoDate: string): string {
  const start = toLocalDate(startIsoDate);
  const end = toLocalDate(endIsoDate);
  const startLabel = dayFormatter.format(start);
  const endLabel = dayFormatter.format(end);

  if (start.getFullYear() === end.getFullYear()) {
    return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
  }

  return `${startLabel}, ${start.getFullYear()} – ${endLabel}, ${end.getFullYear()}`;
}

function toLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
