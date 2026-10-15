export function withAllergyApiPreview(path: string): string {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return path;

  const current = new URLSearchParams(window.location.search);
  const asUser = current.get('asUser');
  if (asUser) return `${path}${path.includes('?') ? '&' : '?'}asUser=${encodeURIComponent(asUser)}`;
  if (['1', 'true'].includes(current.get('noauth') || '')) return `${path}${path.includes('?') ? '&' : '?'}noauth=1&asUser=dev`;
  return path;
}
