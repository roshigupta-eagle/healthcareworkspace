/**
 * Lightweight class-name merger.
 * Filters falsy values and joins remaining strings with a single space.
 * No external dependency required — compatible with Tailwind v4.
 */
export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(' ');
}
