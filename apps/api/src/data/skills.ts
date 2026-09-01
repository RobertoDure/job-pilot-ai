// Skill taxonomy: canonical name -> aliases. Used by the CV parser and matcher.
//
// The taxonomy spans many industries so that a CV from any field (healthcare,
// education, sales, finance, legal, trades, hospitality, engineering, ...) is
// recognised. Skills not listed here are still captured generically by the CV
// parser from the CV's own "Skills" section, so coverage is not limited to this
// list — it only improves matching against the phrasing used in job postings.

export interface SkillDef {
  name: string;
  aliases: string[];
  category: string;
}

export const SKILLS: SkillDef[] = [
  // --- Software engineering & data ---
  { name: 'Java', aliases: ['java', 'j2ee', 'java se', 'jdk', 'jvm'], category: 'language' },
  { name: 'Spring Boot', aliases: ['spring boot', 'springboot', 'spring framework', 'spring mvc'], category: 'framework' },
  { name: 'Spring Security', aliases: ['spring security'], category: 'framework' },
  { name: 'Hibernate', aliases: ['hibernate', 'jpa', 'jakarta persistence'], category: 'framework' },
  { name: 'Microservices', aliases: ['microservices', 'microservices architecture', 'micro-service'], category: 'architecture' },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'], category: 'platform' },
  { name: 'Docker', aliases: ['docker', 'docker compose', 'containers', 'containerization'], category: 'platform' },
  { name: 'AWS', aliases: ['aws', 'amazon web services', 'ec2', 's3', 'rds', 'eks', 'amazon'], category: 'cloud' },
  { name: 'AWS Lambda', aliases: ['aws lambda', 'lambda', 'serverless'], category: 'cloud' },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'], category: 'cloud' },
  { name: 'GCP', aliases: ['gcp', 'google cloud', 'google cloud platform'], category: 'cloud' },
  { name: 'Terraform', aliases: ['terraform', 'infrastructure as code', 'iac', 'hashicorp terraform'], category: 'infra' },
  { name: 'CI/CD', aliases: ['ci/cd', 'ci cd', 'continuous integration', 'continuous delivery', 'jenkins', 'gitlab ci', 'github actions', 'circleci'], category: 'infra' },
  { name: 'Kafka', aliases: ['kafka', 'apache kafka', 'event streaming', 'event-driven'], category: 'architecture' },
  { name: 'RabbitMQ', aliases: ['rabbitmq', 'rabbit mq', 'message queue', 'amqp'], category: 'architecture' },
  { name: 'REST APIs', aliases: ['rest', 'rest api', 'restful', 'api design', 'apis'], category: 'concept' },
  { name: 'GraphQL', aliases: ['graphql'], category: 'concept' },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres', 'postgre'], category: 'database' },
  { name: 'MySQL', aliases: ['mysql'], category: 'database' },
  { name: 'Oracle', aliases: ['oracle database', 'oracle db', 'pl/sql', 'plsql'], category: 'database' },
  { name: 'MongoDB', aliases: ['mongodb', 'mongo'], category: 'database' },
  { name: 'Redis', aliases: ['redis', 'elasticache'], category: 'database' },
  { name: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search', 'elk', 'opensearch'], category: 'database' },
  { name: 'SQL', aliases: ['sql'], category: 'database' },
  { name: 'NoSQL', aliases: ['nosql', 'no sql'], category: 'database' },
  { name: 'TypeScript', aliases: ['typescript', 'type script'], category: 'language' },
  { name: 'JavaScript', aliases: ['javascript', 'js', 'es6', 'node.js', 'nodejs', 'node js', 'node'], category: 'language' },
  { name: 'React', aliases: ['react', 'react.js', 'reactjs'], category: 'frontend' },
  { name: 'Angular', aliases: ['angular', 'angularjs'], category: 'frontend' },
  { name: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'], category: 'frontend' },
  { name: 'Python', aliases: ['python', 'django', 'flask', 'fastapi'], category: 'language' },
  { name: 'Kotlin', aliases: ['kotlin'], category: 'language' },
  { name: 'Go', aliases: ['golang', 'go language'], category: 'language' },
  { name: 'C#', aliases: ['c#', 'csharp', '.net', 'dotnet', '.net core', 'asp.net'], category: 'language' },
  { name: 'Agile', aliases: ['agile', 'scrum', 'kanban', 'sprint'], category: 'process' },
  { name: 'TDD', aliases: ['tdd', 'test driven development', 'unit testing', 'junit', 'mockito', 'testng'], category: 'process' },
  { name: 'Git', aliases: ['git', 'version control', 'github', 'gitlab', 'bitbucket'], category: 'process' },
  { name: 'Linux', aliases: ['linux', 'unix', 'bash', 'shell scripting'], category: 'platform' },
  { name: 'Maven', aliases: ['maven'], category: 'build' },
  { name: 'Gradle', aliases: ['gradle'], category: 'build' },
  { name: 'gRPC', aliases: ['grpc'], category: 'concept' },
  { name: 'OAuth', aliases: ['oauth', 'oauth2', 'oidc', 'openid connect', 'sso'], category: 'security' },
  { name: 'Machine Learning', aliases: ['machine learning', 'data science', 'data analytics', 'deep learning', 'pandas', 'numpy', 'scikit'], category: 'data' },
  { name: 'Data Engineering', aliases: ['data engineering', 'etl', 'data pipeline', 'spark', 'airflow', 'databricks'], category: 'data' },
  { name: 'JUnit', aliases: ['junit'], category: 'testing' },
  { name: 'Selenium', aliases: ['selenium', 'test automation'], category: 'testing' },
  { name: 'Prometheus', aliases: ['prometheus', 'monitoring', 'observability', 'grafana', 'datadog'], category: 'observability' },

  // --- Healthcare ---
  { name: 'Patient Care', aliases: ['patient care', 'care of patients', 'direct patient care'], category: 'healthcare' },
  { name: 'Nursing', aliases: ['nursing', 'registered nurse', 'staff nurse', 'nurse practitioner'], category: 'healthcare' },
  { name: 'Medication Administration', aliases: ['medication administration', 'administering medication', 'drug administration'], category: 'healthcare' },
  { name: 'Phlebotomy', aliases: ['phlebotomy', 'venepuncture', 'venipuncture'], category: 'healthcare' },
  { name: 'Vital Signs', aliases: ['vital signs', 'patient monitoring'], category: 'healthcare' },
  { name: 'EHR / EMR', aliases: ['ehr', 'emr', 'electronic health record', 'epic', 'cerner', 'meditech'], category: 'healthcare' },
  { name: 'CPR', aliases: ['cpr', 'cardiopulmonary resuscitation'], category: 'healthcare' },
  { name: 'First Aid', aliases: ['first aid', 'basic life support', 'bls', 'acls', 'advanced life support'], category: 'healthcare' },
  { name: 'Infection Control', aliases: ['infection control', 'infection prevention'], category: 'healthcare' },
  { name: 'Medical Terminology', aliases: ['medical terminology'], category: 'healthcare' },
  { name: 'Case Management', aliases: ['case management', 'care coordination'], category: 'healthcare' },
  { name: 'Clinical Research', aliases: ['clinical research', 'clinical trials', 'gcp'], category: 'healthcare' },
  { name: 'Wound Care', aliases: ['wound care', 'wound management'], category: 'healthcare' },
  { name: 'Radiology', aliases: ['radiology', 'radiography', 'medical imaging', 'mri', 'ct scan'], category: 'healthcare' },
  { name: 'Pharmacy', aliases: ['pharmacy', 'pharmacist', 'pharmacology', 'dispensing'], category: 'healthcare' },
  { name: 'Physiotherapy', aliases: ['physiotherapy', 'physical therapy', 'rehabilitation'], category: 'healthcare' },
  { name: 'Occupational Therapy', aliases: ['occupational therapy', 'occupational therapist'], category: 'healthcare' },
  { name: 'Mental Health', aliases: ['mental health', 'counselling', 'counseling', 'psychotherapy', 'psychology', 'cbt'], category: 'healthcare' },
  { name: 'Dental', aliases: ['dental', 'dentistry', 'oral health'], category: 'healthcare' },
  { name: 'Veterinary', aliases: ['veterinary', 'veterinarian', 'animal care'], category: 'healthcare' },
  { name: 'Public Health', aliases: ['public health', 'epidemiology', 'health promotion'], category: 'healthcare' },
  { name: 'HIPAA', aliases: ['hipaa', 'gdpr', 'data protection'], category: 'healthcare' },

  // --- Education ---
  { name: 'Teaching', aliases: ['teaching', 'teacher', 'classroom instruction', 'lecturing'], category: 'education' },
  { name: 'Curriculum Development', aliases: ['curriculum development', 'curriculum design', 'lesson planning'], category: 'education' },
  { name: 'Classroom Management', aliases: ['classroom management', 'behaviour management', 'behavior management'], category: 'education' },
  { name: 'Special Education', aliases: ['special education', 'sen', 'special needs', 'learning support'], category: 'education' },
  { name: 'Instructional Design', aliases: ['instructional design', 'e-learning design', 'elearning design', 'lms'], category: 'education' },
  { name: 'Tutoring', aliases: ['tutoring', 'tutor', 'mentoring'], category: 'education' },
  { name: 'Early Childhood Education', aliases: ['early childhood education', 'childcare', 'early years', 'montessori'], category: 'education' },
  { name: 'ESL / TEFL', aliases: ['esl', 'tefl', 'tesol', 'english as a second language'], category: 'education' },

  // --- Sales & account management ---
  { name: 'Sales', aliases: ['sales', 'selling', 'business development', 'account executive'], category: 'sales' },
  { name: 'Account Management', aliases: ['account management', 'key account', 'client relationship', 'customer success'], category: 'sales' },
  { name: 'Lead Generation', aliases: ['lead generation', 'prospecting', 'cold calling', 'outbound sales'], category: 'sales' },
  { name: 'CRM', aliases: ['crm', 'salesforce', 'hubspot', 'pipedrive', 'zoho crm'], category: 'sales' },
  { name: 'Negotiation', aliases: ['negotiation', 'negotiating', 'deal closing'], category: 'sales' },
  { name: 'B2B Sales', aliases: ['b2b sales', 'b2b', 'enterprise sales', 'inside sales', 'field sales'], category: 'sales' },

  // --- Marketing & communications ---
  { name: 'Marketing', aliases: ['marketing', 'marketing campaigns', 'brand marketing'], category: 'marketing' },
  { name: 'Digital Marketing', aliases: ['digital marketing', 'online marketing', 'growth marketing'], category: 'marketing' },
  { name: 'SEO', aliases: ['seo', 'search engine optimization', 'search engine optimisation'], category: 'marketing' },
  { name: 'SEM / PPC', aliases: ['sem', 'ppc', 'paid search', 'google ads', 'adwords', 'paid media'], category: 'marketing' },
  { name: 'Content Marketing', aliases: ['content marketing', 'content strategy', 'content creation'], category: 'marketing' },
  { name: 'Social Media Marketing', aliases: ['social media marketing', 'social media', 'community management'], category: 'marketing' },
  { name: 'Email Marketing', aliases: ['email marketing', 'newsletter', 'mailchimp'], category: 'marketing' },
  { name: 'Brand Management', aliases: ['brand management', 'brand strategy', 'branding'], category: 'marketing' },
  { name: 'Copywriting', aliases: ['copywriting', 'copywriter', 'copy writing'], category: 'marketing' },
  { name: 'Market Research', aliases: ['market research', 'consumer research', 'survey design'], category: 'marketing' },
  { name: 'Google Analytics', aliases: ['google analytics', 'ga4', 'web analytics'], category: 'marketing' },
  { name: 'Public Relations', aliases: ['public relations', 'pr', 'media relations', 'press'], category: 'marketing' },

  // --- Finance, accounting & legal ---
  { name: 'Accounting', aliases: ['accounting', 'accountant', 'financial accounting'], category: 'finance' },
  { name: 'Financial Analysis', aliases: ['financial analysis', 'financial modelling', 'financial modeling', 'fp&a'], category: 'finance' },
  { name: 'Auditing', aliases: ['auditing', 'audit', 'internal audit', 'external audit'], category: 'finance' },
  { name: 'Bookkeeping', aliases: ['bookkeeping', 'bookkeeper', 'double entry'], category: 'finance' },
  { name: 'Payroll', aliases: ['payroll', 'payroll processing'], category: 'finance' },
  { name: 'Tax Preparation', aliases: ['tax preparation', 'tax compliance', 'tax filing', 'corporation tax', 'vat'], category: 'finance' },
  { name: 'Financial Reporting', aliases: ['financial reporting', 'statutory reporting', 'management accounts'], category: 'finance' },
  { name: 'IFRS / GAAP', aliases: ['ifrs', 'gaap', 'international financial reporting standards'], category: 'finance' },
  { name: 'Budgeting & Forecasting', aliases: ['budgeting', 'forecasting', 'budget management', 'financial planning'], category: 'finance' },
  { name: 'QuickBooks', aliases: ['quickbooks', 'xero', 'sage accounting', 'sap fico'], category: 'finance' },
  { name: 'Risk Management', aliases: ['risk management', 'risk assessment', 'enterprise risk'], category: 'finance' },
  { name: 'Actuarial', aliases: ['actuarial', 'actuary'], category: 'finance' },
  { name: 'Accounts Payable', aliases: ['accounts payable', 'accounts receivable', 'invoicing', 'reconciliation'], category: 'finance' },
  { name: 'Legal Research', aliases: ['legal research', 'case law', 'legal drafting', 'contract drafting'], category: 'legal' },
  { name: 'Compliance', aliases: ['compliance', 'regulatory compliance', 'aml', 'kyc', 'anti-money laundering'], category: 'legal' },
  { name: 'Contract Management', aliases: ['contract management', 'contract review', 'contract negotiation'], category: 'legal' },
  { name: 'Intellectual Property', aliases: ['intellectual property', 'trademark', 'patent', 'copyright'], category: 'legal' },

  // --- HR, people & administration ---
  { name: 'Human Resources', aliases: ['human resources', 'people management', 'employee relations'], category: 'hr' },
  { name: 'Recruiting', aliases: ['recruiting', 'recruitment', 'talent acquisition', 'sourcing', 'hiring'], category: 'hr' },
  { name: 'Onboarding', aliases: ['onboarding', 'induction'], category: 'hr' },
  { name: 'Performance Management', aliases: ['performance management', 'performance reviews', 'appraisals'], category: 'hr' },
  { name: 'Compensation & Benefits', aliases: ['compensation and benefits', 'compensation & benefits', 'benefits administration', 'c&b'], category: 'hr' },
  { name: 'HRIS', aliases: ['hris', 'workday', 'bamboo', 'successfactors'], category: 'hr' },
  { name: 'Training & Development', aliases: ['training and development', 'training & development', 'ld', 'learning and development'], category: 'hr' },

  // --- Operations, project & supply chain ---
  { name: 'Project Management', aliases: ['project management', 'project manager', 'pmp', 'prince2', 'scrum master'], category: 'operations' },
  { name: 'Operations Management', aliases: ['operations management', 'operations manager', 'ops management'], category: 'operations' },
  { name: 'Supply Chain', aliases: ['supply chain', 'supply chain management', 'scm'], category: 'operations' },
  { name: 'Logistics', aliases: ['logistics', 'distribution', 'fleet management'], category: 'operations' },
  { name: 'Procurement', aliases: ['procurement', 'purchasing', 'sourcing', 'vendor management', 'supplier management'], category: 'operations' },
  { name: 'Inventory Management', aliases: ['inventory management', 'stock control', 'stock management'], category: 'operations' },
  { name: 'Process Improvement', aliases: ['process improvement', 'continuous improvement', 'lean', 'six sigma', 'kaizen'], category: 'operations' },
  { name: 'Quality Assurance', aliases: ['quality assurance', 'qa', 'quality control', 'iso 9001'], category: 'operations' },
  { name: 'Facilities Management', aliases: ['facilities management', 'building maintenance', 'estates management'], category: 'operations' },

  // --- Customer service & administration ---
  { name: 'Customer Service', aliases: ['customer service', 'customer support', 'client services', 'customer care'], category: 'support' },
  { name: 'Call Center', aliases: ['call center', 'call centre', 'contact center', 'helpdesk', 'help desk'], category: 'support' },
  { name: 'Complaint Resolution', aliases: ['complaint resolution', 'dispute resolution', 'escalation management'], category: 'support' },
  { name: 'Administrative Support', aliases: ['administrative support', 'office administration', 'secretarial', 'clerical'], category: 'admin' },
  { name: 'Data Entry', aliases: ['data entry', 'data input', 'records management', 'filing'], category: 'admin' },
  { name: 'Microsoft Office', aliases: ['microsoft office', 'ms office', 'office 365', 'microsoft 365', 'excel', 'microsoft excel', 'ms excel', 'microsoft word', 'powerpoint', 'outlook'], category: 'admin' },
  { name: 'Google Workspace', aliases: ['google workspace', 'g suite', 'google docs', 'google sheets', 'gmail'], category: 'admin' },

  // --- Creative & design ---
  { name: 'Graphic Design', aliases: ['graphic design', 'visual design', 'brand design'], category: 'creative' },
  { name: 'Adobe Photoshop', aliases: ['adobe photoshop', 'photoshop'], category: 'creative' },
  { name: 'Adobe Illustrator', aliases: ['adobe illustrator', 'illustrator'], category: 'creative' },
  { name: 'InDesign', aliases: ['indesign', 'adobe indesign'], category: 'creative' },
  { name: 'Figma', aliases: ['figma', 'sketch', 'adobe xd'], category: 'creative' },
  { name: 'UI/UX Design', aliases: ['ui/ux', 'ux design', 'ui design', 'user experience', 'user interface design', 'wireframing'], category: 'creative' },
  { name: 'Video Editing', aliases: ['video editing', 'video production', 'premiere pro', 'final cut', 'after effects'], category: 'creative' },
  { name: 'Photography', aliases: ['photography', 'photo editing', 'lightroom'], category: 'creative' },
  { name: 'Animation', aliases: ['animation', 'motion graphics', '3d modeling', '3d modelling', 'blender', 'maya'], category: 'creative' },
  { name: 'AutoCAD', aliases: ['autocad', 'solidworks', 'revit', 'cad'], category: 'creative' },

  // --- Trades & manufacturing ---
  { name: 'Construction', aliases: ['construction', 'site management', 'building works'], category: 'trades' },
  { name: 'Welding', aliases: ['welding', 'welder', 'mig', 'tig'], category: 'trades' },
  { name: 'Plumbing', aliases: ['plumbing', 'plumber'], category: 'trades' },
  { name: 'Electrical', aliases: ['electrical', 'electrician', 'wiring', 'electrical installation'], category: 'trades' },
  { name: 'Carpentry', aliases: ['carpentry', 'carpenter', 'joinery'], category: 'trades' },
  { name: 'HVAC', aliases: ['hvac', 'heating', 'ventilation', 'air conditioning'], category: 'trades' },
  { name: 'OSHA', aliases: ['osha', 'health and safety', 'hse', 'safety compliance', 'risk assessment'], category: 'trades' },
  { name: 'CNC', aliases: ['cnc', 'machining', 'machinist', 'lathe', 'milling'], category: 'trades' },
  { name: 'Forklift', aliases: ['forklift', 'reach truck', 'warehouse equipment'], category: 'trades' },
  { name: 'Blueprint Reading', aliases: ['blueprint reading', 'technical drawing', 'engineering drawings'], category: 'trades' },

  // --- Hospitality & food ---
  { name: 'Food Safety', aliases: ['food safety', 'haccp', 'food hygiene', 'servsafe'], category: 'hospitality' },
  { name: 'Culinary', aliases: ['culinary', 'chef', 'cook', 'kitchen', 'food preparation'], category: 'hospitality' },
  { name: 'Barista', aliases: ['barista', 'coffee'], category: 'hospitality' },
  { name: 'Housekeeping', aliases: ['housekeeping', 'cleaning', 'janitorial'], category: 'hospitality' },
  { name: 'Event Planning', aliases: ['event planning', 'event management', 'conference', 'wedding planning'], category: 'hospitality' },
  { name: 'Front Desk', aliases: ['front desk', 'reception', 'reservations', 'guest services'], category: 'hospitality' },

  // --- Real estate ---
  { name: 'Real Estate', aliases: ['real estate', 'property sales', 'lettings', 'estate agency'], category: 'realestate' },
  { name: 'Property Management', aliases: ['property management', 'landlord', 'tenancy'], category: 'realestate' },
  { name: 'Leasing', aliases: ['leasing', 'appraisal', 'valuation', 'mls'], category: 'realestate' },

  // --- Transferable / soft skills ---
  { name: 'Communication', aliases: ['communication', 'communication skills', 'presentation skills'], category: 'soft' },
  { name: 'Leadership', aliases: ['leadership', 'team leadership', 'people leadership'], category: 'soft' },
  { name: 'Teamwork', aliases: ['teamwork', 'collaboration', 'cross-functional'], category: 'soft' },
  { name: 'Time Management', aliases: ['time management', 'prioritisation', 'prioritization', 'organisation skills', 'organization skills'], category: 'soft' },
  { name: 'Problem Solving', aliases: ['problem solving', 'problem-solving', 'analytical skills', 'critical thinking'], category: 'soft' },
  { name: 'Public Speaking', aliases: ['public speaking', 'presentation', 'facilitation'], category: 'soft' },
  { name: 'Conflict Resolution', aliases: ['conflict resolution', 'mediation', 'de-escalation'], category: 'soft' },
  { name: 'Bilingual', aliases: ['bilingual', 'multilingual', 'fluent in', 'translation', 'interpreting'], category: 'soft' },
];

const aliasToName = new Map<string, string>();
for (const s of SKILLS) {
  for (const a of s.aliases) aliasToName.set(a, s.name);
}

export function resolveSkill(text: string): string | null {
  return aliasToName.get(text.toLowerCase()) ?? null;
}

export function skillNames(): string[] {
  return SKILLS.map((s) => s.name);
}

function escapeRe(s: string): string {
  return s.replace(/[.+\/#]/g, '\\$&');
}

const WORD_CHARS = 'a-z0-9+#./-';

// Precompile the per-alias matchers once. Single-word aliases match on word
// boundaries so "ml" does not match "html"; multi-word aliases use substring
// matching (they are already specific enough).
const COMPILED: { name: string; re: RegExp | null; alias: string }[] = SKILLS.flatMap((s) =>
  s.aliases.map((a) => ({
    name: s.name,
    alias: a,
    re: /^[a-z0-9+#./-]+$/.test(a)
      ? new RegExp('(?:^|[^' + WORD_CHARS + '])' + escapeRe(a) + '(?:$|[^' + WORD_CHARS + '])')
      : null,
  })),
);

export function detectSkillsInText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const { name, re, alias } of COMPILED) {
    if (re) {
      if (re.test(lower)) found.add(name);
    } else if (lower.includes(alias)) {
      found.add(name);
    }
  }
  return [...found];
}
