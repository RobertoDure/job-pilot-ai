# JobPilot AI

Your personal AI job-search copilot. It turns "I want a Java Developer job in Dublin, EUR 70k+, hybrid"
into an automated pipeline:

    Find -> Filter -> Match -> Tailor CV -> Apply -> Track -> Improve

A full-stack SaaS MVP with Supabase (authentication + user storage + PostgreSQL) and DeepSeek v4 pro
for generative AI, plus a deterministic, explainable job-matching engine.

---

# Run Ngrok

### 1) start the app
pnpm dev  

### 2) manually open the tunnel whenever you want it public
~/.local/bin/ngrok http 4000 

## What it does

- Accounts and auth: email/password sign-up and sign-in via Supabase Auth, with per-user data isolation.
- CV to career profile: upload a CV (PDF, DOCX, TXT, pasted text, or the built-in sample) and the system
  extracts a structured profile (skills, experience, education, salary, location, and more).
- Live jobs, not mock data: submitting a CV triggers a fetch of real postings from public job-board APIs
  (Remotive, Arbeitnow, Jobicy, The Muse, PublicJobs.ie, and optionally Adzuna, Jooble, Indeed via its
  GraphQL API, and Indeed via the Apify misceres/indeed-scraper). No seed/mock job rows are used.
- Explainable job-match score: every job gets a 0-100 score broken down by category, plus the exact
  matched and missing skills.
- "Should I apply?": application probability with interview potential, skills/experience/education/location
  fit, and a competition estimate. Every job is ranked APPLY / CONSIDER / SKIP.
- AI CV tailoring and cover letters: DeepSeek writes a truthful tailored summary and cover letter from your
  existing experience (nothing is invented); a deterministic engine handles the reordering.
- Application command center: a kanban pipeline (Recommended -> Applied -> Interview -> Offer / Rejected /
  No response), persisted per user.
- Career intelligence: response rate by role/industry, skill-gap suggestions, and DeepSeek recommendations.
- AI interview simulator: role-specific questions plus DeepSeek-generated preparation notes.
- Freemium pricing: Free, Job Seeker, JobPilot Pro, JobPilot Max.

---

## Tech stack

- Frontend: React + Vite + Tailwind CSS + Supabase JS client.
- Backend: Node.js + TypeScript + Express.
- Auth and database: Supabase (Auth + Postgres + Row Level Security).
- AI: DeepSeek deepseek-v4-pro via the OpenAI-compatible chat-completions API, with deterministic fallbacks.

---

## Quick start

Prerequisites: Node 22+, pnpm, a Supabase project.

1. Install dependencies:

       pnpm install

2. Configure environment. Create apps/api/.env:

       SUPABASE_URL=https://<project-ref>.supabase.co
       SUPABASE_ANON_KEY=sb_publishable_...
       DEEPSEEK_API_KEY=sk-...
       DEEPSEEK_BASE_URL=https://api.deepseek.com
       DEEPSEEK_MODEL=deepseek-v4-pro

       # Optional (recommended for production): lets job ingestion bypass RLS.
       SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

       # Optional: add aggregator listings (including LinkedIn-sourced posts).
       ADZUNA_APP_ID=...
       ADZUNA_APP_KEY=...
       JOOBLE_API_KEY=...

       # Optional: add board-native Indeed postings via Indeed's GraphQL API.
       # Requires an Indeed partner app with the job-retrieval-service entitlement.
       INDEED_CLIENT_ID=...
       INDEED_CLIENT_SECRET=...
       # INDEED_ACCESS_TOKEN=...   # optional: skip OAuth and use a pre-issued token

       # Optional: add board-native Indeed postings via the Apify misceres/indeed-scraper
       # actor (works with a plain Apify API token; up to 50 results per CV submission).
       APIFY_API_TOKEN=...

   The frontend reads the same publishable key from apps/web/src/supabase.ts (or the VITE_SUPABASE_URL
   and VITE_SUPABASE_ANON_KEY env vars). The publishable key is client-safe.

3. Create the database schema once. Paste supabase/schema.sql into the Supabase SQL Editor, or apply it
   via the Management API (see below). It creates the profiles, jobs, and applications tables and
   enables Row Level Security. Jobs are stored per user and populated at runtime from live providers.
   Re-applying the file on an existing database also runs the idempotent migration to the per-user
   job model.

4. Build and run:

       pnpm run build
       pnpm start

   Then open http://localhost:4000, create an account, and click "Use sample CV".

Development mode (two processes, hot reload):

    pnpm dev   # web -> http://localhost:5173 (proxies /api to :4000)

Note: email confirmation is auto-enabled for this demo (mailer_autoconfirm = true), so sign-ups get a
session immediately. Turn it back on in Auth settings for production.

