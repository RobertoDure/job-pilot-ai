// Real job providers: fetches live postings from public job-board APIs and
// normalises them into the Job domain type. Every provider below is a genuine,
// documented API. Indeed's GraphQL API (https://apis.indeed.com/graphql) is
// wired in below: the Job Sync API posts/manages jobs, and candidate-facing
// search uses the gated jobSearch query, which requires the
// job-retrieval-service entitlement on your Indeed partner app. When Indeed
// credentials are set, the adapter below adds board-native Indeed postings;
// LinkedIn listings continue to come through the Adzuna/Jooble aggregators.
import type { Job, RemotePref, Seniority } from '../domain';
import { detectSkillsInText } from '../data/skills';
import { GENERIC_ROLE_WORDS, rolePhrasesFrom, roleTokensFrom } from '../data/roles';
import { detectIndustryLabel } from '../data/industries';
import {
  ADZUNA_APP_ID,
  ADZUNA_APP_KEY,
  APIFY_API_TOKEN,
  APIFY_INDEED_ACTOR_ID,
  INDEED_ACCESS_TOKEN,
  INDEED_CLIENT_ID,
  INDEED_CLIENT_SECRET,
  INDEED_GRAPHQL_URL,
  INDEED_OAUTH_URL,
  JOOBLE_API_KEY,
} from '../config';

export interface JobQuery {
  keywords: string[];
  roleTokens: string[];
  rolePhrases: string[];
  skillTokens: string[];
  country: string;
  city: string;
  remoteOk: boolean;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'User-Agent': 'jobpilot-ai/0.1', Accept: 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Raw HTML/text fetch (used by the PublicJobs adapter, which parses HTML).
async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'jobpilot-ai/0.1', Accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ',
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, d: string) => {
      try { return String.fromCodePoint(parseInt(d, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, d: string) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ''; }
    })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (m) => named[m.toLowerCase()] ?? m);
}

function stripHtml(html: string): string {
  if (!html) return '';
  const text = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|ul|ol|tr|section|article)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ');
  return decodeEntities(text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractListItems(html: string): string[] {
  const out: string[] = [];
  const re = /<\s*li[^>]*>([\s\S]*?)<\s*\/\s*li\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < 10) {
    const t = stripHtml(m[1]).replace(/\s+/g, ' ').trim();
    if (t && t.length >= 3 && !out.includes(t)) out.push(t);
  }
  return out;
}

const COUNTRY_ALIAS: Record<string, string> = {
  'usa': 'United States', 'us': 'United States', 'united states': 'United States', 'america': 'United States', 'united states of america': 'United States',
  'uk': 'United Kingdom', 'gb': 'United Kingdom', 'united kingdom': 'United Kingdom', 'england': 'United Kingdom', 'scotland': 'United Kingdom', 'wales': 'United Kingdom',
  'ireland': 'Ireland', 'germany': 'Germany', 'deutschland': 'Germany',
  'france': 'France', 'netherlands': 'Netherlands', 'the netherlands': 'Netherlands', 'holland': 'Netherlands',
  'spain': 'Spain', 'italy': 'Italy', 'portugal': 'Portugal', 'poland': 'Poland', 'sweden': 'Sweden', 'denmark': 'Denmark',
  'finland': 'Finland', 'norway': 'Norway', 'switzerland': 'Switzerland', 'austria': 'Austria', 'belgium': 'Belgium',
  'canada': 'Canada', 'australia': 'Australia', 'singapore': 'Singapore', 'india': 'India', 'new zealand': 'New Zealand',
  'remote': 'Remote', 'anywhere': 'Worldwide', 'worldwide': 'Worldwide', 'europe': 'Europe',
};

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  'united states': 'USD', 'usa': 'USD', 'us': 'USD',
  'united kingdom': 'GBP', 'uk': 'GBP', 'gb': 'GBP', 'england': 'GBP',
  'canada': 'CAD', 'australia': 'AUD', 'singapore': 'SGD', 'new zealand': 'NZD',
};

function currencyForCountryCode(code: string): string {
  const map: Record<string, string> = { gb: 'GBP', us: 'USD', ca: 'CAD', au: 'AUD', nz: 'NZD', sg: 'SGD' };
  return map[code.toLowerCase()] || 'EUR';
}

const CITY_TO_COUNTRY: Record<string, string> = {
  'berlin': 'Germany', 'munich': 'Germany', 'hamburg': 'Germany', 'cologne': 'Germany', 'frankfurt': 'Germany',
  'stuttgart': 'Germany', 'siegen': 'Germany', 'konstanz': 'Germany', 'dusseldorf': 'Germany', 'leipzig': 'Germany',
  'london': 'United Kingdom', 'manchester': 'United Kingdom', 'birmingham': 'United Kingdom', 'edinburgh': 'United Kingdom',
  'bristol': 'United Kingdom', 'leeds': 'United Kingdom', 'glasgow': 'United Kingdom',
  'dublin': 'Ireland', 'cork': 'Ireland', 'galway': 'Ireland', 'limerick': 'Ireland',
  'paris': 'France', 'amsterdam': 'Netherlands', 'madrid': 'Spain', 'barcelona': 'Spain', 'lisbon': 'Portugal',
  'warsaw': 'Poland', 'stockholm': 'Sweden', 'copenhagen': 'Denmark', 'helsinki': 'Finland', 'oslo': 'Norway',
  'zurich': 'Switzerland', 'vienna': 'Austria', 'brussels': 'Belgium',
  'new york': 'United States', 'san francisco': 'United States', 'austin': 'United States', 'seattle': 'United States',
  'boston': 'United States', 'chicago': 'United States', 'los angeles': 'United States', 'denver': 'United States',
  'toronto': 'Canada', 'vancouver': 'Canada', 'sydney': 'Australia', 'melbourne': 'Australia', 'singapore': 'Singapore',
  'bangalore': 'India', 'bengaluru': 'India', 'mumbai': 'India',
};

const US_STATES = new Set(['al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia','ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt','va','wa','wv','wi','wy','dc']);

// Ambiguous short codes that must never be matched inside free-text prose.
const PROSE_EXCLUDE = new Set(['us', 'uk', 'gb']);

function normalizeCountry(raw: string, text: string): string {
  const t = raw.trim();
  if (t) {
    const key = t.toLowerCase();
    if (COUNTRY_ALIAS[key]) return COUNTRY_ALIAS[key];
    // Multi-location lists (e.g. "Europe, USA, UK") are effectively worldwide.
    if (t.split(',').length > 2) return 'Worldwide';
    return t;
  }
  const lower = ' ' + text.toLowerCase() + ' ';
  for (const [k, v] of Object.entries(COUNTRY_ALIAS)) {
    if (PROSE_EXCLUDE.has(k)) continue;
    if (new RegExp('\\b' + k.replace(/ /g, '\\s+') + '\\b').test(lower)) return v;
  }
  return '';
}

function currencyFor(country: string, fallback = 'EUR'): string {
  const c = country.toLowerCase();
  return CURRENCY_BY_COUNTRY[c] || fallback;
}

