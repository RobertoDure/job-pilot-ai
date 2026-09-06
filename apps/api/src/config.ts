import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, '..');

function loadEnv(): void {
  try {
    const raw = fs.readFileSync(path.join(apiDir, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* .env is optional */
  }
}
loadEnv();

// Fallbacks mirror the web client (apps/web/src/supabase.ts) so the API works
// out of the box with the same Supabase project. The anon key is a publishable
// key, safe to ship. Override with env vars / .env for a different project.
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zvbqsdztecgosqsxqaxf.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_xWaBpxHrVBHCYXlgh75uww_oVFYnClk';
// Optional service-role key. When set, job ingestion bypasses RLS and does not
// need the authenticated-write policies in supabase/schema.sql.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Optional job-provider API keys. Without them the app uses the free, no-key
// public APIs (Remotive, Arbeitnow, Jobicy, The Muse). Adzuna and Jooble add
// aggregated listings (including LinkedIn-sourced posts) when keys are set;
// the Indeed keys below add board-native Indeed postings via Indeed's GraphQL API.
export const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
export const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
export const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || '';

// Optional Indeed partner credentials. Indeed exposes a GraphQL API at
// https://apis.indeed.com/graphql. The Job Sync API (jobsIngest.*) posts and
// manages jobs; candidate-facing search uses the gated jobSearch query, which
// requires the "job-retrieval-service" entitlement on your Indeed partner app.
// When these are set, the app adds board-native Indeed postings.
export const INDEED_CLIENT_ID = process.env.INDEED_CLIENT_ID || '';
export const INDEED_CLIENT_SECRET = process.env.INDEED_CLIENT_SECRET || '';
// Optional: skip the OAuth token exchange and use a pre-issued access token.
export const INDEED_ACCESS_TOKEN = process.env.INDEED_ACCESS_TOKEN || '';
export const INDEED_OAUTH_URL = process.env.INDEED_OAUTH_URL || 'https://apis.indeed.com/oauth/v2/tokens';
export const INDEED_GRAPHQL_URL = process.env.INDEED_GRAPHQL_URL || 'https://apis.indeed.com/graphql';

// Optional Apify API token. When set, the app adds board-native Indeed postings
// scraped through Apify's misceres/indeed-scraper actor (a second Indeed source
// alongside the GraphQL adapter above). Each CV submission returns at most
// APIFY_INDEED_MAX_JOBS results from this provider.
export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';
export const APIFY_INDEED_ACTOR_ID = process.env.APIFY_INDEED_ACTOR_ID || 'misceres/indeed-scraper';

export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';

export const PORT = Number(process.env.PORT || 4000);
export const WEB_DIST = path.resolve(apiDir, '..', 'web', 'dist');
