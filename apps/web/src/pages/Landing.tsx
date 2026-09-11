import { Link } from 'react-router-dom';
import { TIERS } from '../pricing';
import banner from '../assets/banner.png';
import logoBanner from '../assets/logo-banner.png';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const FEATURES = [
  {
    icon: '🔎',
    title: 'Live job discovery',
    body: 'We fetch real postings from public job boards (Remotive, Arbeitnow, Jobicy, The Muse and more) the moment you share your CV. No mock data, no stale listings.',
  },
  {
    icon: '🎯',
    title: 'Explainable match score',
    body: 'Every job gets a 0–100 score broken down by skills, experience, location, salary, education, seniority and work authorization — so you know exactly why you match.',
  },
  {
    icon: '💡',
    title: '"Should I apply?"',
    body: 'Application probability, interview potential and a competition estimate for every role, ranked APPLY / CONSIDER / SKIP so you never waste an application.',
  },
  {
    icon: '✍️',
    title: 'AI CV tailoring & cover letters',
    body: 'DeepSeek writes a truthful tailored summary and cover letter from your real experience. Nothing is invented, ever.',
  },
  {
    icon: '📋',
    title: 'Application command center',
    body: 'A kanban pipeline from Recommended → Applied → Interview → Offer (or Rejected / No response), persisted per account.',
  },
  {
    icon: '📈',
    title: 'Career intelligence & interview prep',
    body: 'Response rates by role and industry, skill-gap suggestions, and an AI interview simulator with role-specific questions.',
  },
];

const STEPS = [
  { label: 'Find', desc: 'Real jobs matching your profile' },
  { label: 'Filter', desc: 'By role, salary and location' },
  { label: 'Match', desc: 'Explainable 0–100 score' },
  { label: 'Tailor CV', desc: 'Truthful, AI-personalised' },
  { label: 'Apply', desc: 'One-click application flow' },
  { label: 'Track', desc: 'Kanban command center' },
  { label: 'Improve', desc: 'Insights that raise your odds' },
];

const FAQS = [
  {
    q: 'Is my data private?',
    a: 'Yes. Your profile, CV and applications are stored per account behind Supabase Row Level Security. Only you can read or write your own data.',
  },
  {
    q: 'Where do the jobs come from?',
    a: 'Live public job-board APIs, normalised and matched to your profile. We never fabricate jobs, salaries or market statistics.',
  },
  {
    q: 'Does the AI invent anything on my CV?',
    a: 'No. The generative AI only rewords and reorders what is already on your CV. Every claim stays grounded in your real experience.',
  },
  {
    q: 'Can I start for free?',
    a: 'Absolutely. The Free plan gives you 10 matches a month, CV analysis and the application tracker. Upgrade whenever you want more.',
  },
  {
    q: 'Do I need a credit card?',
    a: 'No. Create an account and start with the free plan — no card required.',
  },
];

function Logo({ light = false }: { light?: boolean }) {
  return <img src={logoBanner} alt="JobPilot AI" className={'h-8 w-auto sm:h-10 ' + (light ? 'rounded-xl bg-white/90 p-1.5' : '')} />;
}


export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="JobPilot AI home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              to="/auth"
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navyDark"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-skyDark">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-sky-200 ring-1 ring-white/20">
              {'✨'} Your personal AI job-search copilot
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Land the job you actually deserve, faster.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-sky-200">
              Whatever you do &mdash; nurse, accountant, teacher, engineer, chef &mdash; tell us the role you
              want and we turn it into an automated pipeline: find, filter, match, tailor your CV, apply,
              track and improve &mdash; with an explainable score on every job.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth?mode=signup"
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-navy shadow-lg transition hover:bg-brand-skyLight"
              >
                Create free account
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                See how it works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm">
              <div>
                <div className="text-2xl font-bold">2 min</div>
                <div className="text-sky-200">to your career profile</div>
              </div>
              <div>
                <div className="text-2xl font-bold">Explainable</div>
                <div className="text-sky-200">match scores</div>
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-sky-200">skills invented, ever</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-brand-sky/30 via-brand-skyDark/20 to-transparent blur-2xl" aria-hidden />
            <img src={banner} alt="JobPilot AI — Intelligent Career Navigation" className="relative w-full rounded-3xl border border-white/25 shadow-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need to job-search smarter</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            A copilot for the whole journey — from discovering the right roles to acing the interview.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-skyLight text-xl">{f.icon}</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">One pipeline, seven steps</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              Share your CV once and let the copilot run the rest — transparently, at every step.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.label} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy to-brand-skyDark text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className="hidden text-slate-300 lg:inline">{'→'}</span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-bold text-slate-900">{s.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Start free, upgrade when you want the AI to do more of the heavy lifting for you.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                'relative flex flex-col rounded-2xl border bg-white p-6 shadow-card ' +
                (t.highlighted ? 'border-brand-sky ring-2 ring-brand-sky/30' : 'border-slate-200')
              }
            >
              {t.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
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

              <Link
                to="/auth?mode=signup"
                className={
                  'mt-6 block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ' +
                  (t.highlighted
                    ? 'bg-brand-navy text-white hover:bg-brand-navyDark'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50')
                }
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
          {'💡'} Also exploring a <b>success-based model</b>: €0 upfront, pay when you get hired. Coming as a later experiment.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Frequently asked questions</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">Everything you need to know before you get started.</p>
          </div>

          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h3 className="font-bold text-slate-900">{f.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-skyDark py-20">
        <div className="mx-auto max-w-3xl px-4 text-center text-white sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your next job is waiting</h2>
          <p className="mx-auto mt-3 max-w-xl text-sky-200">
            Create a free account, upload your CV and see your first matches in under two minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth?mode=signup"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-navy shadow-lg transition hover:bg-brand-skyLight"
            >
              Create free account
            </Link>
            <Link
              to="/auth"
              className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-3 max-w-sm text-sm text-slate-500">
                Your personal AI job-search copilot. Find, filter, match, tailor, apply, track and improve — all in one place.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-slate-900">How it works</a></li>
                <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Get started</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><Link to="/auth?mode=signup" className="hover:text-slate-900">Create account</Link></li>
                <li><Link to="/auth" className="hover:text-slate-900">Log in</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
            <span>&copy; {new Date().getFullYear()} JobPilot AI. All rights reserved.</span>
            <span>Secured by Supabase Auth · Powered by DeepSeek</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