// Parses salary strings such as "€70,000 - €90,000", "$65,000 - $80,000",
// "175k - 190k". Hourly/rate-only strings return null (unknown annual salary).
function parseSalaryText(text: string, country: string): { min: number; max: number; currency: string } | null {
  if (!text) return null;
  const t = ' ' + text.toLowerCase().replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ') + ' ';
  if (/\bper hour\b|\/hour|\/hr\b|\bhourly\b|\bper day\b|\bper task\b|\bper month\b|\/month|\bmonthly\b/.test(t)) return null;
  let currency = '';
  if (/£|gbp/.test(t)) currency = 'GBP';
  else if (/\$|usd/.test(t)) currency = 'USD';
  else if (/€|eur\b|euro/.test(t)) currency = 'EUR';
  const m = t.match(/(?:[\$£€]|usd|eur|gbp)?\s*(\d[\d,.]*)\s*(k)?\s*(?:-|–|—|to)\s*(?:[\$£€]|usd|eur|gbp)?\s*(\d[\d,.]*)\s*(k)?/);
  if (!m) return null;
  const a = parseFloat(m[1].replace(/[,]/g, '')) * (m[2] ? 1000 : 1);
  const b = parseFloat(m[3].replace(/[,]/g, '')) * (m[4] ? 1000 : 1);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1000 || b < a || b > 2000000) return null;
  // Reject ranges that look like years rather than salaries (e.g. "2022-2026").
  if (a >= 1900 && a <= 2100 && b >= 1900 && b <= 2100) return null;
  return { min: a, max: b, currency: currency || currencyFor(country) };
}

function detectRemote(text: string, explicit?: RemotePref): RemotePref {
  if (explicit) return explicit;
  const t = text.toLowerCase();
  if (/\bremote\b|work from home|wfh|fully remote|anywhere/.test(t)) return 'remote';
  if (/\bhybrid\b/.test(t)) return 'hybrid';
  if (/\bon[- ]?site\b|office based|in office/.test(t)) return 'onsite';
  return 'remote';
}

function detectSeniority(text: string, level?: string): Seniority {
  const t = (text + ' ' + (level || '')).toLowerCase();
  if (/\bintern\b/.test(t)) return 'intern';
  if (/\bjunior\b|\bgraduate\b|entry[- ]level/.test(t)) return 'junior';
  if (/\bprincipal\b/.test(t)) return 'principal';
  if (/\bstaff\b/.test(t)) return 'staff';
  if (/\blead\b|\bhead of\b|\bdirector\b|\bvp\b|\bexecutive\b/.test(t)) return 'lead';
  if (/\bsenior\b|\bsr\.?\s/.test(t)) return 'senior';
  if (/\bmid\b|\bmidweight\b|\bmid-level\b/.test(t)) return 'mid';
  return 'unknown';
}

function detectIndustry(text: string, fallback: string): string {
  const label = decodeEntities(fallback).replace(/&amp;/g, '&').trim();
  const clean = label.toLowerCase();
  // Provider categories that are junk, or that name a role rather than an industry.
  const junk = new Set(['global', 'it', 'tech', 'revenue', 'quality office', 'space rangers', 'csa', 'consulting (seniors)', 'other', 'others', 'all others', 'miscellaneous', 'general', 'technology', 'software engineering', 'engineering']);
  const roleLike = /\b(engineer|engineering|manager|officer|specialist|consultant|developer|analyst|architect|scientist|recruiter|representative|coordinator|advisor|assistant|administrator|executive|technician|supervisor|director|clerk|associate|agent|strategist|planner|worker|operator|accountant|attorney|lawyer|teacher|nurse|physician|therapist|designer)\b/.test(clean);
  if (label && !junk.has(clean) && !roleLike) return label.slice(0, 40);
  return detectIndustryLabel(text) ?? 'General';
}

function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

interface RawJob {
  id: string;
  title: string;
  company: string;
  city: string;
  country: string;
  remote: RemotePref;
  salary: { min: number; max: number; currency: string };
  description: string;
  responsibilities: string[];
  url: string;
  postedAt: string;
  industry: string;
  seniority: Seniority;
  source: string;
}

function finalize(raw: RawJob): Job {
  const requirements = detectSkillsInText([raw.title, raw.description, ...raw.responsibilities].join(' '));
  const description = raw.description || raw.title;
  return {
    id: raw.id,
    title: raw.title,
    company: raw.company,
    location: { city: raw.city || 'Remote', country: raw.country || 'Worldwide' },
    remote: raw.remote,
    salary: raw.salary,
    description,
    responsibilities: raw.responsibilities,
    requirements,
    niceToHave: [],
    seniority: raw.seniority,
    industry: raw.industry,
    source: raw.source,
    postedAt: raw.postedAt,
    url: raw.url || undefined,
  };
}

