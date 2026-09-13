/** Local calendar-date arithmetic on "YYYY-MM-DD" keys — shared by the background worker, the
 *  options UI, and the taper bridge so this logic exists in exactly one, tested place. */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return toLocalDateKey(new Date(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
}

/** `count` consecutive date keys starting at `startDateKey`, inclusive. */
export function dateKeyRange(startDateKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToDateKey(startDateKey, i));
}
