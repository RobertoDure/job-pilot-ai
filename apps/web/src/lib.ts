export function formatCurrency(value: number, currency = 'EUR'): string {
  const symbol = currency === 'GBP' ? '\u00a3' : currency === 'USD' ? '$' : '\u20ac';
  return symbol + Math.round(value).toLocaleString('en-IE');
}

export function formatRange(min: number, max: number, currency = 'EUR'): string {
  if (max <= 0) return 'Salary not disclosed';
  return formatCurrency(min, currency) + ' - ' + formatCurrency(max, currency);
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return days + ' days ago';
  if (days < 365) return Math.floor(days / 30) + ' months ago';
  return Math.floor(days / 365) + 'y ago';
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 62) return 'text-amber-600';
  return 'text-rose-600';
}

export function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 62) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function recommendationTone(rec: string): string {
  if (rec === 'APPLY') return 'bg-emerald-100 text-emerald-700';
  if (rec === 'CONSIDER') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

export const STATUS_META: Record<string, { label: string; dot: string; chip: string }> = {
  recommended: { label: 'Recommended', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  applied: { label: 'Applied', dot: 'bg-brand-skyDark', chip: 'bg-brand-skyLight text-brand-navy ring-brand-sky/30' },
  interview: { label: 'Interview', dot: 'bg-brand-sky', chip: 'bg-brand-skyLight text-brand-navy ring-brand-sky/30' },
  offer: { label: 'Offer', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Rejected', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200' },
  no_response: { label: 'No response', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}