function isoDate(v: unknown, fallback = new Date().toISOString()): string {
  if (typeof v === 'number') {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return isNaN(d.getTime()) ? fallback : d.toISOString();
  }
  const s = str(v);
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

function parseCityCountry(cityRaw: string, countryRaw: string, text: string): { city: string; country: string } {
  let raw = cityRaw.trim();
  let country = countryRaw.trim();

  if (raw) {
    // Multi-location list -> worldwide.
    if (raw.split(',').length > 2) return { city: 'Remote', country: 'Worldwide' };

    // "City, Country" (or "City, US state").
    const comma = raw.split(',').map((p) => p.trim());
    if (comma.length > 1) {
      const tail = comma[comma.length - 1];
      const tailLower = tail.toLowerCase();
      if (US_STATES.has(tailLower)) {
        country = country || 'United States';
        raw = comma.slice(0, -1).join(', ').trim();
      } else {
        const alias = COUNTRY_ALIAS[tailLower];
        if (alias || tail.length <= 3) {
          country = country || alias || tail;
          raw = comma.slice(0, -1).join(', ').trim();
        }
      }
    }

    // "Remote UK" / "Hybrid Germany".
    const remoteMatch = raw.match(/^(remote|hybrid|onsite)\s+(.+)$/i);
    if (remoteMatch) {
      return { city: 'Remote', country: COUNTRY_ALIAS[remoteMatch[2].toLowerCase()] || remoteMatch[2] };
    }

    // Whole string is a country/region.
    const whole = COUNTRY_ALIAS[raw.toLowerCase()];
    if (whole) return { city: '', country: whole };

    // Bare city.
    const cityCountry = CITY_TO_COUNTRY[raw.toLowerCase()];
    if (cityCountry) return { city: raw, country: cityCountry };

    // Fall back to scanning the description text.
    if (!country) country = normalizeCountry('', text + ' ' + raw);
    return { city: raw, country };
  }

  country = country || normalizeCountry('', text);
  return { city: '', country };
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

interface Provider {
  name: string;
  enabled: () => boolean;
  fetch: (query: JobQuery) => Promise<Job[]>;
}

const PROVIDERS: Provider[] = [];

function remotiveFetch(_query: JobQuery): Promise<Job[]> {
  return fetchJson('https://remotive.com/api/remote-jobs?limit=100').then((data) => {
    const jobs = (data as { jobs?: Record<string, unknown>[] }).jobs ?? [];
    return jobs.map((j) => {
      const salaryText = str(j.salary);
      const locationText = str(j.candidate_required_location);
      const loc = parseCityCountry('', locationText, str(j.description));
      const salary = parseSalaryText(salaryText, loc.country) ?? parseSalaryText(stripHtml(str(j.description)), loc.country) ?? { min: 0, max: 0, currency: 'EUR' };
      return finalize({
        id: 'remotive-' + str(j.id),
        title: str(j.title),
        company: str(j.company_name),
        city: loc.city,
        country: loc.country,
        remote: 'remote',
        salary,
        description: stripHtml(str(j.description)),
        responsibilities: extractListItems(str(j.description)),
        url: str(j.url),
        postedAt: isoDate(j.publication_date),
        industry: detectIndustry(str(j.description), str(j.category)),
        seniority: detectSeniority(str(j.title) + ' ' + str(j.description)),
        source: 'Remotive',
      });
    });
  });
}
PROVIDERS.push({ name: 'Remotive', enabled: () => true, fetch: remotiveFetch });

function arbeitnowFetch(_query: JobQuery): Promise<Job[]> {
  return fetchJson('https://www.arbeitnow.com/api/job-board-api?page=1').then((data) => {
    const rows = (data as { data?: Record<string, unknown>[] }).data ?? [];
    return rows.map((j) => {
      const city = str(j.location);
      const loc = parseCityCountry(city, '', str(j.title) + ' ' + str(j.description));
      const description = stripHtml(str(j.description));
      const salary = parseSalaryText(description, loc.country) ?? { min: 0, max: 0, currency: 'EUR' };
      return finalize({
        id: 'arbeitnow-' + str(j.slug),
        title: str(j.title),
        company: str(j.company_name),
        city: loc.city || city,
        country: loc.country,
        remote: j.remote === true ? 'remote' : detectRemote(description),
        salary,
        description,
        responsibilities: extractListItems(str(j.description)),
        url: str(j.url),
        postedAt: isoDate(j.created_at),
        industry: detectIndustry(description, (j.tags as string[] | undefined)?.[0] ?? ''),
        seniority: detectSeniority(str(j.title) + ' ' + description),
        source: 'Arbeitnow',
      });
    });
  });
}
PROVIDERS.push({ name: 'Arbeitnow', enabled: () => true, fetch: arbeitnowFetch });

function jobicySalary(j: Record<string, unknown>, country: string): { min: number; max: number; currency: string } {
  const min = Number(j.salaryMin);
  const max = Number(j.salaryMax);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return { min: 0, max: 0, currency: 'EUR' };
  const period = str(j.salaryPeriod).toLowerCase();
  let lo = min, hi = max;
  if (period === 'monthly') { lo *= 12; hi *= 12; }
  else if (period && period !== 'yearly' && period !== 'annual' && period !== 'annually') return { min: 0, max: 0, currency: 'EUR' };
  const currency = str(j.salaryCurrency).toUpperCase() || currencyFor(country);
  return { min: lo, max: hi, currency };
}

function jobicyFetch(_query: JobQuery): Promise<Job[]> {
  return fetchJson('https://jobicy.com/api/v2/remote-jobs?count=50').then((data) => {
    const rows = (data as { jobs?: Record<string, unknown>[] }).jobs ?? [];
    return rows.map((j) => {
      const loc = parseCityCountry('', str(j.jobGeo), str(j.jobDescription) + ' ' + str(j.jobExcerpt));
      const description = stripHtml(str(j.jobDescription)) || stripHtml(str(j.jobExcerpt));
      const salary = jobicySalary(j, loc.country);
      return finalize({
        id: 'jobicy-' + str(j.id),
        title: str(j.jobTitle),
        company: str(j.companyName),
        city: loc.city,
        country: loc.country,
        remote: 'remote',
        salary,
        description,
        responsibilities: extractListItems(str(j.jobDescription)),
        url: str(j.url),
        postedAt: isoDate(j.pubDate),
        industry: detectIndustry(description, (j.jobIndustry as string[] | undefined)?.[0] ?? ''),
        seniority: detectSeniority(str(j.jobTitle) + ' ' + description, str(j.jobLevel)),
        source: 'Jobicy',
      });
    });
  });
}
PROVIDERS.push({ name: 'Jobicy', enabled: () => true, fetch: jobicyFetch });

function themuseFetch(_query: JobQuery): Promise<Job[]> {
  // Fetch the whole public feed (all categories, newest first) instead of a
  // single hard-coded "Software Engineering" category, so candidates from any
  // field are covered. The pipeline narrows results to the profile afterwards
  // via title/skill relevance and the explainable matcher.
  const pages = [0, 1, 2, 3].map((p) => 'https://www.themuse.com/api/public/jobs?page=' + p + '&descending=true');
  return Promise.all(pages.map((u) => fetchJson(u))).then((results) => {
    const rows: Record<string, unknown>[] = [];
    for (const r of results) rows.push(...(((r as { results?: Record<string, unknown>[] }).results) ?? []));
    return rows.map((j) => {
      const company = j.company as { name?: string } | undefined;
      const locations = j.locations as { name?: string }[] | undefined;
      const categories = j.categories as { name?: string }[] | undefined;
      const levels = j.levels as { name?: string; short_name?: string }[] | undefined;
      const refs = j.refs as { landing_page?: string } | undefined;
      const locRaw = locations?.[0]?.name ?? '';
      const loc = parseCityCountry(locRaw, '', str(j.contents));
      const description = stripHtml(str(j.contents));
      const salary = parseSalaryText(description, loc.country) ?? { min: 0, max: 0, currency: 'EUR' };
      return finalize({
        id: 'themuse-' + (str(j.short_name) || str(j.id)),
        title: str(j.name),
        company: company?.name ?? '',
        city: loc.city,
        country: loc.country,
        remote: detectRemote(description + ' ' + locRaw),
        salary,
        description,
        responsibilities: extractListItems(str(j.contents)),
        url: refs?.landing_page ?? '',
        postedAt: isoDate(j.publication_date),
        industry: detectIndustry(description, categories?.[0]?.name ?? ''),
        seniority: detectSeniority(str(j.name) + ' ' + description, levels?.[0]?.short_name ?? levels?.[0]?.name),
        source: 'The Muse',
      });
    });
  });
}
PROVIDERS.push({ name: 'The Muse', enabled: () => true, fetch: themuseFetch });

const ADZUNA_COUNTRY_CODES: Record<string, string> = {
  'united kingdom': 'gb', 'uk': 'gb', 'england': 'gb',
  'united states': 'us', 'usa': 'us',
  'germany': 'de', 'france': 'fr', 'netherlands': 'nl', 'spain': 'es', 'italy': 'it', 'poland': 'pl',
  'austria': 'at', 'belgium': 'be', 'switzerland': 'ch', 'canada': 'ca', 'australia': 'au',
  'new zealand': 'nz', 'singapore': 'sg', 'india': 'in', 'brazil': 'br', 'mexico': 'mx', 'south africa': 'za',
};

// Locations that don't identify a real country (used to skip a "country" pass).
const NON_LOCATIONS = new Set(['', 'remote', 'worldwide', 'anywhere', 'europe']);

// Irish cities used to infer Ireland as the primary market when a CV lists a
// city but no explicit country.
const IRISH_CITIES = new Set([
  'dublin', 'cork', 'galway', 'limerick', 'waterford', 'kilkenny', 'sligo',
  'wexford', 'drogheda', 'dundalk', 'bray', 'tralee', 'castlebar', 'athlone',
  'naas', 'newbridge', 'carlow', 'portlaoise', 'tullamore', 'ennis', 'letterkenny',
  'clonmel', 'longford', 'mullingar', 'monaghan', 'cavan', 'roscommon',
]);

// Markets the product prioritises beyond the candidate's own country. Ireland is
// first-class because Adzuna has no Irish index, so most board-native Irish
// coverage has to come from Jooble/Indeed/PublicJobs.
const PRIORITY_MARKETS = ['Ireland'];

// Returns the country to treat as the candidate's primary market, inferring
// Ireland when only an Irish city is present (e.g. a CV that says "Dublin"
// without an explicit country).
function primaryCountry(query: JobQuery): string {
  const c = (query.country || '').trim().toLowerCase();
  if (c && !NON_LOCATIONS.has(c)) return c;
  const city = (query.city || '').trim().toLowerCase();
  if (city && IRISH_CITIES.has(city)) return 'ireland';
  return '';
}

const ADZUNA_RESULTS_PER_PAGE = 50;
const ADZUNA_MAX_PAGES = 5;   // up to 250 results per country index
const ADZUNA_MAX_JOBS = 600;  // provider-wide cap ("as many as possible")

// Ordered list of Adzuna country indexes to search: the candidate's country
// first, then every other supported index for worldwide coverage.
function adzunaCountryOrder(country: string): string[] {
  const order: string[] = [];
  const primary = ADZUNA_COUNTRY_CODES[country.toLowerCase()];
  if (primary) order.push(primary);
  for (const code of Object.values(ADZUNA_COUNTRY_CODES)) {
    if (!order.includes(code)) order.push(code);
  }
  return order;
}

function adzunaRowToJob(row: Record<string, unknown>, code: string): Job {
  const company = row.company as { display_name?: string } | undefined;
  const location = row.location as { display_name?: string; area?: string[] } | undefined;
  const area = location?.area ?? [];
  // Adzuna orders area as [country, region, ..., city].
  const city = area.length ? area[area.length - 1] : '';
  const country = area.length ? area[0] : '';
  const description = stripHtml(str(row.description));
  const salaryMin = Number(row.salary_min) || 0;
  const salaryMax = Number(row.salary_max) || 0;
  const salary = salaryMin > 0 && salaryMax >= salaryMin
    ? { min: salaryMin, max: salaryMax, currency: currencyForCountryCode(code) }
    : parseSalaryText(description, country) ?? { min: 0, max: 0, currency: currencyForCountryCode(code) };
  return finalize({
    id: 'adzuna-' + str(row.id),
    title: str(row.title),
    company: company?.display_name ?? '',
    city,
    country: normalizeCountry(country, description) || country,
    remote: detectRemote(description + ' ' + str(row.title)),
    salary,
    description,
    responsibilities: [],
    url: str(row.redirect_url),
    postedAt: isoDate(row.created),
    industry: detectIndustry(description, (row.category as { label?: string } | undefined)?.label ?? ''),
    seniority: detectSeniority(str(row.title) + ' ' + description),
    source: 'Adzuna',
  });
}

// Fetches every page of results for one Adzuna country index, stopping at the
// last page, a rate-limit/network error, or the per-country page cap.
async function adzunaSearchCountry(code: string, what: string): Promise<Job[]> {
  const out: Job[] = [];
  for (let page = 1; page <= ADZUNA_MAX_PAGES; page++) {
    const url = 'https://api.adzuna.com/v1/api/jobs/' + code + '/search/' + page +
      '?app_id=' + encodeURIComponent(ADZUNA_APP_ID) +
      '&app_key=' + encodeURIComponent(ADZUNA_APP_KEY) +
      '&results_per_page=' + ADZUNA_RESULTS_PER_PAGE +
      '&content-type=application/json' +
      (what ? '&what=' + encodeURIComponent(what) : '');
    let data: { results?: Record<string, unknown>[] } = {};
    try {
      data = (await fetchJson(url)) as { results?: Record<string, unknown>[] };
    } catch {
      break;
    }
    const rows = data.results ?? [];
    if (rows.length === 0) break;
    for (const r of rows) out.push(adzunaRowToJob(r, code));
    if (rows.length < ADZUNA_RESULTS_PER_PAGE) break;
  }
  return out;
}

// A short, specific search phrase for the keyed APIs, built from the profile's
// primary role phrase and its top skill (e.g. "registered nurse patient care").
function searchTerm(query: JobQuery): string {
  const phrase = query.rolePhrases[0] || query.roleTokens.slice(0, 2).join(' ');
  const skill = query.skillTokens[0];
  if (phrase && skill && !phrase.toLowerCase().includes(skill.toLowerCase())) {
    return (phrase + ' ' + skill).slice(0, 80).toLowerCase();
  }
  return (phrase || skill || query.keywords.slice(0, 2).join(' ')).toLowerCase();
}

async function adzunaFetch(query: JobQuery): Promise<Job[]> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return Promise.resolve([]);
  const what = searchTerm(query) || query.keywords.slice(0, 3).join(' ');
  const jobs: Job[] = [];
  const seen = new Set<string>();
  for (const code of adzunaCountryOrder(query.country)) {
    if (jobs.length >= ADZUNA_MAX_JOBS) break;
    for (const j of await adzunaSearchCountry(code, what)) {
      const key = (j.url ? j.url.split('?')[0] : '') || (j.title + '|' + j.company).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  }
  return jobs.slice(0, ADZUNA_MAX_JOBS);
}
PROVIDERS.push({ name: 'Adzuna', enabled: () => Boolean(ADZUNA_APP_ID && ADZUNA_APP_KEY), fetch: adzunaFetch });

const JOOBLE_MAX_PAGES = 10;  // paginate through every page up to this cap
const JOOBLE_MAX_JOBS = 500;  // provider-wide cap ("as many as possible")

function joobleRowToJob(row: Record<string, unknown>): Job {
  // Jooble's "location" is a free-text field ("London, UK", "Berlin", "Remote").
  // Pass it as the city so the parser resolves the country/city correctly.
  const description = stripHtml(str(row.snippet));
  const locationRaw = str(row.location);
  const loc = parseCityCountry(locationRaw, '', locationRaw + ' ' + description);
  const salary = parseSalaryText(str(row.salary), loc.country) ?? parseSalaryText(description, loc.country) ?? { min: 0, max: 0, currency: 'EUR' };
  const sourceName = str(row.source).replace(/\.(com|ie|org|net|uk)/gi, '');
  const prettySource = /^[a-z0-9 .-]+$/i.test(sourceName) ? sourceName.replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  return finalize({
    id: 'jooble-' + hashString(str(row.link) || str(row.title) + str(row.company)),
    title: str(row.title),
    company: str(row.company),
    city: loc.city,
    country: loc.country,
    remote: detectRemote(description + ' ' + str(row.title)),
    salary,
    description,
    responsibilities: [],
    url: str(row.link),
    postedAt: isoDate(row.updated),
    industry: detectIndustry(description, ''),
    seniority: detectSeniority(str(row.title) + ' ' + description),
    source: prettySource || 'Jooble',
  });
}

// Fetches every page of Jooble results for a location (an empty location means
// worldwide), stopping at the last page, an error, or the page cap.
async function joobleSearch(keywords: string, location: string): Promise<Job[]> {
  const out: Job[] = [];
  const seen = new Set<string>();
  let total: number | null = null;
  for (let page = 1; page <= JOOBLE_MAX_PAGES; page++) {
    let data: { jobs?: Record<string, unknown>[]; totalCount?: number } = {};
    try {
      data = (await fetchJson('https://jooble.org/api/' + encodeURIComponent(JOOBLE_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, location, page, ResultOnPage: 100 }),
      })) as { jobs?: Record<string, unknown>[]; totalCount?: number };
    } catch {
      break;
    }
    if (typeof data.totalCount === 'number') total = data.totalCount;
    const rows = data.jobs ?? [];
    if (rows.length === 0) break;
    let added = 0;
    for (const r of rows) {
      const j = joobleRowToJob(r);
      const key = (j.url ? j.url.split('?')[0] : '') || (j.title + '|' + j.company).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(j);
      added += 1;
    }
    if (total !== null && out.length >= total) break;
    if (added === 0) break;
  }
  return out;
}

