import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Card, EmptyState, ScoreBar, Spinner } from '../components/ui';
import { formatRange } from '../lib';
import type { CareerInsight } from '../types';

function RateBar({ label, rate, count }: { label: string; rate: number; count: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-400">{count} applied &middot; <b className="text-slate-700">{rate}%</b> response</span>
      </div>
      <ScoreBar value={rate} />
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState<CareerInsight | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .insights()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load insights'));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Career insights</h1>
      <p className="mt-1 text-sm text-slate-500">
        JobPilot learns from your application outcomes and tells you what to do next.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Response rate</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-600">{data.responseRate}%</div>
          <div className="text-xs text-slate-400">across {data.applicationsCount} applications</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strongest market</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{data.strongestMarket}</div>
          <div className="text-xs text-slate-400">highest density of matches</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated market</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{data.marketSizeEstimate.toLocaleString()}</div>
          <div className="text-xs text-slate-400">live jobs in this scan</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salary range</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{formatRange(data.salaryRange.min, data.salaryRange.max, data.salaryRange.currency)}</div>
          <div className="text-xs text-slate-400">for your skill profile</div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-900">Response rate by role</h2>
          <div className="mt-4 space-y-3">
            {data.byRole.length ? (
              data.byRole.map((r) => <RateBar key={r.role} label={r.role} rate={r.responseRate} count={r.applications} />)
            ) : (
              <EmptyState icon={'\u{1F4CA}'} title="No data yet" body="Track a few applications to see which roles perform best." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-900">Response rate by industry</h2>
          <div className="mt-4 space-y-3">
            {data.byIndustry.length ? (
              data.byIndustry.map((r) => <RateBar key={r.industry} label={r.industry} rate={r.responseRate} count={r.applications} />)
            ) : (
              <EmptyState icon={'\u{1F3E2}'} title="No data yet" body="Track applications to reveal your best industries." />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-bold text-slate-900">Skills that would move the needle</h2>
        <p className="mt-1 text-sm text-slate-500">Adding these skills could raise your average match rate across relevant jobs.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.skillGapSuggestions.map((s) => (
            <div key={s.skill} className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-900">{s.skill}</div>
              <div className="mt-2 text-sm text-slate-500">
                {s.currentAvgMatch}% <span className="text-slate-300">{'\u2192'}</span> <b className="text-emerald-600">{s.projectedAvgMatch}%</b>
              </div>
              <div className="mt-1 text-xs font-semibold text-emerald-600">+{s.gain}% projected lift</div>
            </div>
          ))}
          {data.skillGapSuggestions.length === 0 ? (
            <div className="col-span-full text-sm text-slate-400">Your profile already covers the skills in demand for your target roles.</div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-bold text-slate-900">{'\u{1F9ED}'} What should you do next?</h2>
        <ul className="mt-3 space-y-2">
          {data.recommendations.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-slate-600">
              <span className="text-brand-sky">{'\u2192'}</span>
              {r}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}