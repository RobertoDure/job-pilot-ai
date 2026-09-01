import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  CareerInsight,
  CareerProfileSummary,
  InterviewPrep,
  Job,
  MatchResult,
  TailoredApplication,
} from '../domain';
import { deleteJobsForUser, getApplications, getJobsForUser, getProfile, saveProfile, upsertApplication, upsertJobsForUser, type StoredApplication } from '../repo';
import { analyzeProfile, careerInsights, prepareApplication, runPipeline, simulateInterview } from '../agents';
import { matchJob, rankMatches } from '../matching/matcher';
import { newId } from '../util';
import { clearJobsCache, getRealJobs } from '../jobs/ingest';

// --- Candidate Service ---
export function currentProfile(userId: string, jwt: string): Promise<CandidateProfile | null> {
  return getProfile(userId, jwt);
}

export function storeProfile(userId: string, jwt: string, profile: CandidateProfile): Promise<CandidateProfile> {
  return saveProfile(userId, jwt, profile).then(() => profile);
}

// --- Job Service (real, live postings from public providers, per user) ---
async function jobsFor(userId: string, jwt: string): Promise<Job[]> {
  // The job catalog lives in the jobs table; providers are only queried when a
  // new CV is uploaded (rebuildJobsFor). Reads always come from the DB so a
  // sign-in or restart shows exactly what was stored for that user.
  return getJobsForUser(userId, jwt);
}

export function listJobs(userId: string, jwt: string): Promise<Job[]> {
  return jobsFor(userId, jwt);
}

export async function findJob(userId: string, jwt: string, id: string): Promise<Job | undefined> {
  const jobs = await jobsFor(userId, jwt);
  return jobs.find((j) => j.id === id);
}

// Replaces a user's stored job catalog after a new CV is uploaded: deletes the
// previous CV's jobs, invalidates the cache, and queries + stores fresh jobs for
// the new profile. Applications are decoupled and keep their own job snapshots.
export async function rebuildJobsFor(userId: string, jwt: string, profile: CandidateProfile): Promise<Job[]> {
  await deleteJobsForUser(userId, jwt);
  clearJobsCache(userId);
  return getRealJobs(userId, jwt, profile, true);
}

// --- Application Service ---
export interface EnrichedApplication extends Application {
  job?: Job;
}

export async function listApplications(userId: string, jwt: string): Promise<EnrichedApplication[]> {
  // Resolve each board card from its stored job snapshot first, then from the
  // persisted job catalog. We intentionally avoid the live provider fetch here
  // so tracked cards survive a restart even when a posting has since left the
  // provider results (or the providers are unreachable).
  const [apps, jobs] = await Promise.all([getApplications(userId, jwt), getJobsForUser(userId, jwt)]);
  return apps.map(({ jobData, ...a }) => ({ ...a, job: jobData ?? jobs.find((j) => j.id === a.jobId) }));
}

export async function createApplication(userId: string, jwt: string, jobId: string, status: ApplicationStatus): Promise<Application> {
  const jobs = await jobsFor(userId, jwt);
  const job = jobs.find((j) => j.id === jobId);
  if (!job) throw new Error('Job not found: ' + jobId);
  const profile = await getProfile(userId, jwt);
  const matchScore = profile ? matchJob(profile, job).overallScore : 0;
  const now = new Date().toISOString();
  const app: Application = { id: newId('app'), jobId, status, matchScore, createdAt: now, updatedAt: now };
  // Persist the job for the matches/detail pages and store a self-contained
  // snapshot on the application so it survives future job-catalog rebuilds.
  await upsertJobsForUser(userId, jwt, [job]);
  await upsertApplication(userId, jwt, { ...app, jobData: job });
  return app;
}

export async function updateApplication(userId: string, jwt: string, id: string, status: ApplicationStatus): Promise<Application | undefined> {
  const apps = await getApplications(userId, jwt);
  const existing = apps.find((a) => a.id === id);
  if (!existing) return undefined;
  const updated: StoredApplication = { ...existing, status, updatedAt: new Date().toISOString() };
  await upsertApplication(userId, jwt, updated);
  const { jobData: _jobData, ...application } = updated;
  return application;
}

// --- AI Service ---
export function analyze(profile: CandidateProfile, jobs: Job[]): CareerProfileSummary {
  return analyzeProfile(profile, jobs);
}

export async function matchesFor(userId: string, jwt: string): Promise<MatchResult[]> {
  const profile = await getProfile(userId, jwt);
  if (!profile) throw new Error('No profile yet. Upload a CV first.');
  return rankMatches(profile, await getJobsForUser(userId, jwt));
}

export async function matchFor(userId: string, jwt: string, jobId: string): Promise<MatchResult | undefined> {
  const profile = await getProfile(userId, jwt);
  const job = await findJob(userId, jwt, jobId);
  return profile && job ? matchJob(profile, job) : undefined;
}

export async function digestFor(userId: string, jwt: string) {
  const profile = await getProfile(userId, jwt);
  if (!profile) throw new Error('No profile yet. Upload a CV first.');
  return runPipeline(profile, await getJobsForUser(userId, jwt), await getApplications(userId, jwt));
}

export async function prepareFor(userId: string, jwt: string, jobId: string): Promise<TailoredApplication | undefined> {
  const profile = await getProfile(userId, jwt);
  const job = await findJob(userId, jwt, jobId);
  if (!profile || !job) return undefined;
  return prepareApplication(profile, job, matchJob(profile, job));
}

export async function insightsFor(userId: string, jwt: string): Promise<CareerInsight> {
  const profile = await getProfile(userId, jwt);
  if (!profile) throw new Error('No profile yet. Upload a CV first.');
  return careerInsights(profile, await getJobsForUser(userId, jwt), await getApplications(userId, jwt));
}

export async function interviewFor(userId: string, jwt: string, jobId: string): Promise<InterviewPrep | undefined> {
  const profile = await getProfile(userId, jwt);
  const job = await findJob(userId, jwt, jobId);
  if (!profile || !job) return undefined;
  return simulateInterview(profile, job);
}