async function joobleFetch(query: JobQuery): Promise<Job[]> {
  if (!JOOBLE_API_KEY) return Promise.resolve([]);
  const keywords = searchTerm(query) || query.keywords.slice(0, 3).join(' ');
  const jobs: Job[] = [];
  const seen = new Set<string>();
  const add = (batch: Job[]) => {
    for (const j of batch) {
      const key = (j.url ? j.url.split('?')[0] : '') || (j.title + '|' + j.company).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  };
  // 1) The candidate's primary market (country, or Ireland inferred from city).
  const primary = primaryCountry(query);
  const locations: string[] = [];
  if (primary) locations.push(primary);
  // 2) Priority markets (Ireland) if not already covered.
  for (const m of PRIORITY_MARKETS) {
    if (m.toLowerCase() !== primary) locations.push(m);
  }
  // 3) Then worldwide for the broadest possible coverage.
  locations.push('');
  for (const loc of locations) {
    if (jobs.length >= JOOBLE_MAX_JOBS) break;
    add(await joobleSearch(keywords, loc));
  }
  return jobs.slice(0, JOOBLE_MAX_JOBS);
}
PROVIDERS.push({ name: 'Jooble', enabled: () => Boolean(JOOBLE_API_KEY), fetch: joobleFetch });

// ---------------------------------------------------------------------------
// PublicJobs.ie (Tal.net) — Ireland's public-sector job board
// ---------------------------------------------------------------------------
// PublicJobs lists open competitions for the Irish civil service, HSE, local
// government and state bodies. It runs on Tal.net and exposes no JSON API, so
// this adapter fetches the public HTML job board and parses it (listing + the
// full description on the detail page for the most relevant campaigns).

const PUBLICJOBS_BASE = 'https://publicjobs.tal.net/vx/lang-en-GB/mobile-0/appcentre-ext/brand-4/candidate/jobboard/vacancy/3/adv/';
const PUBLICJOBS_PAGE_SIZE = 50;
const PUBLICJOBS_MAX_PAGES = 4;    // up to ~200 open campaigns
const PUBLICJOBS_MAX_DETAILS = 25; // detail pages fetched per refresh (for descriptions)

interface PublicJobsItem {
  id: string;
  title: string;
  org: string;
  location: string;
  url: string;
  advertisingDate: string;
}

function parsePublicJobsListing(html: string): PublicJobsItem[] {
  const out: PublicJobsItem[] = [];
  for (const block of html.split('data-title="').slice(1)) {
    const title = decodeEntities(block.slice(0, block.indexOf('"')).trim());
    const m = block.match(/href="([^"]*\/opp\/(\d+)-[^"]*)"/);
    if (!m || !title) continue;
    const fields: Record<string, string> = {};
    const fieldRe = /candidate-opp-field-label">([^<]*)<\/span>\s*([^<]*)/g;
    let fm: RegExpExecArray | null;
    while ((fm = fieldRe.exec(block)) !== null) fields[fm[1].trim()] = decodeEntities(fm[2].trim());
    out.push({
      id: m[2],
      title,
      org: fields['Department/Organisation:'] || '',
      location: fields['Location:'] || '',
      url: m[1],
      advertisingDate: fields['Advertising Date:'] || '',
    });
  }
  return out;
}

// Returns the plain text between two headings on a stripped detail page.
function textBetween(text: string, from: string, to?: string, cap = 2000): string {
  const i = text.indexOf(from);
  if (i === -1) return '';
  const start = i + from.length;
  const j = to ? text.indexOf(to, start) : -1;
  const end = j === -1 ? Math.min(start + cap, text.length) : j;
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

async function publicjobsDetail(url: string): Promise<string> {
  try {
    const text = stripHtml(await fetchText(url));
    const summary = textBetween(text, 'Job summary', 'Main Duties of the Job');
    const duties = textBetween(text, 'Main Duties of the Job', 'Information about the organisation');
    const org = textBetween(text, 'Information about the organisation', undefined, 800);
    return [summary, duties, org].filter(Boolean).join(' ');
  } catch {
    return '';
  }
}

function publicjobsToJob(it: PublicJobsItem, description: string): Job {
  const parts = it.location.split(',').map((s) => s.trim()).filter(Boolean);
  const city = parts.length === 1 ? parts[0] : parts.length > 1 ? 'Multiple Locations' : 'Ireland';
  const remote = /remote|hybrid|work from home|wfh/i.test(description) ? detectRemote(description) : 'onsite';
  const fallbackDesc = 'Public sector role: ' + it.title + (it.org ? ' (' + it.org + ')' : '') + '. Location: ' + (it.location || 'Ireland') + '.';
  return finalize({
    id: 'publicjobs-' + it.id,
    title: it.title,
    company: it.org || 'Public Service',
    city,
    country: 'Ireland',
    remote,
    salary: { min: 0, max: 0, currency: 'EUR' },
    description: description || fallbackDesc,
    responsibilities: [],
    url: it.url,
    postedAt: isoDate(it.advertisingDate),
    industry: 'Government & Public Sector',
    seniority: detectSeniority(it.title),
    source: 'PublicJobs',
  });
}

function publicjobsRelevant(it: PublicJobsItem, query: JobQuery): boolean {
  if (query.roleTokens.length === 0 && query.skillTokens.length === 0) return true;
  const text = it.title.toLowerCase();
  return query.skillTokens.some((s) => wordMatch(text, s)) || query.roleTokens.some((r) => wordMatch(text, r));
}

async function publicjobsFetch(query: JobQuery): Promise<Job[]> {
  // 1. Collect every open campaign across the board pages.
  const items: PublicJobsItem[] = [];
  const seen = new Set<string>();
  for (let page = 0; page < PUBLICJOBS_MAX_PAGES; page++) {
    const url = PUBLICJOBS_BASE + (page > 0 ? '?start=' + page * PUBLICJOBS_PAGE_SIZE : '');
    let html = '';
    try {
      html = await fetchText(url);
    } catch {
      break;
    }
    const batch = parsePublicJobsListing(html);
    if (batch.length === 0) break;
    for (const it of batch) {
      if (!seen.has(it.id)) { seen.add(it.id); items.push(it); }
    }
    if (batch.length < PUBLICJOBS_PAGE_SIZE) break;
  }

  // 2. Enrich the most relevant campaigns with their full descriptions (the
  // rest still surface with metadata so nothing relevant is missed).
  const relevant = items.filter((it) => publicjobsRelevant(it, query));
  const rest = items.filter((it) => !publicjobsRelevant(it, query));
  const toEnrich = [...relevant, ...rest].slice(0, PUBLICJOBS_MAX_DETAILS);
  const details = new Map<string, Promise<string>>();
  for (const it of toEnrich) details.set(it.id, publicjobsDetail(it.url));

  // 3. Build the job list.
  const jobs: Job[] = [];
  for (const it of items) {
    const desc = details.has(it.id) ? await details.get(it.id)! : '';
    jobs.push(publicjobsToJob(it, desc));
  }
  return jobs;
}
PROVIDERS.push({ name: 'PublicJobs', enabled: () => true, fetch: publicjobsFetch });

// ---------------------------------------------------------------------------
// Indeed (GraphQL API)
// ---------------------------------------------------------------------------
// Indeed exposes one GraphQL API at https://apis.indeed.com/graphql. The Job
// Sync API (jobsIngest.* mutations) creates and manages postings *on* Indeed;
// the candidate-facing search is the jobSearch query, which requires the
// "job-retrieval-service" entitlement granted by Indeed as part of a
// partnership. Authentication is OAuth 2.0 client credentials:
//   POST https://apis.indeed.com/oauth/v2/tokens   (grant_type=client_credentials)
//   -> { access_token, expires_in: 3600 } ->  Authorization: Bearer <token>
// The token is cached here for its one-hour lifetime. When credentials are
// absent or the entitlement is missing, this provider returns no jobs and the
// rest of the pipeline keeps working via the other providers.

let indeedToken: { token: string; expiresAt: number } | null = null;

function indeedConfigured(): boolean {
  return Boolean((INDEED_CLIENT_ID && INDEED_CLIENT_SECRET) || INDEED_ACCESS_TOKEN);
}

async function indeedAccessToken(): Promise<string> {
  if (INDEED_ACCESS_TOKEN) return INDEED_ACCESS_TOKEN;
  if (indeedToken && Date.now() < indeedToken.expiresAt - 60_000) return indeedToken.token;
  const data = (await fetchJson(INDEED_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: INDEED_CLIENT_ID,
      client_secret: INDEED_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'employer_access',
    }).toString(),
  })) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('Indeed OAuth response missing access_token');
  indeedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return indeedToken.token;
}

