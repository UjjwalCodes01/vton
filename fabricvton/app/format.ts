// Dates are rendered on the server and then hydrated in the merchant's browser.
// Formatting with the runtime's default locale and time zone makes those two
// renders disagree (the server is UTC/en-US, the merchant may be en-IN/IST), and
// React then discards the server HTML and re-renders, which shows up as layout
// shift and a slower first paint in the admin's Web Vitals. Pinning both makes
// the output identical everywhere.

const DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDate = (value: string | Date) => DATE.format(new Date(value));
export const formatDateTime = (value: string | Date) =>
  `${DATE_TIME.format(new Date(value))} UTC`;
