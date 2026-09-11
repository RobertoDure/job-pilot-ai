import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useApp } from '../AppContext';
import { Spinner } from './ui';
import logoBanner from '../assets/logo-banner.png';

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {children}
    </svg>
  );
}

const IconDashboard = () => (
  <NavIcon>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </NavIcon>
);

const IconMatches = () => (
  <NavIcon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </NavIcon>
);

const IconCommandCenter = () => (
  <NavIcon>
    <rect x="3" y="4" width="5" height="16" rx="1.5" />
    <rect x="10" y="4" width="4.5" height="10" rx="1.5" />
    <rect x="16.5" y="4" width="4.5" height="13" rx="1.5" />
  </NavIcon>
);

const IconInsights = () => (
  <NavIcon>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20V7" />
    <path d="M22 20V13" />
  </NavIcon>
);

const IconPricing = () => (
  <NavIcon>
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M2 9h20" />
    <path d="M9 3l3 6 3-6" />
  </NavIcon>
);

const NAV = [
  { to: '/', label: 'Dashboard', icon: <IconDashboard />, end: true },
  { to: '/matches', label: 'Job Matches', icon: <IconMatches />, end: false },
  { to: '/command-center', label: 'Command Center', icon: <IconCommandCenter />, end: false },
  { to: '/insights', label: 'Career Insights', icon: <IconInsights />, end: false },
  { to: '/pricing', label: 'Pricing', icon: <IconPricing />, end: false },
];

export default function Layout() {
  const { profile, loading, profileLoading, session, signOut } = useApp();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5">
          <img src={logoBanner} alt="JobPilot AI" className="h-9 w-auto" />
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ' +
                (isActive ? 'bg-brand-skyLight text-brand-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
              }
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-3 pb-5">
          <div className="rounded-2xl bg-gradient-to-br from-brand-navy to-brand-skyDark p-4 text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-200">Signed in as</div>
            <div className="mt-1 truncate text-sm font-semibold">{profile.name || 'Candidate'}</div>
            <div className="mt-0.5 truncate text-xs text-sky-100">{session.user?.email || ''}</div>
          </div>
          <Link
            to="/onboarding"
            className="mt-2 block text-center text-xs font-semibold text-slate-400 transition hover:text-brand-sky"
          >
            Re-upload CV
          </Link>
          <button
            onClick={() => void signOut()}
            className="mt-1 block w-full text-center text-xs font-semibold text-slate-400 transition hover:text-rose-600"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