interface IndeedGraphQLResponse {
  errors?: { message?: string }[];
  data?: { jobSearch?: { results?: { job?: Record<string, unknown> }[] } };
}

async function indeedGraphQL(query: string, variables: Record<string, unknown>): Promise<IndeedGraphQLResponse> {
  const token = await indeedAccessToken();
  const json = (await fetchJson(INDEED_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ query, variables }),
  })) as IndeedGraphQLResponse;
  if (json.errors?.length) throw new Error('Indeed GraphQL: ' + (json.errors[0]?.message ?? 'unknown error'));
  return json;
}

// title and sourceEmployerName are the fields shown in Indeed's official docs;
// url, description and datePublished are common fields on the search-result job
// type. If a partner app's schema differs, the richer selection below falls back
// to the minimal documented selection on a GraphQL validation error.
const INDEED_JOB_FIELDS = 'title sourceEmployerName url description datePublished';
const INDEED_JOB_FIELDS_MINIMAL = 'title sourceEmployerName';

function indeedSearchQuery(fields: string): string {
  return `query IndeedJobSearch($what: String!, $where: String, $limit: Int) {
  jobSearch(what: $what, location: { where: $where }, limit: $limit) {
    results { job { ${fields} } }
  }
}`;
}

async function indeedSearch(variables: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  try {
    const json = await indeedGraphQL(indeedSearchQuery(INDEED_JOB_FIELDS), variables);
    return (json.data?.jobSearch?.results ?? []).map((r) => (r.job ?? {}) as Record<string, unknown>);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A field in the richer selection may not exist in the partner's schema;
    // retry with the documented minimal selection instead of failing outright.
    if (/cannot query field|does not exist|unknown field|field .* not found|validation/i.test(msg)) {
      const json = await indeedGraphQL(indeedSearchQuery(INDEED_JOB_FIELDS_MINIMAL), variables);
      return (json.data?.jobSearch?.results ?? []).map((r) => (r.job ?? {}) as Record<string, unknown>);
    }
    throw err;
  }
}

