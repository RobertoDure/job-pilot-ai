import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Badge, Card, ScoreBar, Spinner } from '../components/ui';
import { formatRange, recommendationTone, scoreColor, timeAgo } from '../lib';
import type { MatchResult, TailoredApplication } from '../types';

function ProbBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{value}%</span>
      </div>
      <ScoreBar value={value} />
      {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

export default function JobDetail() {
  const { id = '' } = useParams();
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [prepared, setPrepared] = useState<TailoredApplication | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .match(id)
      .then((r) => setMatch(r.match))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load job'));
  }, [id]);

  async function prepare() {
    setPreparing(true);
    setError('');
    try {
      setPrepared(await api.prepare(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to prepare application');
    } finally {
      setPreparing(false);
    }
  }

  async function track() {
    try {
      await api.createApplication(id, 'applied');
      setTracked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to track application');
    }
  }

  if (error && !match) return <div className="text-rose-600">{error}</div>;
  if (!match) return <Spinner />;

  const j = match.job;
  const p = match.applicationProbability;

  return (
    <div>
      <Link to="/matches" className="text-sm font-semibold text-brand-sky hover:text-brand-skyDark">
        {'\u2190'} Back to matches
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{j.title}</h1>
            <Badge tone={recommendationTone(match.recommendation)}>{match.recommendation}</Badge>
          </div>
          <div className="mt-1 text-slate-500">
            {j.company} &middot; {j.location.city}, {j.location.country} &middot; {j.remote} &middot; posted {timeAgo(j.postedAt)} via {j.source}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="bg-slate-100 text-slate-600">{formatRange(j.salary.min, j.salary.max, j.salary.currency)}</Badge>
            <Badge tone="bg-slate-100 text-slate-600">{j.seniority}</Badge>
            <Badge tone="bg-slate-100 text-slate-600">{j.industry}</Badge>
          </div>
          {j.url ? (
            <a
              href={j.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {'\u2197'} Apply on {j.source}
            </a>
          ) : null}
        </div>
        <div className="text-right">
          <div className={'text-5xl font-extrabold ' + scoreColor(match.overallScore)}>{match.overallScore}%</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">match score</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">About this role</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{j.description}</p>

            {j.responsibilities.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900">Responsibilities</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {j.responsibilities.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-sky" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {j.requirements.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900">Requirements</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {j.requirements.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {j.niceToHave.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900">Nice to have</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {j.niceToHave.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">{'\u{1F916}'} AI application pack</h2>
              <div className="flex gap-2">
                <Link to={'/interview/' + j.id} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  {'\u{1F3A4}'} Interview prep
                </Link>
                <button
                  onClick={() => void track()}
                  disabled={tracked}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {tracked ? 'Tracked in Command Center' : 'Track application'}
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              The AI prepares a tailored CV, cover letter, and standard answers &mdash; then you click Submit yourself.
            </p>

            {!prepared ? (
              <button
                onClick={() => void prepare()}
                disabled={preparing}
                className="mt-4 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navyDark disabled:opacity-60"
              >
                {preparing ? 'Preparing...' : 'Prepare my application'}
              </button>
            ) : (
              <div className="mt-4 space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Tailored CV summary</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{prepared.tailoredCv.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {prepared.tailoredCv.skills.slice(0, 12).map((s) => (
                      <Badge key={s} tone="bg-brand-skyLight text-brand-navy">{s}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Cover letter</h3>
                  <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{prepared.coverLetter}</pre>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Standard application answers</h3>
                  <div className="mt-2 space-y-3">
                    {prepared.standardAnswers.map((a) => (
                      <div key={a.question} className="rounded-xl border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900">{a.question}</div>
                        <div className="mt-1 text-sm text-slate-600">{a.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <div className="text-sm font-semibold text-amber-800">{'\u26A0'} Human review required before you submit</div>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {prepared.reviewNotes.map((n) => (
                      <li key={n}>{'\u2022'} {n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">{'\u{1F4CA}'} Should I apply?</h2>
            <p className="mt-1 text-sm text-slate-500">{match.recommendationReason}</p>
            <div className="mt-4 space-y-3.5">
              <ProbBar label="Interview potential" value={p.interview} />
              <ProbBar label="Skills match" value={p.skills} />
              <ProbBar label="Experience match" value={p.experience} />
              <ProbBar label="Education" value={p.education} />
              <ProbBar label="Location" value={p.location} />
              <ProbBar label="Competition" value={p.competition} hint="Higher = less competition for this role" />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">Match breakdown</h2>
            <div className="mt-3 space-y-3">
              {match.categories.map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">{c.label}</span>
                    <span className={'font-bold ' + scoreColor(c.score)}>{c.score}%</span>
                  </div>
                  <ScoreBar value={c.score} />
                  <div className="mt-0.5 text-xs text-slate-400">{c.detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">Why you match</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {match.whyYouMatch.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-emerald-500">{'\u2713'}</span>
                  {w}
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Matched skills</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {match.matchedSkills.map((s) => (
                  <Badge key={s} tone="bg-emerald-50 text-emerald-700">{s}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Missing</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {match.missingSkills.length ? (
                  match.missingSkills.map((s) => <Badge key={s} tone="bg-rose-50 text-rose-600">{s}</Badge>)
                ) : (
                  <span className="text-sm text-slate-400">None &mdash; you cover all required skills.</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}