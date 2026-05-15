// Helpers to format large numbers in cookie-clicker style.
export function formatKi(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) {
    return abs < 10 ? value.toFixed(1).replace(/\.0$/, "") : Math.floor(value).toString();
  }
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const tier = Math.min(Math.floor(Math.log10(abs) / 3), units.length);
  const scaled = value / Math.pow(1000, tier);
  return `${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${units[tier - 1] ?? ""}`;
}

export function formatRate(value: number): string {
  if (!value) return "0/s";
  return `${formatKi(value)}/s`;
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
