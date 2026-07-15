/**
 * Small date utilities for scheduling calendar
 */
export function isSameDay(dateA: string | Date | null | undefined, dateB: string | Date): boolean {
  if (!dateA || !dateB) return false;
  // Normalize strings of form YYYY-MM-DD to local midnight to avoid
  // timezone parsing differences between Node and browsers.
  const normalize = (v: string | Date) => {
    if (v instanceof Date) return v;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return parseISODate(v);
    }
    return new Date(v);
  };

  const d1 = normalize(dateA as any);
  const d2 = normalize(dateB as any);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateString: string): Date {
  // Accepts 'YYYY-MM-DD' or full ISO and returns Date at local midnight
  const parts = dateString.split("-");
  if (parts.length === 3 && dateString.length === 10) {
    const [y, m, d] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateString);
}
