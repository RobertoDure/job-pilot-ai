import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Badge, Card, Spinner } from '../components/ui';
import type { InterviewPrep } from '../types';

const CATEGORY_TONE: Record<string, string> = {
  technical: 'bg-brand-skyLight text-brand-navy',
  behavioral: 'bg-brand-skyLight text-brand-navy',
  situational: 'bg-amber-50 text-amber-700',
  role: 'bg-emerald-50 text-emerald-700',
};

export default function Interview() {
  const { jobId = '' } = useParams();
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .interview(jobId)
      .then(setPrep)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load interview prep'));
  }, [jobId]);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!prep) return <Spinner />;

  return (
    <div>
      <Link to={'/jobs/' + jobId} className="text-sm font-semibold text-brand-sky hover:text-brand-skyDark">
        {'\u2190'} Back to job
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">{'\u{1F3A4}'} AI interview simulator</h1>
      <p className="mt-1 text-sm text-slate-500">
        {prep.job.title} at {prep.job.company} &mdash; generated from the job description and your profile.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {prep.questions.map((q, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={CATEGORY_TONE[q.category]}>{q.category}</Badge>
                <span className="text-xs font-bold text-slate-300">Q{i + 1}</span>
              </div>
              <p className="mt-2 font-semibold text-slate-900">{q.question}</p>
              <div className="mt-3 space-y-1 text-sm">
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-500">Why asked: </span>
                  {q.whyAsked}
                </div>
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-500">Tip: </span>
                  {q.tip}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit p-5">
          <h2 className="text-sm font-bold text-slate-900">Preparation notes</h2>
          <ul className="mt-3 space-y-2">
            {prep.preparationNotes.map((n) => (
              <li key={n} className="flex gap-2 text-sm text-slate-600">
                <span className="text-brand-sky">{'\u2713'}</span>
                {n}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-brand-skyLight p-3 text-xs text-brand-navy">
            Practise out loud, use the STAR method for behavioural questions, and always link answers back to concrete experience.
          </div>
        </Card>
      </div>
    </div>
  );
}