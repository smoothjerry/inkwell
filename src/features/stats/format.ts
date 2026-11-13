/** Formats a local 'YYYY-MM-DD' date, e.g. "Nov 9" or (with the year) "Nov 9, 2026". */
export function formatLocalDate(date: string, withYear = false): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
  });
}
