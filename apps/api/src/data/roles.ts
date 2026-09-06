// Industry-agnostic role tokenization.
//
// Job titles are turned into two kinds of tokens so search and matching stay
// targeted to whatever the candidate actually does (nurse, accountant, teacher,
// engineer, sales, chef, ...) instead of a hard-coded list of tech roles:
//
//   - roleTokens: single content words from the candidate's titles, with
//     seniority/level qualifiers and function words stripped. Used for keyword
//     search and title relevance.
//   - GENERIC_ROLE_WORDS: role-family words that carry little domain signal on
//     their own ("manager", "specialist", "analyst", ...). They still match, but
//     only as a weaker fallback so a "Marketing Manager" profile is not flooded
//     with every "Facilities Manager" posting.

// Words that only signal seniority / level / grammar and never a domain.
const ROLE_STOP_WORDS = new Set([
  'senior', 'junior', 'mid', 'midweight', 'lead', 'staff', 'principal', 'chief',
  'head', 'trainee', 'intern', 'graduate', 'entry', 'level', 'sr', 'jr', 'snr',
  'jnr', 'i', 'ii', 'iii', 'iv', 'v', 'ceo', 'cto', 'cfo', 'coo', 'cmo', 'cpo',
  'cio', 'vp', 'svp', 'evp', 'gm',
  // function words
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'at', 'to', 'on',
  'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'de', 'la', 'le', 'du',
  'van', 'der', 'di', 'del', 'dos', 'da', 'e', 'y',
]);

// Role-family words: meaningful as a category, but too broad to target a domain
// on their own. They are matched only when a domain token or a skill also
// matches (or when several of them match at once).
export const GENERIC_ROLE_WORDS = new Set([
  'manager', 'specialist', 'consultant', 'analyst', 'officer', 'coordinator',
  'executive', 'supervisor', 'advisor', 'associate', 'administrator', 'assistant',
  'representative', 'agent', 'clerk', 'worker', 'operator', 'technician',
  'engineer', 'developer', 'designer', 'architect', 'scientist', 'director',
  'recruiter', 'strategist', 'planner', 'attendant', 'aide', 'member', 'team',
  'support', 'professional', 'expert', 'generalist', 'practitioner', 'researcher',
]);

export function isGenericRoleWord(word: string): boolean {
  return GENERIC_ROLE_WORDS.has(word);
}

// Splits free-form role text into unique, lowercase content-word tokens.
export function roleTokensFrom(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[|,/&()[\]:;]+/g, ' ')
    .split(/\s+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words) {
    const t = raw.replace(/[^a-z0-9+#.-]/g, '');
    if (t.length < 2) continue;
    if (ROLE_STOP_WORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

// Deduplicated, human-readable role phrases (full titles) for API search terms.
export function rolePhrasesFrom(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of titles) {
    const t = (raw || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 80) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 6);
}
