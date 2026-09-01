// Shared, cross-industry keyword map used to tag both a candidate's CV
// (which industries they mention) and live job postings (which industry a job
// belongs to). This is deliberately broad so the product is not anchored to
// technology roles.

export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'FinTech': ['fintech', 'financial technology', 'payments', 'payment processing', 'trading platform'],
  'Banking & Financial Services': ['banking', 'bank', 'capital markets', 'lending', 'wealth management', 'investment banking', 'retail banking', 'credit union'],
  'Insurance': ['insurance', 'insurtech', 'underwriting', 'actuarial', 'reinsurance'],
  'Accounting & Audit': ['accounting', 'accountancy', 'audit', 'auditing', 'bookkeeping', 'tax', 'taxation', 'cpa firm', 'big four'],
  'Healthcare': ['healthcare', 'health care', 'health', 'medical', 'hospital', 'clinic', 'medtech', 'patient care', 'telehealth', 'nhs'],
  'Pharmaceuticals & Biotech': ['pharma', 'pharmaceutical', 'biotech', 'biotechnology', 'life sciences', 'clinical research', 'drug'],
  'Education': ['education', 'edtech', 'school', 'university', 'academy', 'teaching', 'learning', 'training provider', 'e-learning', 'elearning'],
  'Legal': ['legal', 'law firm', 'lawyer', 'litigation', 'attorney', 'solicitor', 'barrister', 'paralegal'],
  'Human Resources': ['human resources', 'people operations', 'talent acquisition', 'recruitment', 'recruiting', 'staffing', 'payroll provider'],
  'Marketing & Advertising': ['marketing', 'advertising', 'adtech', 'public relations', 'brand', 'media agency', 'digital agency', 'seo agency'],
  'Retail & eCommerce': ['retail', 'ecommerce', 'e-commerce', 'merchandising', 'consumer goods', 'fashion', 'supermarket', 'grocery'],
  'Manufacturing': ['manufacturing', 'factory', 'industrial', 'assembly', 'fabrication', 'machining'],
  'Construction & Engineering': ['construction', 'civil engineering', 'infrastructure', 'architecture firm', 'contractor', 'building services', 'construction management', 'surveying', 'structural engineering'],
  'Real Estate': ['real estate', 'property', 'leasing', 'construction management', 'facilities management'],
  'Logistics & Supply Chain': ['logistics', 'supply chain', 'warehouse', 'warehousing', 'freight', 'shipping', 'distribution', 'transportation'],
  'Hospitality & Tourism': ['hospitality', 'hotel', 'restaurant', 'tourism', 'travel', 'airline', 'catering', 'food service'],
  'Food & Beverage': ['food', 'beverage', 'brewery', 'food manufacturing', 'restaurant group', 'f&b'],
  'Media & Entertainment': ['media', 'entertainment', 'broadcast', 'publishing', 'film', 'television', 'gaming', 'games', 'music', 'streaming'],
  'Telecommunications': ['telecommunications', 'telecom', 'telecoms', 'mobile network', 'broadband', 'isp'],
  'Energy & Utilities': ['energy', 'renewable', 'utilities', 'oil and gas', 'oil & gas', 'solar', 'wind energy', 'power generation', 'electricity', 'grid'],
  'Automotive': ['automotive', 'automobile', 'vehicle', 'car manufacturer', 'mobility'],
  'Aerospace & Defence': ['aerospace', 'defence', 'defense', 'aviation', 'space'],
  'Government & Public Sector': ['government', 'public sector', 'municipal', 'civil service', 'federal', 'local authority'],
  'Non-profit & NGO': ['non-profit', 'nonprofit', 'ngo', 'charity', 'charitable', 'foundation', 'humanitarian'],
  'Professional Services': ['consulting', 'consultancy', 'professional services', 'management consulting', 'advisory'],
  'Software & Technology': ['software', 'saas', 'technology', 'cloud', 'it services', 'internet', 'web development', 'app development'],
  'AI & Data': ['machine learning', 'artificial intelligence', 'ai', 'ml', 'llm', 'data science', 'data analytics', 'big data'],
  'Security': ['security', 'cybersecurity', 'cyber', 'defence', 'physical security'],
  'Agriculture': ['agriculture', 'farming', 'agtech', 'agri', 'food production'],
  'Sports & Fitness': ['sports', 'sport', 'fitness', 'gym', 'wellness', 'recreation'],
  'Beauty & Personal Care': ['beauty', 'cosmetics', 'personal care', 'salon', 'spa'],
};

const KEYS = Object.keys(INDUSTRY_KEYWORDS);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches a keyword against lowercased, space-padded text. Short acronyms
// ("hr", "ai", "ml") require word boundaries so "hr" does not match inside
// "ehr" or "ml" inside "html"; longer phrases use substring matching.
function keywordMatch(padded: string, kw: string): boolean {
  const k = kw.trim();
  if (!k) return false;
  if (/^[a-z0-9]+$/.test(k) && k.length <= 3) {
    return new RegExp('\\b' + escapeRe(k) + '\\b').test(padded);
  }
  return padded.includes(k);
}

// Returns the industries mentioned in the given text (case-insensitive),
// in the order they appear in the map. Used for CV parsing.
export function detectIndustriesInText(text: string): string[] {
  const t = ' ' + text.toLowerCase() + ' ';
  const out: string[] = [];
  for (const name of KEYS) {
    if (INDUSTRY_KEYWORDS[name].some((k) => keywordMatch(t, k))) out.push(name);
  }
  return out;
}

// Returns the single best-matching industry label for a job posting, or null.
export function detectIndustryLabel(text: string): string | null {
  const t = ' ' + text.toLowerCase() + ' ';
  for (const name of KEYS) {
    if (INDUSTRY_KEYWORDS[name].some((k) => keywordMatch(t, k))) return name;
  }
  return null;
}