function indeedRowToJob(row: Record<string, unknown>, where: string): Job {
  const title = str(row.title);
  const company = str(row.sourceEmployerName);
  const url = str(row.url);
  const description = stripHtml(str(row.description));
  // "where" is the location context for this search pass ("Dublin, Ireland",
  // "Ireland", or "" for worldwide); parse it so rows group by country correctly.
  const loc = parseCityCountry(where, '', description);
  const salary = parseSalaryText(description, loc.country) ?? { min: 0, max: 0, currency: 'EUR' };
  return finalize({
    id: 'indeed-' + (url ? hashString(url) : hashString(title + '|' + company)),
    title,
    company,
    city: loc.city,
    country: loc.country,
    remote: detectRemote(description + ' ' + title),
    salary,
    description,
    responsibilities: extractListItems(description),
    url,
    postedAt: isoDate(row.datePublished),
    industry: detectIndustry(description, ''),
    seniority: detectSeniority(title + ' ' + description),
    source: 'Indeed',
  });
}

const INDEED_MAX_JOBS = 300;

async function indeedFetch(query: JobQuery): Promise<Job[]> {
  if (!indeedConfigured()) return Promise.resolve([]);
  const what = searchTerm(query) || query.keywords.slice(0, 3).join(' ');
  const primary = primaryCountry(query);
  const wheres: string[] = [];
  if (query.city && query.country) wheres.push(query.city + ', ' + query.country);
  else if (query.city) wheres.push(query.city);
  else if (query.country) wheres.push(query.country);
  if (primary && !wheres.some((w) => w.toLowerCase().includes(primary))) wheres.push(primary);
  for (const m of PRIORITY_MARKETS) {
    if (m.toLowerCase() !== primary) wheres.push(m);
  }
  wheres.push(''); // worldwide fallback

  const jobs: Job[] = [];
  const seen = new Set<string>();
  for (const where of wheres) {
    if (jobs.length >= INDEED_MAX_JOBS) break;
    let rows: Record<string, unknown>[] = [];
    try {
      rows = await indeedSearch({ what, where: where || null, limit: 50 });
    } catch {
      continue;
    }
    for (const r of rows) {
      const j = indeedRowToJob(r, where);
      const key = (j.url ? j.url.split('?')[0] : '') || (j.title + '|' + j.company).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  }
  return jobs.slice(0, INDEED_MAX_JOBS);
}
PROVIDERS.push({ name: 'Indeed', enabled: indeedConfigured, fetch: indeedFetch });

// ---------------------------------------------------------------------------
// Indeed via Apify (misceres/indeed-scraper)
// ---------------------------------------------------------------------------
// Apify hosts a maintained Indeed scraper at misceres/indeed-scraper. Unlike
// Indeed's gated GraphQL jobSearch (which needs a partner entitlement), the
// Apify actor works with a plain API token. Each CV submission returns at most
// APIFY_INDEED_MAX_JOBS (50) postings: the actor input caps every search at 50
// via maxItemsPerSearch, and the provider slices to the same cap as a hard
// guarantee. Runs are started asynchronously, polled until they finish (the
// actor uses residential proxies and can take a few minutes), then results are
// read from the run's default dataset.

const APIFY_API_BASE = 'https://api.apify.com/v2';
const APIFY_POLL_INTERVAL_MS = 5000;
const APIFY_RUN_TIMEOUT_MS = 5 * 60 * 1000; // residential-proxy runs can take minutes
const APIFY_INDEED_MAX_JOBS = 50;           // hard cap per CV submission

// Country codes accepted by the Apify actor (from its input-schema enum).
const APIFY_COUNTRY_CODES: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB', 'england': 'GB',
  'ireland': 'IE', 'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR', 'netherlands': 'NL', 'the netherlands': 'NL', 'holland': 'NL',
  'spain': 'ES', 'italy': 'IT', 'portugal': 'PT', 'poland': 'PL',
  'sweden': 'SE', 'denmark': 'DK', 'finland': 'FI', 'norway': 'NO',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE',
  'czech republic': 'CZ', 'greece': 'GR', 'hungary': 'HU', 'romania': 'RO',
  'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ', 'singapore': 'SG',
  'india': 'IN', 'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR',
  'chile': 'CL', 'colombia': 'CO', 'peru': 'PE', 'venezuela': 'VE',
  'uruguay': 'UY', 'ecuador': 'EC', 'egypt': 'EG', 'morocco': 'MA',
  'nigeria': 'NG', 'south africa': 'ZA', 'saudi arabia': 'SA',
  'united arab emirates': 'AE', 'israel': 'IL', 'turkey': 'TR',
  'japan': 'JP', 'china': 'CN', 'south korea': 'KR', 'taiwan': 'TW',
  'thailand': 'TH', 'vietnam': 'VN', 'indonesia': 'ID', 'philippines': 'PH',
  'pakistan': 'PK', 'qatar': 'QA', 'kuwait': 'KW', 'bahrain': 'BH',
  'oman': 'OM', 'costa rica': 'CR', 'hong kong': 'HK', 'luxembourg': 'LU',
  'ukraine': 'UA', 'panama': 'PA', 'antarctica': 'AQ',
};

