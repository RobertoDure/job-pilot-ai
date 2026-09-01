import { Router, type Request, type Response } from 'express';
import { parseCv } from '../parsing/cv-parser';
import { extractDocxText } from '../parsing/docx';
import { extractPdfText } from '../parsing/pdf';
import { SAMPLE_CV } from '../data/sample-cv';
import { requireAuth, type AuthedRequest } from '../auth';
import { wrap } from '../util';
import type { ApplicationStatus, CandidateProfile, Job } from '../domain';
import {
  analyze,
  createApplication,
  currentProfile,
  digestFor,
  findJob,
  insightsFor,
  interviewFor,
  listApplications,
  listJobs,
  matchesFor,
  matchFor,
  prepareFor,
  rebuildJobsFor,
  storeProfile,
  updateApplication,
} from '../services';

export function buildRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'jobpilot-api', time: new Date().toISOString() });
  });

  // Everything below requires a verified Supabase session.
  router.use(requireAuth);

  router.get('/profile', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const profile = await currentProfile(userId, jwt);
    if (!profile) {
      res.status(404).json({ error: 'No profile yet. Upload a CV first.' });
      return;
    }
    // Recompute the career summary from the persisted profile so the
    // analysis survives a page reload. Job fetching is best-effort: if
    // providers are down, the summary still derives from the profile.
    let jobs: Job[] = [];
    try {
      jobs = await listJobs(userId, jwt);
    } catch {
      jobs = [];
    }
    res.json({ profile, summary: analyze(profile, jobs) });
  }));

  router.post('/profile', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const profile = req.body?.profile as CandidateProfile | undefined;
    if (!profile || !profile.name) {
      res.status(400).json({ error: 'Invalid profile payload.' });
      return;
    }
    res.json({ profile: await storeProfile(userId, jwt, profile) });
  }));

  router.post('/cv/analyze', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    let text = typeof req.body?.text === 'string' ? req.body.text : '';
    const filename: string | undefined = req.body?.filename;
    const contentBase64: string | undefined = req.body?.contentBase64;

    if (req.body?.useSample) text = SAMPLE_CV;

    if (!text && contentBase64 && filename) {
      const buffer = Buffer.from(contentBase64, 'base64');
      if (/\.pdf$/i.test(filename)) text = await extractPdfText(buffer);
      else if (/\.docx$/i.test(filename)) text = extractDocxText(buffer);
    }

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'No CV text provided. Paste text or upload a .pdf/.docx/.txt file.' });
      return;
    }

    const profile = parseCv(text);
    await storeProfile(userId, jwt, profile);
    // Replace the previous CV's job catalog: delete its jobs, then query and
    // store fresh jobs for the new profile's skills.
    const jobs = await rebuildJobsFor(userId, jwt, profile);
    res.json({ profile, summary: analyze(profile, jobs) });
  }));

  router.get('/jobs', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const limit = Number(req.query.limit) || 50;
    res.json({ jobs: (await listJobs(userId, jwt)).slice(0, limit) });
  }));

  router.get('/jobs/:id', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const job = await findJob(userId, jwt, req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    res.json({ job });
  }));

  router.get('/matches', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    res.json({ matches: await matchesFor(userId, jwt) });
  }));

  router.get('/matches/:jobId', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const match = await matchFor(userId, jwt, req.params.jobId);
    if (!match) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    res.json({ match });
  }));

  router.get('/digest', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    res.json(await digestFor(userId, jwt));
  }));

  router.get('/applications', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    res.json({ applications: await listApplications(userId, jwt) });
  }));

  router.post('/applications', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const jobId = String(req.body?.jobId || '');
    const status = (req.body?.status || 'applied') as ApplicationStatus;
    if (!jobId || !(await findJob(userId, jwt, jobId))) {
      res.status(400).json({ error: 'A valid jobId is required.' });
      return;
    }
    res.json({ application: await createApplication(userId, jwt, jobId, status) });
  }));

  router.patch('/applications/:id', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const status = req.body?.status as ApplicationStatus;
    if (!status) {
      res.status(400).json({ error: 'status is required.' });
      return;
    }
    const application = await updateApplication(userId, jwt, req.params.id, status);
    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    res.json({ application });
  }));

  router.post('/applications/:jobId/prepare', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const prepared = await prepareFor(userId, jwt, req.params.jobId);
    if (!prepared) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    res.json(prepared);
  }));

  router.get('/career/insights', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    res.json(await insightsFor(userId, jwt));
  }));

  router.post('/interview/simulate', wrap(async (req, res) => {
    const { userId, jwt } = req as AuthedRequest;
    const jobId = String(req.body?.jobId || '');
    const prep = await interviewFor(userId, jwt, jobId);
    if (!prep) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    res.json(prep);
  }));

  return router;
}
