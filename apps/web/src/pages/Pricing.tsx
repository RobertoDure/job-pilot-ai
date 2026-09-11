import { Badge } from '../components/ui';
import { TIERS } from '../pricing';

export default function Pricing() {
  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Simple, transparent pricing</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Start free, upgrade when you want the AI to do more of the heavy lifting for you.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={
              'relative flex flex-col rounded-2xl border bg-white p-5 shadow-card ' +
              (t.highlighted ? 'border-brand-sky ring-2 ring-brand-sky/30' : 'border-slate-200')
            }
          >
            {t.highlighted ? (
              <Badge tone="bg-brand-navy text-white">Most popular</Badge>
            ) : null}
            <h2 className="mt-2 text-lg font-bold text-slate-900">{t.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">{t.price}</span>
              <span className="text-sm text-slate-400">{t.cadence}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t.tagline}</p>

            <ul className="mt-4 flex-1 space-y-2">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-slate-600">
                  <span className="text-brand-sky">{'✓'}</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              className={
                'mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ' +
                (t.highlighted
                  ? 'bg-brand-navy text-white hover:bg-brand-navyDark'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50')
              }
            >
              {t.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
        {'💡'} Also exploring a <b>success-based model</b>: €0 upfront, pay when you get hired. Coming as a later experiment.
      </div>
    </div>
  );
}