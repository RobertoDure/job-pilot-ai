// Job ingestion orchestration: fetches real postings from public providers,
// caches them briefly in memory (per user), and persists them (best-effort) so
// the application pipeline's job_id foreign key resolves. Each user's catalog
// is scoped to their own CV profile.
import type { CandidateProfile, Job } from '../domain';
import { getJobsForUser, upsertJobsForUser } from '../repo';
import { fetchRealJobs, queryForProfile, type JobQuery } from './providers';

const cache = new Map<string, { jobs: Job[]; at: number }>();
const TTL_MS = 10 * 60 * 1000;

function cacheKey(userId: string, q: JobQuery): string {
  return (userId + '::' + q.keywords.slice().sort().join('|') + '::' + q.country.toLowerCase() + '::' + q.city.toLowerCase()).toLowerCase();
}

// Drops every in-memory cache entry for a user so a new CV always triggers a
// fresh query rather than reusing results cached for the previous CV.
export function clearJobsCache(userId: string): void {
  const prefix = userId + '::';
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// Returns real, live jobs for a user's profile. Falls back to previously-stored
// jobs for that user when every provider fails. Pass forceRefresh to bypass the
// cache (used right after a new CV is uploaded).
export async function getRealJobs(
  userId: string,
  jwt: string,
  profile: CandidateProfile | null,
  forceRefresh = false,
): Promise<Job[]> {
  const query = queryForProfile(profile);
  const key = cacheKey(userId, query);

  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.jobs;
  }

  let jobs: Job[] = [];
  try {
    jobs = await fetchRealJobs(query);
  } catch {
    jobs = [];
  }
  if (jobs.length === 0) {
    try {
      jobs = await getJobsForUser(userId, jwt);
    } catch {
      jobs = [];
    }
  }

  cache.set(key, { jobs, at: Date.now() });

  // Best-effort: persist so apply-tracking works.
  if (jobs.length > 0) {
    try {
      await upsertJobsForUser(userId, jwt, jobs);
    } catch {
      /* read path still works without persistence */
    }
  }
  return jobs;
}
