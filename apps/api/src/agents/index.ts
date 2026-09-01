import type {
  Application,
  ApplicationStatus,
  CandidateProfile,
  CareerInsight,
  CareerProfileSummary,
  InterviewPrep,
  InterviewQuestion,
  Job,
  MatchResult,
  TailoredApplication,
  TailoredCv,
} from '../domain';
import { detectSkillsInText } from '../data/skills';
import { isGenericRoleWord, roleTokensFrom } from '../data/roles';
import { matchJob, rankMatches } from '../matching/matcher';
import { llmOrFallback } from '../llm/provider';

function requiredSkills(job: Job): string[] {
  return detectSkillsInText([job.title, ...job.requirements].join(' '));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const COACH_SYSTEM =
  'You are JobPilot AI, an expert career coach and CV writer. You are truthful and concise. ' +
  'Use ONLY the facts provided; never invent skills, experience, numbers, or credentials. ' +
  'Write in a warm, professional, first-person-friendly tone where appropriate.';

// ---------------------------------------------------------------------------
// CV Analyst Agent: turns a parsed profile into a human-readable career profile.
// ---------------------------------------------------------------------------
// Best industries are the real average match score across the live jobs for
// each industry, not a hard-coded ranking.
function computeBestIndustries(profile: CandidateProfile, jobs: Job[]): { name: string; score: number }[] {
  if (jobs.length === 0) {
    return profile.industries.slice(0, 3).map((name) => ({ name, score: 0 }));
  }
  const matches = rankMatches(profile, jobs);
  const totals = new Map<string, { total: number; count: number }>();
  for (const m of matches) {
    const name = m.job.industry || 'General';
    const cur = totals.get(name) ?? { total: 0, count: 0 };
    cur.total += m.overallScore;
    cur.count += 1;
    totals.set(name, cur);
  }
  return [...totals.entries()]
    .map(([name, { total, count }]) => ({ name, score: Math.round(total / count) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function analyzeProfile(profile: CandidateProfile, jobs: Job[]): CareerProfileSummary {
  const targetRoles = profile.preferredRoles.length
    ? profile.preferredRoles.slice(0, 5)
    : profile.experience.slice(0, 3).map((e) => e.title).filter(Boolean);

  const bestIndustries = computeBestIndustries(profile, jobs);

  const bestLocations = [profile.location.city + ', ' + profile.location.country];
  if (profile.remotePreference !== 'onsite') bestLocations.push('Remote ' + profile.location.country);

  const topSkills = [...profile.skills]
    .sort((a, b) => b.years - a.years || b.level.localeCompare(a.level))
    .slice(0, 8)
    .map((s) => s.name);

  return {
    targetRoles,
    bestIndustries,
    recommendedSalary: profile.salaryExpectation,
    bestLocations,
    topSkills,
    seniority: profile.seniority,
  };
}

// ---------------------------------------------------------------------------
// CV Tailor Agent: reorders and emphasises EXISTING experience to match a job.
// It is truth-preserving: nothing is invented.
// ---------------------------------------------------------------------------
export async function tailorCv(profile: CandidateProfile, job: Job): Promise<TailoredCv> {
  const jobSkills = requiredSkills(job).map((s) => s.toLowerCase());
  const profSkills = profile.skills.map((s) => s.name.toLowerCase());

  const emphasised = profile.skills.filter((s) => jobSkills.includes(s.name.toLowerCase())).map((s) => s.name);
  const rest = profile.skills.filter((s) => !jobSkills.includes(s.name.toLowerCase())).map((s) => s.name);
  const orderedSkills = [...emphasised, ...rest];

  const sortedExperience = profile.experience.map((e) => {
    const scored = e.highlights.map((h) => ({ text: h, score: jobSkills.filter((k) => h.toLowerCase().includes(k)).length }));
    scored.sort((a, b) => b.score - a.score);
    return { ...e, highlights: scored.map((s) => s.text) };
  });

  const cleanTitle = (profile.experience[0] && profile.experience[0].title) || profile.headline || 'Professional';
  const focus = emphasised.slice(0, 3);

  const summaryPrompt =
    'Candidate: ' + (profile.name || 'Candidate') + '\n' +
    'Current/recent title: ' + cleanTitle + '\n' +
    'Total years of experience: ' + profile.totalYears + '\n' +
    'Key skills to highlight for this role: ' + (focus.join(', ') || 'the core of this role') + '\n' +
    'Target job: ' + job.title + ' at ' + job.company + '\n\n' +
    'Write a 2-3 sentence professional summary for a tailored CV, emphasising the skills above. ' +
    'Return only the summary text, no headings.';

  const summary = await llmOrFallback(
    { system: COACH_SYSTEM, user: summaryPrompt, maxTokens: 250, temperature: 0.4 },
    () =>
      titleCase(profile.name) +
      ' is a ' +
      cleanTitle +
      ' with ' +
      profile.totalYears +
      '+ years of experience' +
      (focus.length ? ' specialising in ' + focus.join(', ') : '') +
      '. Proven record of delivering strong results in ' +
      (jobSkills[0] ? jobSkills[0] : 'the relevant field') +
      '.',
  );

  return {
    title: cleanTitle,
    summary,
    skills: orderedSkills,
    experience: sortedExperience.map((e) => ({
      title: e.title,
      company: e.company,
      period: e.start + ' - ' + e.end,
      bullets: e.highlights.slice(0, 6),
    })),
  };
}

// ---------------------------------------------------------------------------
// Application Agent: prepares everything, human clicks submit.
// ---------------------------------------------------------------------------
export async function prepareApplication(profile: CandidateProfile, job: Job, match: MatchResult): Promise<TailoredApplication> {
  const cv = await tailorCv(profile, job);
  const top = match.matchedSkills.slice(0, 3);
  const latest = profile.experience[0];

  const coverPrompt =
    'Candidate name: ' + (profile.name || 'Candidate') + '\n' +
    'Years of experience: ' + profile.totalYears + '\n' +
    'Matched skills: ' + (match.matchedSkills.slice(0, 6).join(', ') || 'the core of this role') + '\n' +
    'Recent role: ' + (latest ? latest.title + (latest.company ? ' at ' + latest.company : '') : 'n/a') + '\n' +
    (latest && latest.highlights[0] ? 'Recent achievement: ' + latest.highlights[0] + '\n' : '') +
    'Job: ' + job.title + ' at ' + job.company + '\n' +
    'Industry: ' + (job.industry || 'technology') + '\n\n' +
    'Write a concise, professional cover letter (about 150 words) with a greeting, ' +
    'one paragraph on why the candidate fits, one on why this company, and a sign-off. ' +
    'Return only the letter text.';

  const coverLetter = await llmOrFallback(
    { system: COACH_SYSTEM, user: coverPrompt, maxTokens: 500, temperature: 0.5 },
    () =>
      [
        'Dear Hiring Manager,',
        '',
        'I am writing to apply for the ' + job.title + ' position at ' + job.company + '. With ' + profile.totalYears + '+ years of experience in ' + (top.length ? top.join(', ') : 'the relevant field') + ', I am confident I can make an immediate contribution to your team.',
        '',
        latest
          ? 'In my current role as ' + latest.title + (latest.company ? ' at ' + latest.company : '') + ', I have ' + (latest.highlights[0] ? latest.highlights[0].toLowerCase() : 'delivered strong results') + '. I bring hands-on experience with ' + (match.matchedSkills.slice(0, 6).join(', ') || 'the core of this role') + ', which aligns closely with the requirements for this role.'
          : 'I bring hands-on experience with ' + (match.matchedSkills.slice(0, 6).join(', ') || 'the core of this role') + '.',
        '',
        'I am drawn to ' + job.company + ' because of its focus on ' + (job.industry || 'technology') + ' and the opportunity to work on ' + (job.responsibilities[0] ? job.responsibilities[0].toLowerCase() : 'meaningful problems') + '. I would welcome the chance to discuss how my background can help your team succeed.',
        '',
        'Kind regards,',
        profile.name || 'Candidate',
      ].join('\n'),
  );

  const salary = profile.salaryExpectation.min + ' - ' + profile.salaryExpectation.max + ' ' + profile.salaryExpectation.currency;

  const standardAnswers = [
    {
      question: 'Why do you want this job?',
      answer: 'This role matches my strengths in ' + (match.matchedSkills.slice(0, 3).join(', ') || 'this role') + ' and I am excited by ' + job.company + "'s work in " + (job.industry || 'its space') + '.',
    },
    {
      question: 'What are your salary expectations?',
      answer: salary + ' (flexible depending on the total package).',
    },
    {
      question: 'What is your notice period?',
      answer: 'To be confirmed - please verify your contractual notice period before submitting.',
    },
    {
      question: 'Do you have the right to work in ' + job.location.country + '?',
      answer: profile.workAuthorization.length ? profile.workAuthorization.join(', ') + ' - please verify current status.' : 'Please confirm your work authorization before submitting.',
    },
    {
      question: 'How many years of experience do you have with ' + (match.matchedSkills[0] || 'the core skill') + '?',
      answer: (profile.skills.find((s) => s.name.toLowerCase() === (match.matchedSkills[0] || '').toLowerCase())?.years ?? profile.totalYears) + ' years.',
    },
  ];

  return {
    job,
    tailoredCv: cv,
    coverLetter,
    standardAnswers,
    needsHumanReview: true,
    reviewNotes: [
      'Verify your notice period, salary figure, and right-to-work status.',
      'Confirm company name and hiring manager name before sending.',
      'This CV was generated from your existing profile - nothing has been invented.',
      'Review the tailored CV and cover letter, then click Submit on the job source yourself.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Job Finder + Matcher agents (orchestrator pipeline).
// ---------------------------------------------------------------------------
export interface PipelineStats {
  discovered: number;
  highlyRelevant: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  noResponse: number;
  responseRate: number;
}

export interface PipelineResult {
  greeting: string;
  stats: PipelineStats;
  topMatches: MatchResult[];
}

function countStatus(apps: Application[], status: ApplicationStatus): number {
  return apps.filter((a) => a.status === status).length;
}

export function runPipeline(profile: CandidateProfile, jobs: Job[], applications: Application[]): PipelineResult {
  const matches = rankMatches(profile, jobs);
  const highlyRelevant = matches.filter((m) => m.overallScore >= 75);
  const applied = countStatus(applications, 'applied');
  const interview = countStatus(applications, 'interview');
  const offer = countStatus(applications, 'offer');
  const rejected = countStatus(applications, 'rejected');
  const noResponse = countStatus(applications, 'no_response');
  const tracked = applied + interview + offer + rejected + noResponse;
  const responseRate = tracked > 0 ? Math.round(((interview + offer + rejected) / tracked) * 100) : 0;

  const topMatches = matches.filter((m) => m.overallScore >= 72).slice(0, 7);

  return {
    greeting: 'Good morning, ' + (profile.name || 'there') + '. I found ' + topMatches.length + ' jobs you should apply for today.',
    stats: {
      discovered: matches.length,
      highlyRelevant: highlyRelevant.length,
      applied,
      interview,
      offer,
      rejected,
      noResponse,
      responseRate,
    },
    topMatches,
  };
}

// ---------------------------------------------------------------------------
// Career Agent: learns what works from application outcomes.
// ---------------------------------------------------------------------------
function roleBucket(title: string): string {
  // Bucket by the most domain-specific word in the title so role analytics work
  // for any profession, not just engineering.
  const tokens = roleTokensFrom(title);
  const specific = tokens.filter((t) => !isGenericRoleWord(t));
  const word = specific[0] || tokens[0];
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : 'Other';
}

function responseRateFor(apps: Application[]): number {
  const tracked = apps.length;
  if (tracked === 0) return 0;
  const responded = apps.filter((a) => a.status === 'interview' || a.status === 'offer' || a.status === 'rejected').length;
  return Math.round((responded / tracked) * 100);
}

export async function careerInsights(profile: CandidateProfile, jobs: Job[], applications: Application[]): Promise<CareerInsight> {
  const matches = rankMatches(profile, jobs);
  const tracked = applications.filter((a) => a.status !== 'recommended');

  const byIndustryMap = new Map<string, Application[]>();
  for (const a of tracked) {
    const job = jobs.find((j) => j.id === a.jobId);
    if (!job) continue;
    const list = byIndustryMap.get(job.industry) || [];
    list.push(a);
    byIndustryMap.set(job.industry, list);
  }
  const byIndustry = [...byIndustryMap.entries()]
    .map(([industry, apps]) => ({ industry, applications: apps.length, responseRate: responseRateFor(apps) }))
    .sort((a, b) => b.responseRate - a.responseRate || b.applications - a.applications);

  const byRoleMap = new Map<string, Application[]>();
  for (const a of tracked) {
    const job = jobs.find((j) => j.id === a.jobId);
    if (!job) continue;
    const list = byRoleMap.get(roleBucket(job.title)) || [];
    list.push(a);
    byRoleMap.set(roleBucket(job.title), list);
  }
  const byRole = [...byRoleMap.entries()]
    .map(([role, apps]) => ({ role, applications: apps.length, responseRate: responseRateFor(apps) }))
    .sort((a, b) => b.responseRate - a.responseRate || b.applications - a.applications);

  // Real skill-gap analysis: for each skill the candidate is missing, re-score
  // the affected jobs with that skill added to measure the actual match uplift.
  const profileWithSkill = (skill: string): CandidateProfile => ({
    ...profile,
    skills: [...profile.skills, { name: skill, years: profile.totalYears, level: 'intermediate' }],
  });
  const skillGapSuggestions = [...new Set(matches.flatMap((m) => m.missingSkills))]
    .map((skill) => {
      const affected = matches.filter((m) => m.missingSkills.some((s) => s.toLowerCase() === skill.toLowerCase()));
      if (affected.length === 0) return null;
      const currentAvgMatch = Math.round(affected.reduce((a, m) => a + m.overallScore, 0) / affected.length);
      const boosted = profileWithSkill(skill);
      const projectedAvgMatch = Math.round(affected.reduce((a, m) => a + matchJob(boosted, m.job).overallScore, 0) / affected.length);
      return { skill, currentAvgMatch, projectedAvgMatch, gain: Math.max(0, projectedAvgMatch - currentAvgMatch) };
    })
    .filter((s): s is { skill: string; currentAvgMatch: number; projectedAvgMatch: number; gain: number } => s !== null)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 4);

  const highMatches = matches.filter((m) => m.overallScore >= 80);
  const marketMap = new Map<string, { count: number; avg: number }>();
  for (const m of highMatches) {
    const cur = marketMap.get(m.job.industry) || { count: 0, avg: 0 };
    cur.count += 1;
    cur.avg = cur.avg + (m.overallScore - cur.avg) / cur.count;
    marketMap.set(m.job.industry, cur);
  }
  const strongestMarket = [...marketMap.entries()].sort((a, b) => b[1].count - a[1].count)[0]?.[0] || profile.industries[0] || 'General';

  const trackedCount = tracked.length;
  const responseRate = trackedCount ? Math.round(((countStatus(applications, 'interview') + countStatus(applications, 'offer') + countStatus(applications, 'rejected')) / trackedCount) * 100) : 0;

  // Salary range observed across the live, relevant jobs (not an estimate).
  const salaryJobs = matches.filter((m) => m.job.salary.max > 0);
  const salaryRange = salaryJobs.length
    ? {
        min: Math.min(...salaryJobs.map((m) => m.job.salary.min)),
        max: Math.max(...salaryJobs.map((m) => m.job.salary.max)),
        currency: salaryJobs[0].job.salary.currency,
      }
    : profile.salaryExpectation;

  const fallbackRecommendations = (): string[] => {
    const recs: string[] = [];
    if (byIndustry[0]) recs.push('Your profile performs best in ' + byIndustry[0].industry + ' (' + byIndustry[0].responseRate + '% response rate). Consider prioritising these positions.');
    if (skillGapSuggestions[0]) {
      const s = skillGapSuggestions[0];
      recs.push('Adding ' + s.skill + ' could raise your average match rate from ' + s.currentAvgMatch + '% to around ' + s.projectedAvgMatch + '%.');
    }
    recs.push('Your strongest market right now is ' + strongestMarket + ' with ' + highMatches.length + ' high-match roles in your tracked sources.');
    recs.push('Roles matching your profile currently advertise ' + salaryRange.min + ' - ' + salaryRange.max + ' ' + salaryRange.currency + '.');
    return recs;
  };

  const recPrompt =
    'Candidate response rate: ' + responseRate + '% across ' + trackedCount + ' applications.\n' +
    'Best industries (industry: response rate): ' + byIndustry.map((i) => i.industry + ' ' + i.responseRate + '%').join(', ') + '\n' +
    'Best roles: ' + byRole.map((r) => r.role + ' ' + r.responseRate + '%').join(', ') + '\n' +
    'Strongest market: ' + strongestMarket + '\n' +
    'Top missing skills: ' + (skillGapSuggestions.map((s) => s.skill).join(', ') || 'none') + '\n' +
    'Salary range: ' + salaryRange.min + ' - ' + salaryRange.max + ' ' + salaryRange.currency + '\n\n' +
    'Write 4 short, actionable career recommendations. One per line, no bullets or numbering.';

  const recText = await llmOrFallback(
    { system: COACH_SYSTEM, user: recPrompt, maxTokens: 400, temperature: 0.5 },
    fallbackRecommendations,
  );
  const recommendations = recText
    .split('\n')
    .map((s) => s.replace(/^[-*\u2022\u00b7\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    responseRate,
    applicationsCount: trackedCount,
    byRole,
    byIndustry,
    skillGapSuggestions,
    strongestMarket,
    marketSizeEstimate: matches.length,
    salaryRange,
    recommendations: recommendations.length ? recommendations : fallbackRecommendations(),
  };
}

// ---------------------------------------------------------------------------
// Interview Agent: simulated interview prep.
// ---------------------------------------------------------------------------
export async function simulateInterview(profile: CandidateProfile, job: Job): Promise<InterviewPrep> {
  const req = requiredSkills(job);
  const questions: InterviewQuestion[] = [];

  const skillQs: Record<string, string> = {
    Java: 'Explain how the Java memory model and garbage collection work, and how you would tune a JVM for a high-throughput service.',
    'Spring Boot': 'Walk through how you would design a new microservice using Spring Boot: configuration, testing, and deployment.',
    Kubernetes: 'How do you approach deploying and scaling a service on Kubernetes? What probes and resource limits do you set?',
    AWS: 'Describe how you would design a resilient, cost-effective deployment on AWS for a stateless API.',
    Kafka: 'Explain how you would use Kafka to build an event-driven pipeline and how you handle ordering and retries.',
    Docker: 'How do you build efficient container images and manage environment configuration across environments?',
    PostgreSQL: 'How do you design a schema for a high-volume transactional system and tune query performance?',
  };
  const picked = req.filter((s) => skillQs[s]).slice(0, 3);
  for (const s of picked) {
    questions.push({ category: 'technical', question: skillQs[s], whyAsked: 'The role lists ' + s + ' as a core requirement.', tip: 'Use concrete examples from your experience and mention trade-offs.' });
  }
  if (questions.filter((q) => q.category === 'technical').length === 0) {
    const focus = req[0] || 'a complex piece of work';
    questions.push({ category: 'technical', question: 'Describe how you have applied ' + focus + ' in a real project or task, end-to-end.', whyAsked: 'To assess your practical command of ' + focus + '.', tip: 'Give a concrete example: the situation, your actions, and the measurable outcome.' });
  }

  questions.push({ category: 'behavioral', question: 'Tell me about a time you delivered a complex piece of work under pressure.', whyAsked: 'To understand how you handle deadlines and ambiguity.', tip: 'Use the STAR method: Situation, Task, Action, Result.' });
  questions.push({ category: 'behavioral', question: 'Describe a disagreement with a teammate and how you resolved it.', whyAsked: 'To assess collaboration and communication.', tip: 'Focus on the resolution and what you learned.' });
  questions.push({ category: 'situational', question: 'A critical deadline or client issue lands at the last minute. What do you do?', whyAsked: 'To evaluate how you handle pressure and prioritise.', tip: 'Walk through triage, communication, prioritisation, and resolution.' });
  questions.push({ category: 'role', question: 'Walk us through how you would approach your first 90 days as a ' + job.title + '.', whyAsked: 'To understand your plan and priorities for the role.', tip: 'Show you understand the core responsibilities and where you would make an early impact.' });
  questions.push({ category: 'role', question: 'Why do you want to work at ' + job.company + '?', whyAsked: 'To gauge genuine interest and cultural fit.', tip: 'Reference the company, the product, and how the role matches your strengths.' });

  const gaps = matchJob(profile, job).missingSkills;
  const fallbackNotes = () =>
    [
      'Re-read the job description and map each requirement to a concrete example from your experience.',
      'Brush up on ' + (req.slice(0, 4).join(', ') || 'the core requirements') + '.',
      gaps.length ? 'Be ready to speak to gaps around: ' + gaps.join(', ') + ' - frame them as learning you are actively pursuing.' : 'Your profile covers the core requirements well - come prepared with strong examples.',
      'Prepare two or three questions to ask the interviewer about the team and roadmap.',
    ].filter((n) => n && n.trim().length > 0);

  const notesPrompt =
    'Job: ' + job.title + ' at ' + job.company + '\n' +
    'Required skills: ' + (req.join(', ') || 'the core requirements') + '\n' +
    'Candidate gaps: ' + (gaps.join(', ') || 'none') + '\n\n' +
    'Write 4 short interview preparation notes for this candidate. One per line, no bullets or numbering.';

  const notesText = await llmOrFallback({ system: COACH_SYSTEM, user: notesPrompt, maxTokens: 300, temperature: 0.5 }, fallbackNotes);
  const preparationNotes = notesText
    .split('\n')
    .map((s) => s.replace(/^[-*\u2022\u00b7\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  return { job, questions, preparationNotes: preparationNotes.length ? preparationNotes : fallbackNotes() };
}
