import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';
import JobCard from '../components/JobCard';
import { Spinner } from '../components/ui';
import type { MatchResult } from '../types';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLY', label: 'Apply' },
  { key: 'CONSIDER', label: 'Consider' },
  { key: 'SKIP', label: 'Skip' },
];

const WORLDWIDE_LABEL = 'Remote / Worldwide';

// Normalises a job's country into a display group. Empty / remote / worldwide
// postings are grouped together so they don't create dozens of tiny sections.
function countryGroup(country: string): string {
  const c = (country || '').trim();
  if (!c || /^(remote|worldwide|anywhere|europe)$/i.test(c)) return WORLDWIDE_LABEL;
  return c;
}

export default function Matches() {
  const { profile } = useApp();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [country, setCountry] = useState('ALL');
  const [sort, setSort] = useState<'score' | 'salary'>('score');

  useEffect(() => {
    api
      .matches()
      .then((r) => setMatches(r.matches))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load matches'))
      .finally(() => setLoading(false));
  }, []);

  const cvCountry = (profile?.location.country || '').toLowerCase();

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) set.add(countryGroup(m.job.location.country));
    return [...set].sort((a, b) => {
      const ao = cvCountry && a.toLowerCase() === cvCountry ? 0 : a === WORLDWIDE_LABEL ? 1 : 2;
      const bo = cvCountry && b.toLowerCase() === cvCountry ? 0 : b === WORLDWIDE_LABEL ? 1 : 2;
      return ao - bo || a.localeCompare(b);
    });
  }, [matches, cvCountry]);

  const filtered = useMemo(() => {
    let list = matches;
    if (filter !== 'ALL') list = list.filter((m) => m.recommendation === filter);
    if (country !== 'ALL') list = list.filter((m) => countryGroup(m.job.location.country) === country);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.job.title.toLowerCase().includes(q) ||
          m.job.company.toLowerCase().includes(q) ||
          m.job.industry.toLowerCase().includes(q) ||
          m.matchedSkills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [matches, query, filter, country]);

  // Group by country: the candidate's own country first, then remote/worldwide,
  // then every other country alphabetically. Within each group, sort by score
  // or salary.
  const groups = useMemo(() => {
    const map = new Map<string, MatchResult[]>();
    for (const m of filtered) {
      const label = countryGroup(m.job.location.country);
      const arr = map.get(label) ?? [];
      arr.push(m);
      map.set(label, arr);
    }
    const entries = [...map.entries()].sort((a, b) => {
      const ao = cvCountry && a[0].toLowerCase() === cvCountry ? 0 : a[0] === WORLDWIDE_LABEL ? 1 : 2;
      const bo = cvCountry && b[0].toLowerCase() === cvCountry ? 0 : b[0] === WORLDWIDE_LABEL ? 1 : 2;
      return ao - bo || a[0].localeCompare(b[0]);
    });
    return entries.map(([label, list]) => ({
      label,
      list: [...list].sort((x, y) =>
        sort === 'salary' ? y.job.salary.max - x.job.salary.max : y.overallScore - x.overallScore
      ),
    }));
  }, [filtered, sort, cvCountry]);

  if (loading) return <Spinner />;
  if (error) return <div className="text-rose-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Job matches</h1>
      <p className="mt-1 text-sm text-slate-500">
        {matches.length} jobs grouped by country, ranked by how well they fit your profile. Every score is explainable.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, company, or skill..."
          className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
        />
        <div className="flex rounded-xl border border-slate-300 bg-white p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                'rounded-[10px] px-3 py-1.5 text-sm font-semibold transition ' +
                (filter === f.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
        >
          <option value="ALL">All locations</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl border border-slate-300 bg-white p-0.5">
          <button
            onClick={() => setSort('score')}
            className={'rounded-[10px] px-3 py-1.5 text-sm font-semibold transition ' + (sort === 'score' ? 'bg-brand-navy text-white' : 'text-slate-600')}
          >
            Best match
          </button>
          <button
            onClick={() => setSort('salary')}
            className={'rounded-[10px] px-3 py-1.5 text-sm font-semibold transition ' + (sort === 'salary' ? 'bg-brand-navy text-white' : 'text-slate-600')}
          >
            Highest salary
          </button>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.label} className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{g.label}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{g.list.length}</span>
            {cvCountry && g.label.toLowerCase() === cvCountry ? (
              <span className="rounded-full bg-brand-skyLight px-2 py-0.5 text-xs font-semibold text-brand-sky">Your location</span>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.list.map((m) => (
              <JobCard key={m.job.id} match={m} />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No jobs match your current filters.
        </div>
      ) : null}
    </div>
  );
}