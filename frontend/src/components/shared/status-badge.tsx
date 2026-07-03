import { Badge } from '@/components/ui/badge';
import { ApplicationStatus } from '@/types';

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted' }> = {
  APPLIED: { label: 'Applied', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'warning' },
  SHORTLISTED: { label: 'Shortlisted', variant: 'secondary' },
  INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', variant: 'warning' },
  INTERVIEWED: { label: 'Interviewed', variant: 'secondary' },
  OFFERED: { label: 'Offered', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'muted' },
  ON_HOLD: { label: 'On Hold', variant: 'muted' },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: 'muted' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export const ALL_STATUSES: ApplicationStatus[] = [
  'APPLIED',
  'IN_REVIEW',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN',
  'ON_HOLD',
];

export const ALL_JOB_PORTALS = [
  'LINKEDIN',
  'INDEED',
  'NAUKRI',
  'DICE',
  'MONSTER',
  'ZIPRECRUITER',
  'GLASSDOOR',
  'COMPANY_WEBSITE',
  'CAREERBUILDER',
  'OTHER',
] as const;

export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
