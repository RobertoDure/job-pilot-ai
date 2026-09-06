import type {
  CandidateProfile,
  EducationEntry,
  ExperienceEntry,
  RemotePref,
  Seniority,
  SkillEntry,
} from '../domain';
import { detectSkillsInText, SKILLS } from '../data/skills';
import { detectIndustriesInText } from '../data/industries';
import { newId } from '../util';

const CITIES = [
  'dublin', 'cork', 'galway', 'limerick', 'belfast', 'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'bristol', 'leeds',
  'new york', 'los angeles', 'san francisco', 'chicago', 'boston', 'austin', 'seattle', 'miami', 'atlanta', 'denver', 'dallas', 'washington',
  'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary',
  'sydney', 'melbourne', 'brisbane', 'perth', 'auckland',
  'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne', 'paris', 'madrid', 'barcelona', 'rome', 'milan', 'amsterdam', 'rotterdam',
  'brussels', 'zurich', 'geneva', 'vienna', 'stockholm', 'copenhagen', 'oslo', 'helsinki', 'lisbon', 'porto', 'warsaw', 'prague',
  'budapest', 'athens', 'istanbul', 'dubai', 'doha', 'singapore', 'hong kong', 'tokyo', 'seoul', 'bangalore', 'bengaluru', 'mumbai',
  'delhi', 'sao paulo', 'mexico city', 'buenos aires', 'johannesburg', 'cape town', 'nairobi', 'lagos', 'cairo', 'remote',
];
const COUNTRIES: Record<string, string> = {
  ireland: 'Ireland',
  uk: 'United Kingdom', 'united kingdom': 'United Kingdom', 'gb': 'United Kingdom', 'england': 'United Kingdom', 'scotland': 'United Kingdom', 'wales': 'United Kingdom',
  usa: 'United States', 'us': 'United States', 'united states': 'United States', 'america': 'United States',
  canada: 'Canada', australia: 'Australia', 'new zealand': 'New Zealand', singapore: 'Singapore', india: 'India',
  germany: 'Germany', 'deutschland': 'Germany', france: 'France', spain: 'Spain', italy: 'Italy', portugal: 'Portugal',
  netherlands: 'Netherlands', 'the netherlands': 'Netherlands', 'holland': 'Netherlands', belgium: 'Belgium', switzerland: 'Switzerland',
  austria: 'Austria', sweden: 'Sweden', denmark: 'Denmark', norway: 'Norway', finland: 'Finland', poland: 'Poland',
  'czech republic': 'Czech Republic', 'czechia': 'Czech Republic', hungary: 'Hungary', greece: 'Greece', turkey: 'Turkey',
  'united arab emirates': 'United Arab Emirates', 'uae': 'United Arab Emirates', qatar: 'Qatar', 'saudi arabia': 'Saudi Arabia',
  'hong kong': 'Hong Kong', japan: 'Japan', 'south korea': 'South Korea', china: 'China', 'philippines': 'Philippines',
  brazil: 'Brazil', mexico: 'Mexico', argentina: 'Argentina', colombia: 'Colombia', chile: 'Chile',
  'south africa': 'South Africa', nigeria: 'Nigeria', kenya: 'Kenya', egypt: 'Egypt',
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function stripBullet(s: string): string {
  return s.replace(/^\s*(?:[-*\u2022\u00b7]\s*)+/, '').trim();
}

function toLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.replace(/\r/g, '').trim());
}

const HEADINGS = new Set([
  'summary', 'professional summary', 'profile', 'objective',
  'skills', 'technical skills', 'core skills', 'key skills',
  'experience', 'work experience', 'employment', 'employment history', 'professional experience',
  'education', 'education and training', 'academic background',
  'certifications', 'certificates', 'licenses',
  'preferences', 'personal preferences',
  'career goals', 'career objective', 'goals',
]);

function isHeading(line: string): string | null {
  const l = norm(line).replace(/[:\s]+$/, '');
  if (l.length < 30 && HEADINGS.has(l)) return l;
  return null;
}

export function extractName(lines: string[]): string {
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    if (/^[A-Z][a-zA-Z'.-]+(?: [A-Z][a-zA-Z'.-]+){0,2}$/.test(t)) return t;
    if (t.startsWith('Name:')) return t.slice(5).trim();
  }
  return 'Candidate';
}

