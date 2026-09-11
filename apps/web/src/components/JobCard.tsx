import { Link } from 'react-router-dom';
import type { MatchResult } from '../types';
import { formatRange, recommendationTone, timeAgo } from '../lib';
import { Badge, ScoreBar, ScorePill } from './ui';

export default function JobCard({ match, compact = false }: { match: MatchResult; compact?: boolean }) {
  const j = match.job;
  return (
    <Link
      to={'/jobs/' + j.id}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-sky/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{j.title}</h3>
          <div className="mt-0.5 truncate text-sm text-slate-500">
            {j.company} &middot; {j.location.city}, {j.location.country}
          </div>
        </div>
        <ScorePill value={match.overallScore} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone={recommendationTone(match.recommendation)}>{match.recommendation}</Badge>
        <Badge tone="bg-slate-100 text-slate-600">{j.remote}</Badge>
        <Badge tone="bg-slate-100 text-slate-600">{formatRange(j.salary.min, j.salary.max, j.salary.currency)}</Badge>
        <Badge tone="bg-slate-100 text-slate-600">{j.industry}</Badge>
        {match.missingSkills.length > 0 ? (
          <Badge tone="bg-rose-50 text-rose-600">Missing: {match.missingSkills.slice(0, 2).join(', ')}</Badge>
        ) : (
          <Badge tone="bg-emerald-50 text-emerald-600">All requirements met</Badge>
        )}
      </div>

      {!compact ? (
        <div className="mt-3 flex items-center gap-2">
          <ScoreBar value={match.overallScore} className="flex-1" />
          <span className="shrink-0 text-xs text-slate-400">{timeAgo(j.postedAt)}</span>
        </div>
      ) : null}
    </Link>
  );
}