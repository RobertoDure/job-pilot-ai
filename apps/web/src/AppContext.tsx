import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api } from './api';
import type { CandidateProfile, CareerProfileSummary } from './types';

interface AppState {
  session: Session | null;
  profile: CandidateProfile | null;
  summary: CareerProfileSummary | null;
  loading: boolean;
  profileLoading: boolean;
  refresh: () => Promise<void>;
  setProfileData: (profile: CandidateProfile, summary: CareerProfileSummary) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [summary, setSummary] = useState<CareerProfileSummary | null>(null);
  // True until the very first session restore finishes (initial bootstrap).
  const [loading, setLoading] = useState(true);
  // True while the profile for the current session is being fetched. It is set
  // synchronously with the session so the router never redirects to onboarding
  // before the profile lookup has actually finished.
  const [profileLoading, setProfileLoading] = useState(false);

  const refresh = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await api.profile();
      setProfile(res.profile);
      setSummary(res.summary);
    } catch {
      setProfile(null);
      setSummary(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Apply a session change and immediately mark the profile as unknown so the
  // UI shows a spinner instead of treating a not-yet-loaded profile as missing.
  const applySession = useCallback(
    (s: Session | null) => {
      setSession(s);
      setProfile(null);
      setSummary(null);
      if (s) {
        setProfileLoading(true);
        void refresh();
      } else {
        setProfileLoading(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) applySession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applySession(data.session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const setProfileData = (p: CandidateProfile, s: CareerProfileSummary) => {
    setProfile(p);
    setSummary(s);
    setProfileLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSummary(null);
    setProfileLoading(false);
  };

  return (
    <AppContext.Provider value={{ session, profile, summary, loading, profileLoading, refresh, setProfileData, signOut }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