export function extractHeadline(lines: string[]): string {
  for (const l of lines.slice(1, 6)) {
    const t = l.trim();
    if (!t) continue;
    // A headline line typically carries "|" separators or states years of
    // experience. Keep it role-agnostic so any profession is recognised.
    if (t.includes('|') || /\b\d+\+?\s*years?\b/i.test(t) || /\byears?\s+(of\s+)?experience\b/i.test(t)) return t;
  }
  return '';
}

function sectionLines(lines: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let current = '__preamble__';
  for (const line of lines) {
    const h = isHeading(line);
    if (h) {
      current = h;
      map.set(current, []);
    } else {
      if (!map.has(current)) map.set(current, []);
      map.get(current)!.push(line);
    }
  }
  return map;
}

function extractYearsFromText(text: string): number | null {
  const t = norm(text);
  const re = /(?:over\s+|more than\s+)?(\d{1,2})\+?\s*(?:years?|yrs?)\b/g;
  let max: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const v = parseInt(m[1], 10);
    if (v > 0 && v < 50 && (max === null || v > max)) max = v;
  }
  return max;
}

function parseDateSpan(text: string): { start: number; end: number } | null {
  const m = norm(text).match(/(20\d{2})\s*(?:-|–|—|to)\s*(20\d{2}|present|now|current)/);
  if (!m) return null;
  const start = parseInt(m[1], 10);
  const end = m[2] === 'present' || m[2] === 'now' || m[2] === 'current' ? new Date().getFullYear() : parseInt(m[2], 10);
  if (end >= start && end <= 2100) return { start, end };
  return null;
}

export function extractTotalYears(text: string, experience: ExperienceEntry[]): number {
  const direct = extractYearsFromText(text);
  if (direct !== null && direct > 0) return direct;
  let total = 0;
  for (const e of experience) {
    const s = parseInt(e.start, 10);
    const en = e.end === 'Present' || e.end === 'present' ? new Date().getFullYear() : parseInt(e.end, 10);
    if (!Number.isNaN(s) && !Number.isNaN(en) && en >= s) total += en - s;
  }
  return total > 0 ? total : 5;
}

export function inferSeniority(title: string, years: number): Seniority {
  const t = norm(title);
  if (/\bprincipal\b/.test(t)) return 'principal';
  if (/\bstaff\b/.test(t)) return 'staff';
  if (/\blead\b/.test(t)) return 'lead';
  if (/\bsenior\b/.test(t)) return 'senior';
  if (/\bjunior\b/.test(t)) return 'junior';
  if (years >= 8) return 'senior';
  if (years >= 3) return 'mid';
  return 'junior';
}

function parseExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const titleMatch = line.match(/^(.+?)\s+-\s+(.+?),\s*(.+?)\s*\(?\s*(\d{4})\s*(?:-|–|—|to)\s*(\d{4}|present|current)\)?/i);
    if (titleMatch) {
      if (current) entries.push(current);
      current = {
        title: titleMatch[1].trim(),
        company: titleMatch[2].trim(),
        start: titleMatch[4],
        end: titleMatch[5].toLowerCase() === 'present' || titleMatch[5].toLowerCase() === 'current' ? 'Present' : titleMatch[5],
        description: '',
        highlights: [],
      };
      continue;
    }
    if (/^[-*\u2022\u00b7]/.test(line)) {
      if (current) current.highlights.push(stripBullet(line));
      else {
        if (!current) current = { title: '', company: '', start: '', end: '', description: '', highlights: [stripBullet(line)] };
      }
      continue;
    }
    // A plain role line without a company (e.g. "Senior Java Developer (2021 - Present)")
    const roleOnly = line.match(/^(.+?)\s*\(?\s*(\d{4})\s*(?:-|–|—|to)\s*(\d{4}|present|current)\)?/i);
    if (roleOnly) {
      if (current) entries.push(current);
      current = {
        title: roleOnly[1].trim(),
        company: '',
        start: roleOnly[2],
        end: roleOnly[3].toLowerCase() === 'present' || roleOnly[3].toLowerCase() === 'current' ? 'Present' : roleOnly[3],
        description: '',
        highlights: [],
      };
      continue;
    }
    if (current) current.description += (current.description ? ' ' : '') + line;
  }
  if (current) entries.push(current);
  return entries.filter((e) => e.title);
}

