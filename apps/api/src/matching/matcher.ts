import type {
  CandidateProfile,
  CategoryScore,
  Job,
  MatchResult,
  Recommendation,
  Seniority,
} from '../domain';
import { detectSkillsInText } from '../data/skills';
import { isGenericRoleWord, roleTokensFrom } from '../data/roles';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number): number {
  return Math.round(v);
}

function maxYears(text: string): number | null {
  const re = /(\d{1,2})\+?\s*(?:years?|yrs?)\b/g;
  let max: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text.toLowerCase())) !== null) {
    const v = parseInt(m[1], 10);
    if (v > 0 && v < 50 && (max === null || v > max)) max = v;
  }
  return max;
}

type Degree = 'bachelors' | 'masters' | 'phd' | null;

function detectDegree(text: string): Degree {
  const t = text.toLowerCase();
  if (/\bphd\b|\bdoctorate\b|\bdoctoral\b/.test(t)) return 'phd';
  if (/\bmaster|\bmsc\b|\bm\.?sc\b|\bmeng\b|\bpostgraduate\b/.test(t)) return 'masters';
  if (/\bbachelor|\bbsc\b|\bb\.?sc\b|\bdegree\b|\bb\.?eng\b|\bundergraduate\b/.test(t)) return 'bachelors';
  return null;
}

function detectAuthRequired(text: string): boolean {
  const t = text.toLowerCase();
  return /work authorization|right to work|eligible to work|work permit|visa|stamp [14]|eu citizen|authorization to work/.test(t);
}

function requiredSkills(job: Job): string[] {
  const text = [job.title, ...job.requirements].join(' ');
  return detectSkillsInText(text);
}

function niceSkills(job: Job): string[] {
  return detectSkillsInText(job.niceToHave.join(' '));
}

const SENIORITY_RANK: Record<Seniority, number> = {
  intern: 0, junior: 1, mid: 2, senior: 3, lead: 4, staff: 5, principal: 6, unknown: 2,
};

function requiredYearsBySeniority(job: Job): number {
  if (job.seniority === 'junior') return 2;
  if (job.seniority === 'mid') return 4;
  if (job.seniority === 'senior') return 6;
  if (job.seniority === 'lead') return 7;
  if (job.seniority === 'staff') return 8;
  if (job.seniority === 'principal') return 10;
  return 4;
}

function roleOverlapScore(profile: CandidateProfile, job: Job): number {
  const profileTitles = [profile.headline || '', ...profile.preferredRoles, ...profile.experience.map((e) => e.title)].join(' ');
  const profRoles = roleTokensFrom(profileTitles);
  if (profRoles.length === 0) return 70;
  // Domain-specific tokens carry the signal; generic role-family words are used
  // only as a fallback so a "Marketing Manager" doesn't claim "Facilities Manager".
  const specific = profRoles.filter((r) => !isGenericRoleWord(r));
  const pool = specific.length ? specific : profRoles;
  const jobTitle = job.title.toLowerCase();
  const matched = pool.filter((r) => jobTitle.includes(r));
  if (matched.length === 0) return 55;
  const ratio = matched.length / pool.length;
  if (ratio >= 0.67) return 100;
  if (ratio >= 0.34) return 80;
  return 60;
}

function skillsScore(profile: CandidateProfile, job: Job): { score: number; matched: string[]; missing: string[] } {
  const req = requiredSkills(job);
  const nice = niceSkills(job);
  const profileSet = new Set(profile.skills.map((s) => s.name.toLowerCase()));
  const matched = req.filter((s) => profileSet.has(s.toLowerCase()));
  const missing = req.filter((s) => !profileSet.has(s.toLowerCase()));
  const matchedNice = nice.filter((s) => profileSet.has(s.toLowerCase()));
  const denom = req.length + nice.length * 0.4;
  if (denom === 0) return { score: 100, matched, missing };
  const score = round((100 * (matched.length + matchedNice.length * 0.4)) / denom);
  return { score: clamp(score, 0, 100), matched, missing };
}

