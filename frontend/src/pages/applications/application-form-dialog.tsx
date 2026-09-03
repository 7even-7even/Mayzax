import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, ShieldCheck, Building2, Briefcase, Link2, User2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateApplication, useCheckDuplicate, useApplications } from '@/hooks/use-applications';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { useCurrentStatus, useChangeStatus } from '@/hooks/use-activity';
import { useProfiles } from '@/hooks/use-profiles';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { ALL_JOB_PORTALS, formatEnumLabel } from '@/components/shared/status-badge';
import { useAuth } from '@/context/auth-context';
import { useExtensionVerification } from '@/hooks/use-extension-verification';
import { ExtensionVerificationBadge } from '@/components/shared/extension-verification-badge';

function detectJobPortal(url: string): (typeof ALL_JOB_PORTALS)[number] | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (host.includes('linkedin.com')) return 'LINKEDIN';
    if (host.includes('indeed.')) return 'INDEED';
    if (host.includes('glassdoor.')) return 'GLASSDOOR';
    if (host.includes('jobright.ai') || host.includes('jobright.com')) return 'JOBRIGHT';
    if (host.includes('simplify.jobs')) return 'SIMPLIFY';
    if (host.includes('simplyhired.com')) return 'SIMPLYHIRED';
    if (host.includes('wellfound.com') || host.includes('angel.co')) return 'WELLFOUND';
    if (host.includes('joinhandshake.com')) return 'HANDSHAKE';
    if (host.includes('careerbuilder.com')) return 'CAREERBUILDER';
    if (host.endsWith('.lever.co') || host === 'jobs.lever.co') return 'LEVER';
    if (host.includes('greenhouse.io')) return 'GREENHOUSE';
    if (host.includes('speedyapply.com')) return 'SPEEDY_APPLY';
    if (host.includes('themuse.com')) return 'THE_MUSE';
    if (host.includes('ycombinator.com') || host.includes('workatastartup.com')) return 'Y_COMBINATOR';
    if (host.includes('ashbyhq.com')) return 'ASHBY';
    if (host.includes('careers.') || host.startsWith('jobs.')) return 'CAREER_SITE';
    return 'OTHER';
  } catch {
    return null;
  }
}