function parseEducation(lines: string[]): EducationEntry[] {
  const out: EducationEntry[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const deg =
      /phd|doctor/i.test(line) ? 'PhD' :
      /master|msc|m\.?sc|meng/i.test(line) ? 'MSc' :
      /bachelor|bsc|b\.?sc|b\.?eng|b\.?a\b/i.test(line) ? 'BSc' :
      /diploma|certificate/i.test(line) ? 'Diploma' : '';
    if (deg) {
      const yearM = line.match(/(20\d{2})/);
      const schoolM = line.match(/,\s*(.+?)\s*\(/);
      out.push({
        degree: deg,
        field: line,
        school: schoolM ? schoolM[1].trim() : '',
        year: yearM ? yearM[1] : '',
      });
    }
  }
  return out;
}

function parseSalary(text: string): { min: number; max: number; currency: string } {
  const t = norm(text);
  const re = /(eur|euro|€|£|gbp|usd|\$)\s*(\d[\d,. ]*)\s*(k)?\s*(?:-|–|—|to)\s*(?:eur|euro|€|£|gbp|usd|\$)?\s*(\d[\d,. ]*)\s*(k)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    let currency = 'EUR';
    const cur = m[1];
    if (cur === '£' || cur === 'gbp') currency = 'GBP';
    else if (cur === 'usd' || cur === '$') currency = 'USD';
    else currency = 'EUR';
    const a = parseFloat(m[2].replace(/[,\s]/g, ''));
    const b = parseFloat(m[4].replace(/[,\s]/g, ''));
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const multA = m[3] ? 1000 : 1;
    const multB = m[5] ? 1000 : 1;
    const lo = Math.min(a * multA, b * multB);
    const hi = Math.max(a * multA, b * multB);
    if (lo > 0 && hi >= lo && hi < 1000000) return { min: lo, max: hi, currency };
  }
  return { min: 60000, max: 90000, currency: 'EUR' };
}

function parseLocation(text: string): { city: string; country: string } {
  const t = norm(text);
  for (const c of CITIES) {
    if (new RegExp('\\b' + c + '\\b').test(t)) {
      return { city: c === 'remote' ? 'Remote' : c.replace(/\b[a-z]/g, (ch) => ch.toUpperCase()), country: detectCountry(t) };
    }
  }
  return { city: 'Remote', country: detectCountry(t) };
}

function detectCountry(t: string): string {
  const lower = ' ' + t.toLowerCase() + ' ';
  for (const [k, v] of Object.entries(COUNTRIES)) {
    // Short codes ("us", "uk", "gb") must match as whole words to avoid false
    // positives inside prose ("house", "focus", "hubbub").
    if (k.length <= 3) {
      if (new RegExp('\\b' + k + '\\b').test(lower)) return v;
    } else if (lower.includes(k)) {
      return v;
    }
  }
  return '';
}

function parseRemote(text: string): RemotePref {
  const t = norm(text);
  if (/remote|work from home|wfh/.test(t) && /hybrid/.test(t)) return 'hybrid';
  if (/\bremote\b|work from home|wfh/.test(t)) return 'remote';
  if (/hybrid/.test(t)) return 'hybrid';
  if (/on-?site|office based|in office/.test(t)) return 'onsite';
  return 'hybrid';
}

function parseAuthorization(text: string): string[] {
  const t = norm(text);
  const out: string[] = [];
  if (/eu citizen|european union|eu national/.test(t)) out.push('EU Citizen');
  if (/stamp 1\b/.test(t)) out.push('Stamp 1');
  if (/stamp 4\b/.test(t)) out.push('Stamp 4');
  if (/work permit|employment permit/.test(t)) out.push('Work Permit');
  if (/eligible to work|right to work/.test(t)) out.push('Eligible to Work');
  if (/citizen|national/.test(t) && out.length === 0) out.push('Citizen');
  return out;
}

function parseIndustries(text: string): string[] {
  return detectIndustriesInText(text);
}

function parseRoles(text: string, experience: ExperienceEntry[], headline: string): string[] {
  const t = norm(text);
  const roles = new Set<string>();
  const target = t.match(/target role[s]?\s*:\s*(.+)/);
  if (target) target[1].split(/[/,]/).forEach((r) => { const v = r.trim(); if (v) roles.add(v); });
  for (const e of experience) if (e.title) roles.add(e.title);
  // No hard-coded tech fallback: derive from the headline line, or leave roles
  // empty so the pipeline searches by skills for fields without a stated title.
  if (roles.size === 0 && headline) roles.add(headline);
  return [...roles].slice(0, 6);
}

