export type Role = 'ADMIN' | 'RECRUITER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive?: boolean;
  lastActiveAt?: string | null;
  createdAt?: string;
  securityQuestion?: string | null;
  hasSecurityQuestion?: boolean;
}

export interface Recruiter extends User {
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface RecruiterStats {
  recruiter: Recruiter;
  assignedProfilesCount: number;
  totalApplications: number;
  currentShiftApplications: number;
  currentBusinessDate: string;
  profileWiseCounts: Array<{
    profileId: string;
    candidateName: string;
    technology: string | null;
    applicationCount: number;
  }>;
  lastActiveAt: string | null;
}

export interface ClientProfile {
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  technology: string;
  notes: string | null;
  assignedRecruiterId: string | null;
  assignedRecruiter?: { id: string; name: string; email: string } | null;
  assignedRecruiterAssignments?: Array<{
    recruiterId: string;
    recruiter: { id: string; name: string; email: string };
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'APPLIED'
  | 'IN_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'OFFERED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD';

export type JobPortal =
  | 'LINKEDIN'
  | 'INDEED'
  | 'GLASSDOOR'
  | 'JOBRIGHT'
  | 'SIMPLIFY'
  | 'SIMPLYHIRED'
  | 'WELLFOUND'
  | 'HANDSHAKE'
  | 'NAUKRI'
  | 'DICE'
  | 'MONSTER'
  | 'ZIPRECRUITER'
  | 'COMPANY_WEBSITE'
  | 'CAREERBUILDER'
  | 'LEVER'
  | 'GREENHOUSE'
  | 'SPEEDY_APPLY'
  | 'THE_MUSE'
  | 'Y_COMBINATOR'
  | 'CAREER_SITE'
  | 'OTHER';

export interface JobApplication {
  id: string;
  profileId: string;
  recruiterId: string;
  jobLink: string;
  normalizedJobLink: string;
  companyName: string;
  jobTitle: string;
  jobPortal: JobPortal;
  status: ApplicationStatus;
  appliedAt: string;
  businessDate: string;
  createdAt: string;
  updatedAt: string;
  profile?: { id: string; candidateName: string; technology: string };
  recruiter?: { id: string; name: string; email: string };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: Pagination;
  currentBusinessDate?: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface DashboardRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  assignedProfiles: number;
  totalApplications: number;
  currentShiftApplications: number;
  lastActiveAt: string | null;
}

export interface RecruiterBreakdown {
  profileWiseCounts: Array<{
    profileId: string;
    candidateName: string;
    technology: string | null;
    applicationCount: number;
    currentShiftApplicationCount: number;
  }>;
  recentApplications: JobApplication[];
  currentBusinessDate: string;
}

export interface JobPortalAnalytics {
  totalApplications: number;
  currentBusinessDate?: string;
  filter?: { scope: 'all' | 'currentShift' | 'custom'; from: string | null; to: string | null };
  portals: Array<{
    portal: JobPortal;
    count: number;
  }>;
}

export interface GlobalSummary {
  totalRecruiters: number;
  activeRecruiters: number;
  totalProfiles: number;
  totalApplications: number;
  currentShiftApplications: number;
  currentBusinessDate: string;
}

export interface DailyCount {
  businessDate: string;
  count: number;
}
