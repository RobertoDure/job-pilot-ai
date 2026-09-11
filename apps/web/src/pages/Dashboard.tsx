import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../AppContext';
import JobCard from '../components/JobCard';
import { Badge, Card, ScoreBar, StatCard } from '../components/ui';
import { formatRange } from '../lib';
import type { PipelineResult } from '../types';

export default function Dashboard() {
  const { profile, summary } = useApp();
  const [digest, setDigest] = useState<PipelineResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .digest()
      .then(setDigest)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!digest) return null;

  const s = digest.stats;

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-skyDark p-6 text-white shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{digest.greeting}</h1>
            <p className="mt-1 text-sm text-sky-200">Here is your personalised job-search command centre.</p>
          </div>
          <Link to="/matches" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm transition hover:bg-brand-skyLight">
            View all matches
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Discovered" value={s.discovered} sub="this week" />
        <StatCard label="Highly relevant" value={s.highlyRelevant} sub="for your profile" accent="text-brand-sky" />
        <StatCard label="Applied" value={s.applied} sub="applications" />
        <StatCard label="Interviews" value={s.interview} sub="scheduled" accent="text-brand-skyDark" />
        <StatCard label="Offers" value={s.offer} sub="received" accent="text-emerald-600" />
        <StatCard label="Response rate" value={s.responseRate + '%'} sub="of applications" accent="text-emerald-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{'\u26A1'} Top matches for today</h2>
            <Link to="/matches" className="text-sm font-semibold text-brand-sky hover:text-brand-skyDark">
              See all {s.discovered}
            </Link>
          </div>
          <div className="space-y-3">
            {digest.topMatches.map((m) => (
              <JobCard key={m.job.id} match={m} compact />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">{'\u{1F3AF}'} Your career profile</h2>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target roles</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(summary?.targetRoles || []).slice(0, 4).map((r) => (
                  <Badge key={r} tone="bg-brand-skyLight text-brand-navy">{r}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Best industries</div>
              <div className="mt-2 space-y-2">
                {(summary?.bestIndustries || []).map((ind) => (
                  <div key={ind.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{ind.name}</span>
                      <span className="font-semibold text-slate-900">{ind.score}%</span>
                    </div>
                    <ScoreBar value={ind.score} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommended salary</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {summary ? formatRange(summary.recommendedSalary.min, summary.recommendedSalary.max, summary.recommendedSalary.currency) : ''}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top skills</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(summary?.topSkills || []).slice(0, 8).map((sk) => (
                  <Badge key={sk} tone="bg-slate-100 text-slate-600">{sk}</Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
