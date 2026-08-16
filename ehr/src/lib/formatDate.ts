export function formatShortDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()] || '';
    return `${month} ${d.getDate()}`;
  } catch (e) {
    return iso.slice(0, 10);
  }
}

export function formatDateTimeConsistent(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = months[d.getMonth()] || '';
    const day = d.getDate();
    const year = d.getFullYear();
    let hour = d.getHours();
    const minute = d.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${month} ${day}, ${year}, ${hour}:${pad(minute)} ${ampm}`;
  } catch (e) {
    return iso;
  }
}

export function smallDateLabel(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
    // For items due today, show the time (e.g., "3:30 PM"); otherwise show a short date label
    if (diffDays === 0) {
      let hour = d.getHours();
      const minute = d.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return `${hour}:${pad(minute)} ${ampm}`;
    }
    return formatShortDate(iso);
  } catch (e) {
    return iso.slice(0, 10);
  }
}
