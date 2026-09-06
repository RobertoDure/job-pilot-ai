// Core domain types for JobPilot AI.

export type RemotePref = 'remote' | 'hybrid' | 'onsite' | 'any';
export type Seniority = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'staff' | 'principal' | 'unknown';

export interface SkillEntry {
  name: string;
  years: number;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface ExperienceEntry {
  title: string;
  company: string;
  start: string;
  end: string;
  description: string;
  highlights: string[];
}

export interface EducationEntry {
  degree: string;
  field: string;
  school: string;
  year: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email?: string;
  headline?: string;
  summary?: string;
  skills: SkillEntry[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: string[];
  salaryExpectation: { min: number; max: number; currency: string };
  location: { city: string; country: string };
  remotePreference: RemotePref;
  workAuthorization: string[];
  industries: string[];
  preferredRoles: string[];
  careerGoals: string[];
  totalYears: number;
  seniority: Seniority;
  rawCvText: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: { city: string; country: string };
  remote: RemotePref;
  salary: { min: number; max: number; currency: string };
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  seniority: Seniority;
  industry: string;
  source: string;
  postedAt: string;
  url?: string;
}

export type MatchCategoryKey =
  | 'skills'
  | 'experience'
  | 'location'
  | 'salary'
  | 'education'
  | 'seniority'
  | 'authorization';

export interface CategoryScore {
  key: MatchCategoryKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export type Recommendation = 'APPLY' | 'CONSIDER' | 'SKIP';

export interface MatchResult {
  job: Job;
  overallScore: number;
  categories: CategoryScore[];
  matchedSkills: string[];
  missingSkills: string[];
  matchedRequirements: number;
  totalRequirements: number;
  recommendation: Recommendation;
  recommendationReason: string;
  whyYouMatch: string[];
  applicationProbability: {
    interview: number;
    skills: number;
    experience: number;
    education: number;
    location: number;
    competition: number;
  };
}

export type ApplicationStatus =
  | 'recommended'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'no_response';

export interface Application {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  matchScore: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface TailoredCv {
  title: string;
  summary: string;
  skills: string[];
  experience: { title: string; company: string; period: string; bullets: string[] }[];
}

export interface TailoredApplication {
  job: Job;
  tailoredCv: TailoredCv;
  coverLetter: string;
  standardAnswers: { question: string; answer: string }[];
  needsHumanReview: boolean;
  reviewNotes: string[];
}

export interface CareerProfileSummary {
  targetRoles: string[];
  bestIndustries: { name: string; score: number }[];
  recommendedSalary: { min: number; max: number; currency: string };
  bestLocations: string[];
  topSkills: string[];
  seniority: Seniority;
}

export interface CareerInsight {
  responseRate: number;
  applicationsCount: number;
  byRole: { role: string; responseRate: number; applications: number }[];
  byIndustry: { industry: string; responseRate: number; applications: number }[];
  skillGapSuggestions: { skill: string; currentAvgMatch: number; projectedAvgMatch: number; gain: number }[];
  strongestMarket: string;
  marketSizeEstimate: number;
  salaryRange: { min: number; max: number; currency: string };
  recommendations: string[];
}

export interface InterviewQuestion {
  category: 'technical' | 'behavioral' | 'situational' | 'role';
  question: string;
  whyAsked: string;
  tip: string;
}

export interface InterviewPrep {
  job: Job;
  questions: InterviewQuestion[];
  preparationNotes: string[];
}
