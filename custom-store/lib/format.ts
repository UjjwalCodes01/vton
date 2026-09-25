export const count = (n: number) => Number(n || 0).toLocaleString("en-US");

const SYMBOL: Record<string, string> = { INR: "₹", USD: "$" };
export const money = (amount: number, currency: string) =>
  `${SYMBOL[currency] ?? ""}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export const day = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

export function timeAgo(value: string | Date | null | undefined) {
  const then = new Date(value ?? "").getTime();
  if (Number.isNaN(then)) return "";
  let amount = Math.round((Date.now() - then) / 1000);
  let unit = "s";
  for (const [size, label] of [[60, "m"], [60, "h"], [24, "d"], [7, "w"]] as const) {
    if (Math.abs(amount) < size) break;
    amount = Math.round(amount / size);
    unit = label;
  }
  return `${amount}${unit} ago`;
}

export const percent = (used: number, of: number) => (of ? Math.min(100, Math.round((used / of) * 100)) : 0);
