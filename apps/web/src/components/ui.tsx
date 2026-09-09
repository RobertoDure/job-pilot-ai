import type { ReactNode } from 'react';
import { scoreBarColor } from '../lib';

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
    </div>
  );
}

export function ScoreBar({ value, className = '' }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={'h-2 w-full overflow-hidden rounded-full bg-slate-200 ' + className}>
      <div className={'h-full rounded-full ' + scoreBarColor(v)} style={{ width: v + '%' }} />
    </div>
  );
}

export function ScorePill({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 62 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className={'inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-bold text-white ' + color}>
      {value}%
    </span>
  );
}

export function Badge({ children, tone = 'bg-slate-100 text-slate-700' }: { children: ReactNode; tone?: string }) {
  return <span className={'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ' + tone}>{children}</span>;
}

export function StatCard({ label, value, sub, accent = 'text-slate-900' }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={'mt-1 text-2xl font-bold ' + accent}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-slate-500">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'rounded-2xl border border-slate-200 bg-white shadow-card ' + className}>{children}</div>;
}