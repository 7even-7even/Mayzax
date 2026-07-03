import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateApplication, useCheckDuplicate } from '@/hooks/use-applications';
import { useProfiles } from '@/hooks/use-profiles';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { ALL_JOB_PORTALS, formatEnumLabel } from '@/components/shared/status-badge';
import { useAuth } from '@/context/auth-context';

const applicationSchema = z.object({
  profileId: z.string().uuid('Please select a profile'),
  jobLink: z.string().url('Enter a valid job posting URL'),
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  jobPortal: z.enum(ALL_JOB_PORTALS),
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

  const { data: profilesData } = useProfiles({
    pageSize: 100,
    assignedRecruiterId: user?.role === 'RECRUITER' ? user.id : undefined,
  });

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      profileId: defaultProfileId ?? '',
      jobLink: '',
      companyName: '',
      jobTitle: '',
      jobPortal: 'LINKEDIN',
    },
  });

  const jobLink = form.watch('jobLink');
  const profileId = form.watch('profileId');
  const debouncedLink = useDebounce(jobLink, 500);
  const [duplicateResult, setDuplicateResult] = useState<{ isDuplicate: boolean } | null>(null);

  useEffect(() => {
    if (open) {
      form.reset({
        profileId: defaultProfileId ?? '',
        jobLink: '',
        companyName: '',
        jobTitle: '',
        jobPortal: 'LINKEDIN',
      });
      setDuplicateResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultProfileId]);

  useEffect(() => {
    setDuplicateResult(null);
    if (!profileId || !debouncedLink) return;
    try {
      new URL(debouncedLink);
    } catch {
      return;
    }
    checkDuplicate.mutate(
      { profileId, jobLink: debouncedLink },
      { onSuccess: (result) => setDuplicateResult(result) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, debouncedLink]);

  const onSubmit = async (values: ApplicationForm) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Application submitted successfully');
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'This profile may have already applied to this job.'));
    }
  };

  const profiles = profilesData?.data ?? [];
  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Job Application</DialogTitle>
          <DialogDescription>Select a profile, paste the job link, and fill in the details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Candidate Profile</Label>
            <Select value={form.watch('profileId')} onValueChange={(value) => form.setValue('profileId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-slate-400">No assigned profiles available</div>
                )}
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.candidateName} · {p.technology}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.profileId && (
              <p className="text-xs text-red-600">{form.formState.errors.profileId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jobLink">Job Posting Link</Label>
            <Input id="jobLink" placeholder="https://www.linkedin.com/jobs/view/..." {...form.register('jobLink')} />
            {form.formState.errors.jobLink && <p className="text-xs text-red-600">{form.formState.errors.jobLink.message}</p>}

            {checkDuplicate.isPending && jobLink && profileId && (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking for duplicates...
              </p>
            )}
            {duplicateResult?.isDuplicate && (
              <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> This profile has already applied to this job.
              </p>
            )}
            {duplicateResult && !duplicateResult.isDuplicate && (
              <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> No duplicate found. You're good to go.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="e.g. Acme Corp" {...form.register('companyName')} />
              {form.formState.errors.companyName && (
                <p className="text-xs text-red-600">{form.formState.errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g. Backend Engineer" {...form.register('jobTitle')} />
              {form.formState.errors.jobTitle && <p className="text-xs text-red-600">{form.formState.errors.jobTitle.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Job Portal</Label>
            <Select value={form.watch('jobPortal')} onValueChange={(value) => form.setValue('jobPortal', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_JOB_PORTALS.map((portal) => (
                  <SelectItem key={portal} value={portal}>
                    {formatEnumLabel(portal)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={isSubmitting || duplicateResult?.isDuplicate}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