// Longer-timeout JSON fetch for the Apify API (starting runs, polling, and
// reading datasets can easily exceed the 8s used by the fast provider helpers).
async function apifyFetchJson(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) throw new Error('Apify HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface ApifyRun {
  id: string;
  status: string;
  defaultDatasetId?: string;
  errorMessage?: string;
}

function apifyActorId(): string {
  // The Apify API path uses `~` instead of `/` for username/actor-name refs.
  return APIFY_INDEED_ACTOR_ID.replace('/', '~');
}

function apifyAuth(): string {
  return 'token=' + encodeURIComponent(APIFY_API_TOKEN);
}

async function apifyStartRun(input: Record<string, unknown>): Promise<ApifyRun> {
  const data = (await apifyFetchJson(
    APIFY_API_BASE + '/acts/' + apifyActorId() + '/runs?' + apifyAuth(),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    30_000,
  )) as { data?: ApifyRun };
  if (!data.data?.id) throw new Error('Apify run did not start');
  return data.data;
}

async function apifyWaitForRun(runId: string): Promise<ApifyRun> {
  const deadline = Date.now() + APIFY_RUN_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error('Apify run timed out');
    const data = (await apifyFetchJson(
      APIFY_API_BASE + '/actor-runs/' + runId + '?' + apifyAuth(),
    )) as { data?: ApifyRun };
    const run = data.data;
    if (!run) throw new Error('Apify run not found: ' + runId);
    if (run.status === 'SUCCEEDED') return run;
    if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
      throw new Error('Apify run ' + run.status + (run.errorMessage ? ': ' + run.errorMessage : ''));
    }
    await new Promise((resolve) => setTimeout(resolve, APIFY_POLL_INTERVAL_MS));
  }
}

// Indeed locations are free-form ("Dublin, County Dublin", "New York, NY 10001",
// "Remote"). parseCityCountry handles most cases; when the region tail is not a
// country/state and the head is a known city (e.g. "Dublin, County Dublin"), map
// the head against the known-city table instead of leaving the raw string as the
// city and letting a stray "worldwide" in the description become the country.
function apifyParseLocation(locationRaw: string, description: string): { city: string; country: string } {
  const loc = parseCityCountry(locationRaw, '', locationRaw + ' ' + description);
  if (loc.country === 'Worldwide' || !loc.country || NON_LOCATIONS.has(loc.country)) {
    const head = locationRaw.split(',')[0].trim();
    const mapped = CITY_TO_COUNTRY[head.toLowerCase()];
    if (mapped && head) return { city: head, country: mapped };
  }
  return loc;
}

function apifyIndeedRowToJob(row: Record<string, unknown>): Job {
  const title = str(row.positionName);
  const company = str(row.company);
  const url = str(row.url);
  const description = stripHtml(str(row.description)) || stripHtml(str(row.descriptionHTML));
  const locationRaw = str(row.location);
  const loc = apifyParseLocation(locationRaw, description);
  const jobTypeText = Array.isArray(row.jobType) ? row.jobType.map((t) => str(t)).join(' ') : str(row.jobType);
  const salary =
    parseSalaryText(str(row.salary), loc.country) ??
    parseSalaryText(description, loc.country) ??
    { min: 0, max: 0, currency: 'EUR' };
  // Indeed viewjob URLs are unique only through their `jk` query param, so
  // prefer the actor's `id` (the jk) as the job id; never split the URL on `?`.
  const uid = str(row.id) || url || hashString(title + '|' + company);
  return finalize({
    id: 'apify-indeed-' + uid,
    title,
    company,
    city: loc.city,
    country: loc.country,
    remote: detectRemote(description + ' ' + title + ' ' + locationRaw),
    salary,
    description,
    responsibilities: extractListItems(str(row.descriptionHTML)),
    url,
    postedAt: isoDate(row.postingDateParsed, isoDate(row.scrapedAt)),
    industry: detectIndustry(description, ''),
    seniority: detectSeniority(title + ' ' + description + ' ' + jobTypeText),
    source: 'Indeed (Apify)',
  });
}