const applicationSchema = z.object({
  profileId: z.string().uuid('Please select a profile'),
  jobLink: z.string().url('Enter a valid job posting URL'),
  companyName: z.string().trim().max(200, 'Company name must be 200 characters or less'),
  jobTitle: z.string().trim().max(200, 'Job title must be 200 characters or less'),
  jobPortal: z.enum(ALL_JOB_PORTALS),
  verified: z.boolean().default(false),
  verificationMethod: z.string().nullable().optional(),
  verificationHash: z.string().regex(/^[a-f0-9]{64}$/i).optional().nullable(),
  verificationScore: z.number().int().min(0).max(100).optional().nullable(),
  verificationConfidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  applicationReference: z.string().max(100).optional().nullable(),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProfileId?: string;
}

export function ApplicationFormDialog({ open, onOpenChange, defaultProfileId }: Props) {
  const { user } = useAuth();
  const createMutation = useCreateApplication();
  const checkDuplicate = useCheckDuplicate();

  const { data: profilesData } = useProfiles({ pageSize: 100, assignedRecruiterId: user?.role === 'RECRUITER' ? user.id : undefined });
  const [showStatusWarning, setShowStatusWarning] = useState(false);
  const { data: currentStatusData } = useCurrentStatus();
  const changeStatusMutation = useChangeStatus();
  const currentStatus = currentStatusData?.status ?? 'OFFLINE';

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { profileId: defaultProfileId ?? '', jobLink: '', companyName: '', jobTitle: '', jobPortal: 'OTHER', verified: false, verificationMethod: null, verificationHash: null, verificationScore: null, verificationConfidence: null, applicationReference: null },
  });

  const jobLink = form.watch('jobLink');
  const profileId = form.watch('profileId');
  const debouncedLink = useDebounce(jobLink, 500);

  const { data: summary } = useGlobalSummary();
  const currentBusinessDate = summary?.currentBusinessDate;

  // All time count of applications submitted by this recruiter for the selected client profile
  const { data: allTimeAppsData } = useApplications({
    profileId: profileId || undefined,
    recruiterId: user?.role === 'RECRUITER' ? user.id : undefined,
    pageSize: 1,
  });

  // Current shift count of applications submitted by this recruiter for the selected client profile
  const { data: shiftAppsData } = useApplications({
    profileId: profileId || undefined,
    recruiterId: user?.role === 'RECRUITER' ? user.id : undefined,
    businessDateFrom: currentBusinessDate,
    businessDateTo: currentBusinessDate,
    pageSize: 1,
  });

  // Enterprise verification hook v2
  const { isVerified, isChecking, verificationResult, state: verificationState, isExtensionInstalled, installUrl, extensionId, retry: retryVerification, verificationHash, evidence } = useExtensionVerification(debouncedLink);

  const [duplicateResult, setDuplicateResult] = useState<{ isDuplicate: boolean; appliedByRecruiter?: { name: string } | null } | null>(null);

  useEffect(() => {
    if (open) {
      form.reset({
        profileId: defaultProfileId ?? '',
        jobLink: '',
        companyName: '',
        jobTitle: '',
        jobPortal: 'OTHER',
        verified: false,
        verificationMethod: null,
        verificationHash: null,
        verificationScore: null,
        verificationConfidence: null,
        applicationReference: null,
      });
      setDuplicateResult(null);
    }
  }, [open, defaultProfileId]);

  useEffect(() => {
    setDuplicateResult(null);
    if (!profileId || !debouncedLink) return;
    try { new URL(debouncedLink); } catch { return; }
    const detectedPortal = detectJobPortal(debouncedLink);
    if (detectedPortal) form.setValue('jobPortal', detectedPortal, { shouldDirty: true, shouldValidate: true });
    checkDuplicate.mutate({ profileId, jobLink: debouncedLink }, { onSuccess: (result) => setDuplicateResult(result) });
  }, [profileId, debouncedLink]);

  // Extension verification handler (commented out until deployed)

  useEffect(() => {
    if (verificationResult) {
      form.setValue('verified', isVerified);
      form.setValue('verificationMethod', `Extension v2 (${verificationResult.portal}) - Score ${verificationResult.score}%`);
      form.setValue('verificationHash', verificationHash || verificationResult.verificationHash || null);
      form.setValue('verificationScore', verificationResult.score || null);
      form.setValue('verificationConfidence', null);
      form.setValue('applicationReference', verificationResult.applicationReference || verificationResult.evidence?.applicationReference || null);
      if (verificationResult.company) form.setValue('companyName', verificationResult.company, { shouldDirty: true });
      if (verificationResult.jobTitle) form.setValue('jobTitle', verificationResult.jobTitle, { shouldDirty: true });
      // Even if company/jobTitle empty, try to extract from evidence hostname
      if (!verificationResult.company && verificationResult.evidence?.hostname) {
        const hostPart = verificationResult.evidence.hostname.split('.')[0];
        if (hostPart && !['job-boards', 'boards', 'jobs'].includes(hostPart)) {
          form.setValue('companyName', hostPart.charAt(0).toUpperCase() + hostPart.slice(1), { shouldDirty: true });
        } else if (verificationResult.evidence.pathname) {
          const pathParts = verificationResult.evidence.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            const maybeCompany = pathParts[0];
            if (maybeCompany.length > 2 && maybeCompany.length < 30) {
              form.setValue('companyName', maybeCompany.charAt(0).toUpperCase() + maybeCompany.slice(1), { shouldDirty: true });
            }
          }
        }
      }
    } else {
      form.setValue('verified', false);
      form.setValue('verificationMethod', null);
      form.setValue('verificationHash', null);
      form.setValue('verificationScore', null);
      form.setValue('verificationConfidence', null);
      form.setValue('applicationReference', null);
    }
  }, [isVerified, verificationResult, verificationHash, form]);


  const onSubmit = async (values: ApplicationForm) => {
    // Block submission if recruiter is not ACTIVE
    if (user?.role === 'RECRUITER' && currentStatus !== 'ACTIVE') {
      setShowStatusWarning(true);
      return;
    }
    try {
      await createMutation.mutateAsync(values);
      toast.success(`Application submitted • ${values.verified ? `Verified v2 ${values.verificationScore}%` : 'Legacy mode'} • HMAC secured`);
      form.reset({
        profileId: profiles.length === 1 ? profiles[0].id : (defaultProfileId ?? ''),
        jobLink: '',
        companyName: '',
        jobTitle: '',
        jobPortal: 'OTHER',
        verified: false,
        verificationMethod: null,
        verificationHash: null,
        verificationScore: null,
        verificationConfidence: null,
        applicationReference: null,
      });
      setDuplicateResult(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'This profile may have already applied to this job.'));
    }
  };

  const profiles = profilesData?.data ?? [];
  const isSubmitting = createMutation.isPending;

  useEffect(() => {
    if (!open) return;
    if (defaultProfileId) return;
    if (form.getValues('profileId')) return;
    if (profiles.length === 1) form.setValue('profileId', profiles[0].id, { shouldDirty: false, shouldValidate: true });
  }, [open, profiles, defaultProfileId, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-mayzax-gradient shrink-0" />
        <div className="p-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md">
                <Briefcase className="h-4 w-4" />
              </div>
              Log Job Application
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Verified tracking • Real-time duplicate & ATS detection
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <User2 className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Candidate Profile
                </Label>
                {profileId && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Links Count Today: <span className="text-mayzax-blue-600 dark:text-mayzax-blue-400 font-bold">{shiftAppsData?.pagination?.rawTotal ?? shiftAppsData?.pagination?.total ?? 0} today</span> · <span className="text-indigo-600 dark:text-indigo-400 font-bold">{allTimeAppsData?.pagination?.rawTotal ?? allTimeAppsData?.pagination?.total ?? 0} total</span>
                  </span>
                )}
              </div>
              <Select value={form.watch('profileId')} onValueChange={(value) => form.setValue('profileId', value)}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-500/10">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm focus:bg-slate-100 dark:focus:bg-slate-750">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{p.candidateName}</span> <span className="text-slate-400 dark:text-slate-400">· {p.technology}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobLink" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Link2 className="h-3.5 w-3.5 text-mayzax-blue-500" />
                Job Posting Link
              </Label>
              <Input
                id="jobLink"
                placeholder="https://www.linkedin.com/jobs/view/..."
                className="rounded-xl h-11 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-mayzax-blue-400 focus:ring-4 focus:ring-mayzax-blue-500/10"
                {...form.register('jobLink')}
              />
              {debouncedLink && (
                <div className="mt-3 space-y-2">
                  <ExtensionVerificationBadge isVerified={isVerified} isChecking={isChecking} result={verificationResult} state={verificationState} isExtensionInstalled={isExtensionInstalled} installUrl={installUrl} extensionId={extensionId} onRetry={retryVerification} />
                  <div className="flex flex-wrap gap-2">
                    {duplicateResult?.isDuplicate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Duplicate • Already applied
                      </span>
                    ) : duplicateResult && !duplicateResult.isDuplicate ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Unique • Safe to submit
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Building2 className="h-3 w-3 text-slate-400" /> Company
                </Label>
                <Input
                  placeholder="e.g. Google"
                  className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  {...form.register('companyName')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Briefcase className="h-3 w-3 text-slate-400" /> Job Title
                </Label>
                <Input
                  placeholder="e.g. Backend Engineer"
                  className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  {...form.register('jobTitle')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Job Portal</Label>
              <Select value={form.watch('jobPortal')} onValueChange={(value) => form.setValue('jobPortal', value as any)}>
                <SelectTrigger className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 max-h-60">
                  {ALL_JOB_PORTALS.map((portal) => (
                    <SelectItem key={portal} value={portal} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-750">
                      {formatEnumLabel(portal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-mayzax-blue-50/80 to-mayzax-green-50/40 dark:from-mayzax-blue-950/20 dark:to-mayzax-green-950/10 border border-mayzax-blue-100/80 dark:border-mayzax-blue-900/40 p-3 flex gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mayzax-gradient text-white shrink-0 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                <span className="font-semibold text-mayzax-blue-700 dark:text-mayzax-blue-400">Updated Verification:</span> Extension auto-detects success page • Prevents duplicate for same profile
              </p>
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/70">
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting || duplicateResult?.isDuplicate} className="rounded-full gap-1.5 shadow-md shadow-mayzax-blue-200/30 bg-mayzax-gradient border-0 text-white hover:opacity-90">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-3.5 w-3.5" />
                Submit Application
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>

      <Dialog open={showStatusWarning} onOpenChange={setShowStatusWarning}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-4 animate-bounce">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Please Turn Status Active</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              You are currently on break or offline. You must change your activity status to <strong className="text-slate-700 dark:text-slate-200">Working (Active)</strong> to submit job applications.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 w-full flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStatusWarning(false)}
              className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                try {
                  await changeStatusMutation.mutateAsync({ status: 'ACTIVE' });
                  setShowStatusWarning(false);
                  toast.success("Status changed to Active! You can now submit.");
                } catch (err) {
                  toast.error("Failed to change status. Please set it active manually in the header.");
                }
              }}
              className="rounded-full bg-mayzax-gradient text-white border-0 hover:opacity-90"
            >
              Turn Status Active
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
