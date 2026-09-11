import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';
import logoBanner from '../assets/logo-banner.png';

export default function Auth() {
  const { session, loading } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          navigate('/');
        } else {
          setError('Account created. You can now sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-skyDark px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white p-7 shadow-2xl">
          <div className="flex justify-center">
            <img src={logoBanner} alt="JobPilot AI" className="h-9 w-auto" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-slate-900">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'signin' ? 'Sign in to your job search copilot.' : 'Start your AI-powered job search in minutes.'}
          </p>

          <div className="mt-5 flex rounded-xl border border-slate-300 p-0.5">
            <button
              onClick={() => setMode('signin')}
              className={'flex-1 rounded-[10px] py-2 text-sm font-semibold transition ' + (mode === 'signin' ? 'bg-brand-navy text-white' : 'text-slate-600')}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={'flex-1 rounded-[10px] py-2 text-sm font-semibold transition ' + (mode === 'signup' ? 'bg-brand-navy text-white' : 'text-slate-600')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={'•'.repeat(8)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-sky focus:outline-none focus:ring-2 focus:ring-brand-sky/30"
              />
            </label>

            {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navyDark disabled:opacity-60"
            >
              {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Secured by Supabase Auth. Your profile and applications are stored privately per account.
          </p>
        </div>
      </div>
    </div>
  );
}
