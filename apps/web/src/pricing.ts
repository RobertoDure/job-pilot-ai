export interface PricingTier {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

export const TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '€0',
    cadence: 'forever',
    tagline: 'Try the copilot',
    features: [
      '10 job matches / month',
      'Basic CV analysis',
      'Application tracker',
      'Explainable match scores',
    ],
    highlighted: false,
    cta: 'Start free',
  },
  {
    name: 'Job Seeker',
    price: '€9.99',
    cadence: '/month',
    tagline: 'Your daily job-search copilot',
    features: [
      'Unlimited job matching',
      'AI job scoring',
      'CV tailoring',
      'Cover letters',
      'Application tracking',
    ],
    highlighted: false,
    cta: 'Choose Job Seeker',
  },
  {
    name: 'JobPilot Pro',
    price: '€24.99',
    cadence: '/month',
    tagline: 'The full AI job agent',
    features: [
      'Automated job discovery',
      'Advanced CV optimization',
      'Interview preparation',
      'Salary analysis',
      'Application automation',
      'Career analytics',
    ],
    highlighted: true,
    cta: 'Choose Pro',
  },
  {
    name: 'JobPilot Max',
    price: '€49.99',
    cadence: '/month',
    tagline: 'For the ambitious career',
    features: [
      'Multiple CV versions',
      'LinkedIn optimization',
      'Automated applications',
      'AI interview simulator',
      'Career strategy',
      'Priority job matching',
    ],
    highlighted: false,
    cta: 'Choose Max',
  },
];
