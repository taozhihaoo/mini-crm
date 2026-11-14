/**
 * Dates follow the active UI language; monetary amounts keep their own currency locale.
 * Reads the same sources as the i18n provider so the first render is already correct
 * (`documentElement.lang` is only updated in an effect, i.e. after that render).
 */
function dateLocale(): string {
  if (typeof window === "undefined") return "en-US";
  const query = new URLSearchParams(window.location.search).get("lang");
  const stored = window.localStorage.getItem("cf_lang");
  const lang = query === "zh" || query === "en" ? query : stored === "zh" ? "zh" : "en";
  return lang === "zh" ? "zh-CN" : "en-US";
}

export function formatMoney(value: string | number, currency = "USD"): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(dateLocale(), { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(dateLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