---

---

## Run with Docker (single container + public ngrok tunnel)

The repo ships a Dockerfile plus a docker-compose.yml that runs JobPilot AI in a
container and automatically exposes it to the internet through an ngrok tunnel,
so every time the stack starts, the app is public.

    docker compose up -d --build

- App (web UI + API): http://localhost:4000
- Public URL: read it from the ngrok logs or the web inspector at http://localhost:4040
      docker compose logs ngrok | grep url=

Configuration lives in the `.env` file next to docker-compose.yml (copy
`.env.example` to `.env` first):

- NGROK_AUTHTOKEN (required) — from https://dashboard.ngrok.com
- SUPABASE_URL / SUPABASE_ANON_KEY / DEEPSEEK_API_KEY etc. (optional — the app
  runs with built-in fallbacks when empty)

Notes:

- Both services use `restart: unless-stopped`, so they come back up on reboot.
- The free ngrok plan allows one online tunnel at a time — stop any other ngrok
  process before starting the stack.
- To expose a local dev setup instead, run `pnpm dev` and `ngrok http 5173`.

---

## Applying the schema

The schema lives in supabase/schema.sql. Two ways to apply it:

- SQL Editor (recommended): paste the file into Supabase Dashboard -> SQL Editor -> Run.
- Management API: use a personal access token (sbp_...) with the database/query endpoint:

      POST https://api.supabase.com/v1/projects/<ref>/database/query
      Authorization: Bearer <sbp_...>
      { "query": "<statement>" }

  The Management API runs one statement per call; supabase/schema.sql is a sequence of statements.

---

## Database schema

    profiles        user_id (pk -> auth.users), profile jsonb, timestamps
    jobs            (user_id, id) (pk), user_id -> auth.users, data jsonb, timestamps
    applications    id (pk), user_id -> auth.users, (user_id, job_id) -> jobs, status, match_score, timestamps

Row Level Security: users can only read/write their own profiles, jobs, and applications rows
(auth.uid() = user_id). Uploading a new CV deletes that user's previous jobs (their applications
cascade-delete) and stores fresh jobs for the new profile.

---

## Live job data (no mock jobs)

Job postings are fetched from real, public job-board APIs and normalised into the `Job` domain type,
filtered against the candidate's roles/skills/location, deduplicated, and cached for 10 minutes.

| Provider  | Public API? | Key required? | Notes |
|-----------|-------------|---------------|-------|
| Remotive  | yes         | no            | remote-first tech jobs |
| Arbeitnow | yes         | no            | European jobs |
| Jobicy    | yes         | no            | remote jobs, structured salary |
| The Muse  | yes         | no            | company career pages |
| PublicJobs.ie | HTML board | no         | Ireland's public-sector board (civil service, HSE, local government, state bodies); parsed from Tal.net |
| Adzuna    | yes         | yes           | job-board aggregator (set `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`) |
| Jooble    | yes         | yes           | aggregator; surfaces listings sourced from LinkedIn/etc. (set `JOOBLE_API_KEY`) |
| Indeed    | partner     | yes           | board-native postings via Indeed's GraphQL API (set `INDEED_CLIENT_ID`/`INDEED_CLIENT_SECRET`) |
| Indeed (Apify) | Apify actor | yes       | board-native postings scraped with `misceres/indeed-scraper`; returns at most **50 results per CV submission** (set `APIFY_API_TOKEN`) |

Job search is ordered by market: the candidate's country first, then a priority market (Ireland — since
Adzuna has no Irish index and PublicJobs/Jooble/Indeed carry the board-native Irish coverage), then
worldwide, and results are grouped by country in the UI.

Indeed's modern API is a GraphQL API at `https://apis.indeed.com/graphql`. The **Job Sync API**
(`jobsIngest.*` mutations) creates and manages job postings *on* Indeed (employer/ATS side), while the
candidate-facing **`jobSearch`** query retrieves live postings. `jobSearch` is gated: it requires the
`job-retrieval-service` entitlement on your Indeed partner app, so the adapter is enabled only when
`INDEED_CLIENT_ID`/`INDEED_CLIENT_SECRET` (or a pre-issued `INDEED_ACCESS_TOKEN`) are configured, and it
degrades to no results — never a hard failure — when that entitlement is absent.

**Indeed via Apify** (`APIFY_API_TOKEN` set) adds a second board-native Indeed source through the public
`misceres/indeed-scraper` actor, which needs no partner entitlement. On every CV submission it runs one
actor job for the candidate's role keywords and primary location (country codes map to the actor's enum,
e.g. Ireland -> `IE`), requests at most `maxItemsPerSearch: 50` postings, and hard-caps its contribution
at **50 results per CV submission** (deduplicated, normalised into the same `Job` type). The run is
started asynchronously and polled until it finishes (the actor uses residential proxies, so it can take a
couple of minutes); a failed or timed-out run degrades to zero Apify results, never a hard failure.

