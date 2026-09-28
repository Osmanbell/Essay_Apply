export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  city: string;
  remote: boolean;
  salary: {
    min: number;
    max: number;
    currency: string;
    type: 'hourly' | 'daily' | 'annual';
  };
  description: string;
  skills: string[];
  source: string;
  url: string;
  postedAt: string;
  detectedAt: string;
  matchScore?: number;
  type?: string;
  level?: string;
  isRemote?: boolean;
}

export interface CVProfile {
  fullName: string;
  title: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  address?: string;
  experienceYears: number;
  skills: string[];
  certifications: string[];
  education: string[];
  workExperience: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  industries: string[];
  technologies: string[];
  careerLevel: string;
  careerCategory: string;
  relevantTitles: string[];
  masterCV?: string;
  optimizedCV?: {
    summary: string;
    skills: string[];
  };
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'applied' | 'saved' | 'interviewing' | 'rejected';
  appliedAt: string;
  matchScore: number;
  tailoredResume?: string;
  tailoredCoverLetter?: string;
  jobDetails?: string;
}