async function apifyIndeedFetch(query: JobQuery): Promise<Job[]> {
  if (!APIFY_API_TOKEN) return Promise.resolve([]);
  const position = searchTerm(query) || query.keywords.slice(0, 3).join(' ');
  if (!position) return Promise.resolve([]);

  const primary = primaryCountry(query);
  const countryCode = APIFY_COUNTRY_CODES[primary.toLowerCase()];
  const location = query.city && query.country
    ? query.city + ', ' + query.country
    : query.city || query.country || (countryCode ? primary : '');

  const input: Record<string, unknown> = {
    position,
    maxItemsPerSearch: APIFY_INDEED_MAX_JOBS,
    saveOnlyUniqueItems: true,
    parseCompanyDetails: false,
    followApplyRedirects: false,
  };
  if (countryCode) input.country = countryCode;
  if (location) input.location = location;

  let run: ApifyRun;
  try {
    run = await apifyStartRun(input);
  } catch {
    return [];
  }
  try {
    run = await apifyWaitForRun(run.id);
  } catch {
    return [];
  }
  if (!run.defaultDatasetId) return [];

  let items: Record<string, unknown>[] = [];
  try {
    const data = (await apifyFetchJson(
      // Reads are not billed; align the read cap with the scrape cap for clarity.
      APIFY_API_BASE + '/datasets/' + run.defaultDatasetId + '/items?' + apifyAuth() + '&clean=true&format=json&limit=' + APIFY_INDEED_MAX_JOBS,
      undefined,
      60_000,
    )) as unknown;
    items = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }

  // Normalise + dedupe, hard-capped at APIFY_INDEED_MAX_JOBS (50) per submission.
  const jobs: Job[] = [];
  const seen = new Set<string>();
  for (const r of items) {
    if (!r || typeof r !== 'object') continue;
    if (r.error) continue; // per-item error records (e.g. FOUND_NO_RESULTS)
    const j = apifyIndeedRowToJob(r);
    if (!j.title) continue;
    // Dedupe on the full URL (the jk query param is the unique part) or the job id.
    const key = str(r.id) || (j.url ? j.url.toLowerCase() : (j.title + '|' + j.company).toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(j);
    if (jobs.length >= APIFY_INDEED_MAX_JOBS) break;
  }
  return jobs;
}
PROVIDERS.push({ name: 'Indeed (Apify)', enabled: () => Boolean(APIFY_API_TOKEN), fetch: apifyIndeedFetch });

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export function queryForProfile(profile: { headline?: string; preferredRoles: string[]; experience: { title: string }[]; skills: { name: string }[]; location: { city: string; country: string }; remotePreference: RemotePref } | null): JobQuery {
  if (!profile) {
    return { keywords: [], roleTokens: [], rolePhrases: [], skillTokens: [], country: '', city: '', remoteOk: true };
  }
  const rolePhrases = rolePhrasesFrom([
    ...profile.preferredRoles,
    profile.headline ?? '',
    ...profile.experience.map((e) => e.title),
  ]);
  const roleTokens = roleTokensFrom(rolePhrases.join(' '));
  const skillTokens = profile.skills.slice(0, 8).map((s) => s.name);
  const keywords = [...new Set([...roleTokens, ...skillTokens.map((s) => s.toLowerCase())])].slice(0, 12);
  return {
    keywords,
    roleTokens,
    rolePhrases,
    skillTokens,
    country: profile.location.country,
    city: profile.location.city,
    remoteOk: profile.remotePreference !== 'onsite',
  };
}

function wordMatch(text: string, token: string): boolean {
  const t = token.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!t) return false;
  const re = new RegExp('(^|[^a-z0-9+#./-])' + t + '($|[^a-z0-9+#./-])');
  return re.test(text.toLowerCase());
}

// A job is only relevant if its title names one of the candidate's roles or a
// top skill. Domain-specific role words (e.g. "nurse", "marketing", "java") are
// strong signals; generic role-family words ("manager", "specialist") only
// qualify when the posting also mentions a matching skill or several of them.
function titleRelevant(job: Job, query: JobQuery): boolean {
  const title = job.title.toLowerCase();
  const specific = query.roleTokens.filter((t) => !GENERIC_ROLE_WORDS.has(t));
  const generic = query.roleTokens.filter((t) => GENERIC_ROLE_WORDS.has(t));
  // Without any domain signal (no specific role word and no skill) we cannot
  // filter precisely, so accept the job and let the explainable matcher rank it.
  if (specific.length === 0 && query.skillTokens.length === 0) return true;
  const titleSkills = new Set(detectSkillsInText(job.title));
  if (query.skillTokens.some((s) => titleSkills.has(s) || wordMatch(title, s))) return true;
  if (specific.some((r) => wordMatch(title, r))) return true;
  if (generic.some((r) => wordMatch(title, r))) {
    const jobText = (job.title + ' ' + job.description + ' ' + job.requirements.join(' ')).toLowerCase();
    if (query.skillTokens.some((s) => jobText.includes(s.toLowerCase()))) return true;
    if (generic.filter((r) => wordMatch(title, r)).length >= 2) return true;
  }
  return false;
}

// Ordering priority so the candidate's own country surfaces first, then remote
// / worldwide roles, then every other country. Worldwide jobs are kept (not
// dropped) and grouped by country on the client.
function locationPriority(job: Job, query: JobQuery): number {
  const primary = primaryCountry(query);
  if (!primary) return 1;
  const jc = job.location.country.toLowerCase();
  if (!jc || NON_LOCATIONS.has(jc)) return 1;
  if (jc === primary) return 0;
  // Priority markets (Ireland) rank above other foreign countries.
  if (PRIORITY_MARKETS.some((m) => m.toLowerCase() === jc)) return 1;
  return 2;
}

// Keep as many relevant jobs as the matching pass can comfortably handle.
const MAX_RESULTS = 500;

export async function fetchRealJobs(query: JobQuery): Promise<Job[]> {
  const providers = PROVIDERS.filter((p) => p.enabled());
  const settled = await Promise.allSettled(providers.map((p) => p.fetch(query)));
  const jobs: Job[] = [];
  const seen = new Set<string>();
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const j of s.value) {
      const key = (j.url ? j.url.split('?')[0] : '') || (j.title + '|' + j.company).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(j);
    }
  }
  const relevant = jobs.filter((j) => titleRelevant(j, query));
  const kw = query.keywords.map((k) => k.toLowerCase());
  const scored = relevant.map((j) => {
    const text = (j.title + ' ' + j.description + ' ' + j.requirements.join(' ')).toLowerCase();
    const hits = kw.filter((k) => text.includes(k)).length;
    return { j, hits };
  });
  scored.sort((a, b) => {
    const loc = locationPriority(a.j, query) - locationPriority(b.j, query);
    if (loc !== 0) return loc;
    if (b.hits !== a.hits) return b.hits - a.hits;
    return new Date(b.j.postedAt || 0).getTime() - new Date(a.j.postedAt || 0).getTime();
  });
  return scored.slice(0, MAX_RESULTS).map((s) => s.j);
}

export function enabledProviderNames(): string[] {
  return PROVIDERS.filter((p) => p.enabled()).map((p) => p.name);
}
