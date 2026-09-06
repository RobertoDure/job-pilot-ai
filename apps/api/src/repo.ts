import { getUserClient } from './supabase';
import { sanitizeForPostgres } from './util';
import type { Application, ApplicationStatus, CandidateProfile, Job } from './domain';

interface AppRow {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  match_score: number;
  notes: string | null;
  job_data: Job | null;
  created_at: string;
  updated_at: string;
}

export interface StoredApplication extends Application {
  jobData?: Job;
}

function mapApp(row: AppRow): StoredApplication {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    matchScore: row.match_score ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes ?? undefined,
    jobData: row.job_data ?? undefined,
  };
}

export async function getProfile(userId: string, jwt: string): Promise<CandidateProfile | null> {
  const db = getUserClient(jwt);
  const { data, error } = await db.from('profiles').select('profile').eq('user_id', userId).maybeSingle();
  if (error) throw new Error('profiles select failed: ' + error.message);
  return (data?.profile as CandidateProfile) ?? null;
}

export async function saveProfile(userId: string, jwt: string, profile: CandidateProfile): Promise<void> {
  const db = getUserClient(jwt);
  const { error } = await db.from('profiles').upsert({
    user_id: userId,
    profile: sanitizeForPostgres(profile) as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('profiles upsert failed: ' + error.message);
}

// Legacy mock rows are never returned to users; real jobs are ingested with
// source-prefixed ids (e.g. remotive-123).
function isLegacyMockJobId(id: string): boolean {
  return /^job-java-d+$/.test(id);
}

// --- Per-user job catalog ---
// Jobs are stored per user (keyed by user_id + id) so that re-uploading a CV
// can replace the previous CV's job set without leaking stale matches.

export async function getJobsForUser(userId: string, jwt: string): Promise<Job[]> {
  const db = getUserClient(jwt);
  const { data, error } = await db.from('jobs').select('data').eq('user_id', userId).order('id');
  if (error) throw new Error('jobs select failed: ' + error.message);
  return ((data ?? []) as { data: Job }[]).map((r) => r.data).filter((j) => j && !isLegacyMockJobId(j.id));
}

export async function upsertJobsForUser(userId: string, jwt: string, jobs: Job[]): Promise<void> {
  if (jobs.length === 0) return;
  const db = getUserClient(jwt);
  const rows = jobs.map((j) => ({
    id: j.id,
    user_id: userId,
    data: sanitizeForPostgres(j) as unknown as Record<string, unknown>,
  }));
  const { error } = await db.from('jobs').upsert(rows);
  if (error) throw new Error('jobs upsert failed: ' + error.message);
}

export async function deleteJobsForUser(userId: string, jwt: string): Promise<void> {
  const db = getUserClient(jwt);
  const { error } = await db.from('jobs').delete().eq('user_id', userId);
  if (error) throw new Error('jobs delete failed: ' + error.message);
}

// --- Applications ---

export async function getApplications(userId: string, jwt: string): Promise<StoredApplication[]> {
  const db = getUserClient(jwt);
  const { data, error } = await db
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('applications select failed: ' + error.message);
  return ((data ?? []) as AppRow[]).map(mapApp);
}

export async function upsertApplication(userId: string, jwt: string, app: StoredApplication): Promise<void> {
  const db = getUserClient(jwt);
  const row = {
    id: app.id,
    user_id: userId,
    job_id: app.jobId,
    status: app.status,
    match_score: app.matchScore,
    notes: sanitizeForPostgres(app.notes ?? null),
    created_at: app.createdAt,
    updated_at: app.updatedAt,
  };
  const withSnapshot = { ...row, job_data: app.jobData ? sanitizeForPostgres(app.jobData) : null };

  const { error } = await db.from('applications').upsert(withSnapshot);
  if (error && /job_data/.test(error.message)) {
    // The Supabase schema hasn't been migrated yet (no job_data column), so
    // fall back to a write without the snapshot. Tracking and status updates
    // keep working; the snapshot is added automatically once the column exists.
    const retry = await db.from('applications').upsert(row);
    if (retry.error) throw new Error('applications upsert failed: ' + retry.error.message);
    return;
  }
  if (error) throw new Error('applications upsert failed: ' + error.message);
}