function experienceScore(profile: CandidateProfile, job: Job): number {
  const reqYears = maxYears([job.description, ...job.requirements].join(' ')) ?? requiredYearsBySeniority(job);
  const yearsRatio = reqYears > 0 ? clamp(profile.totalYears / reqYears, 0, 1) : 1;
  const yearsScore = yearsRatio * 100;
  const roleScore = roleOverlapScore(profile, job);
  return round(yearsScore * 0.75 + roleScore * 0.25);
}

function locationScore(profile: CandidateProfile, job: Job): number {
  const jobCity = job.location.city.toLowerCase();
  const profCity = profile.location.city.toLowerCase();
  const sameCountry = job.location.country.toLowerCase() === profile.location.country.toLowerCase();

  if (jobCity !== 'remote' && jobCity === profCity) return 100;
  if (job.remote === 'remote' && (profile.remotePreference === 'remote' || profile.remotePreference === 'hybrid' || profile.remotePreference === 'any')) return 100;
  if (job.remote === 'hybrid' && profile.remotePreference === 'hybrid' && sameCountry) return 90;
  if (job.remote === 'remote') return 90;
  if (sameCountry) return 80;
  return 40;
}

function salaryScore(profile: CandidateProfile, job: Job): number {
  const { min: pMin } = profile.salaryExpectation;
  const jMax = job.salary.max;
  if (jMax <= 0) return 100; // salary not disclosed -> no penalty
  if (jMax < pMin) return round(clamp((100 * jMax) / pMin, 20, 95));
  return 100;
}

function educationScore(profile: CandidateProfile, job: Job): number {
  const required = detectDegree([job.description, ...job.requirements].join(' '));
  if (!required) return 100;
  const rank: Record<'bachelors' | 'masters' | 'phd', number> = { bachelors: 1, masters: 2, phd: 3 };
  const profRanks: number[] = profile.education.map((e) => {
    const t = e.degree.toLowerCase();
    if (t.includes('phd') || t.includes('doctor')) return 3;
    if (t.includes('m')) return 2;
    return 1;
  });
  if (profRanks.length === 0) profRanks.push(0);
  const profRank = Math.max(...profRanks);
  const reqRank = rank[required];
  if (profRank >= reqRank) return 100;
  if (profRank === reqRank - 1) return 70;
  return 40;
}

function seniorityScore(profile: CandidateProfile, job: Job): number {
  if (job.seniority === 'unknown') return 100;
  const diff = SENIORITY_RANK[profile.seniority] - SENIORITY_RANK[job.seniority];
  if (diff >= 0) return 100;
  if (diff === -1) return 75;
  return 50;
}

function authorizationScore(profile: CandidateProfile, job: Job): number {
  const required = detectAuthRequired([job.description, ...job.requirements].join(' '));
  if (!required) return 100;
  if (profile.workAuthorization.length > 0) return 100;
  return 40;
}

function competitionScore(job: Job): number {
  const title = job.title.toLowerCase();
  let pressure = 12;
  if (/senior|lead|staff|principal|director|head/.test(title)) pressure += 8;
  const salaryPremium = (job.salary.max - 65000) / 1000;
  pressure += clamp(salaryPremium, 0, 18);
  const HUBS = new Set(['dublin', 'london', 'new york', 'san francisco', 'amsterdam', 'berlin', 'singapore', 'toronto', 'sydney']);
  if (HUBS.has(job.location.city.toLowerCase())) pressure += 5;
  return round(clamp(100 - pressure, 35, 85));
}

function recommendationFor(overall: number): Recommendation {
  if (overall >= 80) return 'APPLY';
  if (overall >= 62) return 'CONSIDER';
  return 'SKIP';
}

function recommendationReason(rec: Recommendation, overall: number): string {
  if (rec === 'APPLY') return 'Your profile is highly compatible with this role. Apply with confidence.';
  if (rec === 'CONSIDER') return 'You match a good share of the requirements, but there are a few gaps. Worth a tailored application.';
  return 'Your profile has significant gaps against this role. Deprioritise unless you close them.';
}

