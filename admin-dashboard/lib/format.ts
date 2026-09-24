export const number = (n: number | null | undefined) => Number(n || 0).toLocaleString("en-US");

export function dateOnly(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value: string | Date | null | undefined) {
  const then = new Date(value ?? "").getTime();
  if (Number.isNaN(then)) return "—";
  let amount = Math.round((Date.now() - then) / 1000);
  let unit = "s";
  for (const [size, label] of [[60, "m"], [60, "h"], [24, "d"], [7, "w"], [4.4, "mo"]] as const) {
    if (Math.abs(amount) < size) break;
    amount = Math.round(amount / size);
    unit = label;
  }
  return `${amount}${unit} ago`;
}

export const percent = (used: number, of: number) => (of ? Math.min(100, Math.round((used / of) * 100)) : 0);
