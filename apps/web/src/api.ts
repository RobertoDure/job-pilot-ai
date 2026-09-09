import { supabase } from './supabase';
import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  CareerInsight,
  CareerProfileSummary,
  EnrichedApplication,
  InterviewPrep,
  Job,
  MatchResult,
  PipelineResult,
  TailoredApplication,
} from './types';

const BASE = '/api';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) {
    let message = res.status + ' ' + res.statusText;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  profile: () => http<{ profile: CandidateProfile; summary: CareerProfileSummary }>('/profile'),
  analyzeCv: (payload: { text?: string; filename?: string; contentBase64?: string; useSample?: boolean }) =>
    http<{ profile: CandidateProfile; summary: CareerProfileSummary }>('/cv/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  matches: () => http<{ matches: MatchResult[] }>('/matches'),
  match: (jobId: string) => http<{ match: MatchResult }>('/matches/' + jobId),
  digest: () => http<PipelineResult>('/digest'),
  jobs: () => http<{ jobs: Job[] }>('/jobs'),
  applications: () => http<{ applications: EnrichedApplication[] }>('/applications'),
  createApplication: (jobId: string, status: ApplicationStatus) =>
    http<{ application: Application }>('/applications', { method: 'POST', body: JSON.stringify({ jobId, status }) }),
  updateApplication: (id: string, status: ApplicationStatus) =>
    http<{ application: Application }>('/applications/' + id, { method: 'PATCH', body: JSON.stringify({ status }) }),
  prepare: (jobId: string) => http<TailoredApplication>('/applications/' + jobId + '/prepare', { method: 'POST' }),
  insights: () => http<CareerInsight>('/career/insights'),
  interview: (jobId: string) => http<InterviewPrep>('/interview/simulate', { method: 'POST', body: JSON.stringify({ jobId }) }),
};