export function matchJob(profile: CandidateProfile, job: Job): MatchResult {
  const skills = skillsScore(profile, job);
  const exp = experienceScore(profile, job);
  const loc = locationScore(profile, job);
  const sal = salaryScore(profile, job);
  const edu = educationScore(profile, job);
  const sen = seniorityScore(profile, job);
  const auth = authorizationScore(profile, job);

  const weights: [number, number, number, number, number, number, number] = [0.34, 0.2, 0.1, 0.1, 0.1, 0.1, 0.06];
  const scores = [skills.score, exp, loc, sal, edu, sen, auth];
  const overall = round(scores.reduce((acc, s, i) => acc + s * weights[i], 0));

  const categories: CategoryScore[] = [
    { key: 'skills', label: 'Skills', score: skills.score, weight: 0.34, detail: skills.matched.length + ' of ' + (skills.matched.length + skills.missing.length) + ' required skills matched' },
    { key: 'experience', label: 'Experience', score: exp, weight: 0.2, detail: profile.totalYears + ' years experience vs. role requirements' },
    { key: 'location', label: 'Location', score: loc, weight: 0.1, detail: job.location.city + ' (' + job.remote + ')' },
    { key: 'salary', label: 'Salary', score: sal, weight: 0.1, detail: job.salary.max > 0 ? job.salary.min + ' - ' + job.salary.max + ' ' + job.salary.currency + ' vs. expectation ' + profile.salaryExpectation.min + ' - ' + profile.salaryExpectation.max : 'Salary not disclosed by employer' },
    { key: 'education', label: 'Education', score: edu, weight: 0.1, detail: 'Degree requirements' },
    { key: 'seniority', label: 'Seniority', score: sen, weight: 0.1, detail: job.seniority + ' role vs. ' + profile.seniority + ' profile' },
    { key: 'authorization', label: 'Work authorization', score: auth, weight: 0.06, detail: profile.workAuthorization.length ? profile.workAuthorization.join(', ') : 'Not specified' },
  ];

  const reqYears = maxYears([job.description, ...job.requirements].join(' '));
  const degreeReq = detectDegree([job.description, ...job.requirements].join(' '));
  const authReq = detectAuthRequired([job.description, ...job.requirements].join(' '));
  const yearsMet = reqYears === null || profile.totalYears >= reqYears;
  const degreeMet = degreeReq === null || educationScore(profile, job) >= 90;
  const authMet = !authReq || profile.workAuthorization.length > 0;

  const totalRequirements = skills.matched.length + skills.missing.length + (reqYears !== null ? 1 : 0) + (degreeReq ? 1 : 0) + (authReq ? 1 : 0);
  const matchedRequirements = skills.matched.length + (reqYears !== null && yearsMet ? 1 : 0) + (degreeReq && degreeMet ? 1 : 0) + (authReq && authMet ? 1 : 0);

  const whyYouMatch: string[] = [];
  whyYouMatch.push('You meet ' + matchedRequirements + ' of the ' + totalRequirements + ' key requirements.');
  if (skills.matched.length >= 3) whyYouMatch.push('Strong overlap on core skills: ' + skills.matched.slice(0, 4).join(', ') + '.');
  if (yearsMet && reqYears !== null) whyYouMatch.push('Your ' + profile.totalYears + ' years of experience clears the ' + reqYears + ' years required.');
  if (loc >= 90) whyYouMatch.push('Great location fit (' + job.location.city + ', ' + job.remote + ').');
  if (sal === 100 && job.salary.max >= profile.salaryExpectation.min) whyYouMatch.push('Salary band aligns with your expectation.');
  if (whyYouMatch.length < 2) whyYouMatch.push('Review the gaps below before investing time in this application.');

  const rec = recommendationFor(overall);

  return {
    job,
    overallScore: overall,
    categories,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    matchedRequirements,
    totalRequirements,
    recommendation: rec,
    recommendationReason: recommendationReason(rec, overall),
    whyYouMatch,
    applicationProbability: {
      interview: round(overall * 0.9),
      skills: skills.score,
      experience: exp,
      education: edu,
      location: loc,
      competition: competitionScore(job),
    },
  };
}

export function rankMatches(profile: CandidateProfile, jobs: Job[]): MatchResult[] {
  return jobs.map((j) => matchJob(profile, j)).sort((a, b) => b.overallScore - a.overallScore);
}
