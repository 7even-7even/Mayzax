import { Badge } from '@/components/ui/badge';
import { ApplicationStatus, JobPortal } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<ApplicationStatus, { label: string; variant: any; gradient: string; dot: string }> = {
  APPLIED: { label: 'Applied', variant: 'secondary', gradient: 'from-slate-500 to-slate-700', dot: 'bg-slate-500' },
  IN_REVIEW: { label: 'In Review', variant: 'warning', gradient: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
  SHORTLISTED: { label: 'Shortlisted', variant: 'default', gradient: 'from-blue-500 to-cyan-600', dot: 'bg-blue-500' },
  INTERVIEW_SCHEDULED: { label: 'Interview', variant: 'default', gradient: 'from-violet-500 to-indigo-600', dot: 'bg-violet-500' },
  INTERVIEWED: { label: 'Interviewed', variant: 'secondary', gradient: 'from-indigo-500 to-purple-600', dot: 'bg-indigo-500' },
  OFFERED: { label: 'Offered', variant: 'success', gradient: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', variant: 'destructive', gradient: 'from-red-500 to-rose-600', dot: 'bg-red-500' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'muted', gradient: 'from-slate-400 to-slate-600', dot: 'bg-slate-400' },
  ON_HOLD: { label: 'On Hold', variant: 'muted', gradient: 'from-amber-400 to-yellow-600', dot: 'bg-amber-400' },
};

export function StatusBadge({ status, size = 'default' }: { status: ApplicationStatus; size?: 'sm' | 'default' }) {
  const config = statusConfig[status] ?? { label: status, variant: 'muted' as const, gradient: 'from-slate-400 to-slate-600', dot: 'bg-slate-400' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold shadow-sm transition-all hover:shadow-md',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs',
        'bg-white border-slate-200 text-slate-700'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', config.dot)} />
      {config.label}
    </span>
  );
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
  'GLASSDOOR',
  'JOBRIGHT',
  'SIMPLIFY',
  'SIMPLYHIRED',
  'WELLFOUND',
  'HANDSHAKE',
  'NAUKRI',
  'DICE',
  'MONSTER',
  'ZIPRECRUITER',
  'COMPANY_WEBSITE',
  'CAREERBUILDER',
  'LEVER',
  'GREENHOUSE',
  'SPEEDY_APPLY',
  'EASY_APPLY',
  'THE_MUSE',
  'Y_COMBINATOR',
  'CAREER_SITE',
  'ASHBY',
  'OTHER',
] as const satisfies readonly JobPortal[];

const enumLabels: Partial<Record<string, string>> = {
  LINKEDIN: 'LinkedIn',
  INDEED: 'Indeed',
  GLASSDOOR: 'Glassdoor',
  JOBRIGHT: 'Jobright',
  SIMPLIFY: 'Simplify',
  SIMPLYHIRED: 'SimplyHired',
  WELLFOUND: 'Wellfound',
  HANDSHAKE: 'Handshake',
  ZIPRECRUITER: 'ZipRecruiter',
  COMPANY_WEBSITE: 'Company Website',
  CAREERBUILDER: 'CareerBuilder',
  LEVER: 'Lever',
  GREENHOUSE: 'Greenhouse',
  SPEEDY_APPLY: 'Speedy Apply',
  EASY_APPLY: 'Easy Apply',
  THE_MUSE: 'The Muse',
  Y_COMBINATOR: 'Y Combinator',
  CAREER_SITE: 'Career Site',
  ASHBY: 'Ashby',
};

export function formatEnumLabel(value: string): string {
  return enumLabels[value] ?? value.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

export function JobPortalBadge({ portal }: { portal: JobPortal }) {
  const colors: Record<string, string> = {
    LINKEDIN: 'bg-[#0A66C2] text-white border-0',
    INDEED: 'bg-[#2164A6] text-white border-0',
    GLASSDOOR: 'bg-[#17A2B8] text-white border-0',
    ASHBY: 'bg-[#FF5A5F] text-white border-0',
    EASY_APPLY: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0',
    OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return <Badge className={cn('rounded-full text-[11px] font-semibold shadow-sm', colors[portal] ?? colors.OTHER)}>{formatEnumLabel(portal)}</Badge>;
}