LinkedIn still offers no third-party public job-search API, so its listings continue to come through the
Adzuna/Jooble aggregators. The app never fabricates jobs, salary figures, or market statistics: every value
is either read from a posting or computed from the fetched set.

---

## Architecture

    +----------------+   Supabase Auth (JWT)   +---------------------------+
    |   Web Client   | ----------------------> |  API (Express)            |
    |   React + Vite |   Authorization header  |  verifies JWT -> user id  |
    +----------------+                         +-------------+-------------+
                                                            |
                          +----------------+----------------+----------------+
                          |                |                |                |
                    Candidate Service  Job Service   Application Service  AI Service
                          |                |                |                |
                          +----------------+----------------+----------------+
                                                            |
                                             +--------------+--------------+
                                             |  Supabase Postgres (RLS)    |
                                             |  profiles / jobs / apps     |
                                             +-----------------------------+
                                             |  DeepSeek v4 pro (LLM)      |
                                             +-----------------------------+

The matching engine is deterministic and explainable; DeepSeek handles the generative text (cover
letters, tailored summaries, recommendations, interview prep notes) with deterministic fallbacks.

---

## Project structure

    apps/
      api/
        src/
          domain.ts            # domain types
          config.ts            # env loading + config
          supabase.ts          # server-side Supabase clients
          auth.ts              # JWT verification middleware
          repo.ts              # Supabase-backed data access
          util.ts              # id + async handler helpers
          data/                # skill taxonomy, sample CV
          jobs/                # real job providers + ingestion
          parsing/             # CV parser + DOCX + PDF extractors
          matching/            # explainable match-scoring engine
          llm/provider.ts      # DeepSeek + deterministic fallback
          agents/              # orchestrator + specialist agents
          services/            # candidate/job/application/AI services
          routes/              # authenticated REST routes
          index.ts             # server bootstrap + static SPA serving
      web/
        src/
          supabase.ts          # browser Supabase client
          api.ts               # typed API client (attaches JWT)
          AppContext.tsx       # session + profile state
          pages/Auth.tsx       # sign in / sign up
          pages/*              # dashboard, matches, job detail, etc.
    supabase/schema.sql        # one-time migration (tables + RLS + seed)

---

## API

All endpoints under /api require Authorization: Bearer <supabase-access-token> except /health.

    GET  /api/health
    POST /api/cv/analyze            # parse + persist a CV (text | pdf/docx base64 | useSample)
    GET  /api/profile
    POST /api/profile
    GET  /api/jobs
    GET  /api/jobs/:id
    GET  /api/matches
    GET  /api/matches/:jobId
    GET  /api/digest
    GET  /api/applications
    POST /api/applications
    PATCH /api/applications/:id
    POST /api/applications/:jobId/prepare
    GET  /api/career/insights
    POST /api/interview/simulate

---

## Matching engine (explainable by design)

The overall score is a weighted sum of seven categories:

    skills (34%), experience (20%), location (10%), salary (10%),
    education (10%), seniority (10%), work authorization (6%)

Skill matching uses a synonym-aware taxonomy. Nice-to-have skills are weighted at 40% of required
skills. Recommendations: >=80 APPLY, >=62 CONSIDER, otherwise SKIP.

---

## AI (DeepSeek v4 pro)

Set DEEPSEEK_API_KEY (and optionally DEEPSEEK_BASE_URL / DEEPSEEK_MODEL) in apps/api/.env. The provider
calls the OpenAI-compatible POST {base}/chat/completions endpoint with model deepseek-v4-pro. If the call
fails or no key is configured, each agent falls back to a deterministic template, so the product always
works.

---

## Production hardening (next steps)

- Enable email confirmation and password-reset emails for production auth.
- Add vector embeddings for semantic skill matching.
- Obtain an Indeed partner app with the job-retrieval-service entitlement to unlock Indeed's GraphQL
  `jobSearch` (the adapter is already wired in and activates once `INDEED_CLIENT_ID`/`INDEED_CLIENT_SECRET`
  are set). Board-native Indeed search already works without the entitlement via the Apify
  `misceres/indeed-scraper` provider (`APIFY_API_TOKEN`), which returns up to 50 results per CV submission.
  Add a LinkedIn partner integration for board-native LinkedIn listings.
- Rate limiting, audit logging, and per-user plan/subscription enforcement.
- Split into Java/Spring Boot + Python/FastAPI services behind an API gateway, orchestrated with Docker
  Compose / Kubernetes and Kafka.