function parseCertifications(text: string): string[] {
  const lines = toLines(text);
  const out: string[] = [];
  for (const l of lines) {
    if (/certified|certificate|certification|licen[sc]e|chartered|accredited|accreditation|\b(pmp|cpa|acca|cima|cfa|cipd|shrm|prince2|itil|six sigma|cissp|ceh|cma|cpr|bls|acls|servsafe|haccp|osha|pmi|ccna|ccnp)\b/i.test(l)) {
      const v = l.replace(/^\s*[-*\u2022\u00b7]\s*/, '').trim();
      if (v) out.push(v);
    }
  }
  return [...new Set(out)];
}

function parseCareerGoals(text: string): string[] {
  const t = norm(text);
  const m = t.match(/career goals?\s*[:]?\s*(.+)$/m);
  if (m) return [m[1].trim()];
  return [];
}

function buildSkills(text: string, totalYears: number): SkillEntry[] {
  const found = detectSkillsInText(text);
  const skillsSection = sectionLines(toLines(text)).get('skills') || [];
  const ordered = skillsSection.map(stripBullet).filter(Boolean).join(' ');

  // Capture skills listed in the dedicated skills section that fall outside the
  // built-in taxonomy (e.g. healthcare, sales, finance, trades). This keeps the
  // parser usable for any profession without an exhaustive dictionary.
  const rawSkills: string[] = [];
  for (const line of skillsSection) {
    for (const part of stripBullet(line).split(/[,\u2022\u00b7;]+/)) {
      const name = part.replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 40) continue;
      if (name.split(' ').length > 5) continue;
      if (/\d+\s*(years?|yrs?)\b/i.test(name)) continue;
      if (/^(technical|core|key|other|main)\s+skills?$/i.test(name)) continue;
      rawSkills.push(name);
    }
  }

  const names: string[] = [];
  const seen = new Set<string>();
  for (const n of [...found, ...rawSkills]) {
    const key = n.toLowerCase();
    if (!seen.has(key)) { seen.add(key); names.push(n); }
  }

  // Order detected skills by their appearance in the dedicated skills section first.
  names.sort((a, b) => {
    const ia = ordered.toLowerCase().indexOf(a.toLowerCase());
    const ib = ordered.toLowerCase().indexOf(b.toLowerCase());
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const entries: SkillEntry[] = names.map((name) => {
    const t = norm(text);
    let level: SkillEntry['level'] = 'intermediate';
    const idx = t.indexOf(name.toLowerCase());
    const ctx = idx >= 0 ? t.slice(Math.max(0, idx - 40), idx + name.length + 40) : '';
    if (/expert|advanced|strong|proficient/.test(ctx)) level = 'expert';
    else if (/experienced/.test(ctx)) level = 'advanced';
    return { name, years: totalYears, level };
  });
  return entries;
}

export function parseCv(rawText: string): CandidateProfile {
  const text = rawText.trim();
  const lines = toLines(text);
  const sections = sectionLines(lines);
  const name = extractName(lines);
  const headline = extractHeadline(lines);
  const summary = (sections.get('summary') || sections.get('professional summary') || sections.get('profile') || []).filter(Boolean).join(' ');
  const expLines = sections.get('experience') || sections.get('work experience') || sections.get('employment') || sections.get('employment history') || sections.get('professional experience') || [];
  const experience = parseExperience(expLines);
  const totalYears = extractTotalYears(text, experience);
  const education = parseEducation(sections.get('education') || sections.get('education and training') || []);
  const certifications = parseCertifications(text);
  const salaryExpectation = parseSalary(text);
  const location = parseLocation(text);
  const remotePreference = parseRemote(text);
  const workAuthorization = parseAuthorization(text);
  // Industries should reflect the candidate's work, not their alma mater, so
  // detect from the summary + experience + an explicit "Industries:" line
  // (excluding the education section, which mentions universities).
  const industries = parseIndustries([
    summary,
    ...experience.flatMap((e) => [e.title, e.description, ...e.highlights]),
    text.match(/industr(?:y|ies)\s*:\s*([^\n]+)/i)?.[1] ?? '',
  ].join(' '));
  const preferredRoles = parseRoles(text, experience, headline);
  const careerGoals = parseCareerGoals(text);
  const skills = buildSkills(text, totalYears);
  const seniority = inferSeniority((experience[0] && experience[0].title) || headline || name, totalYears);

  return {
    id: newId('profile'),
    name,
    email: '',
    headline: headline || (experience[0] && experience[0].title) || 'Professional',
    summary,
    skills,
    experience,
    education,
    certifications,
    salaryExpectation,
    location,
    remotePreference,
    workAuthorization,
    industries,
    preferredRoles,
    careerGoals,
    totalYears,
    seniority,
    rawCvText: text,
  };
}
