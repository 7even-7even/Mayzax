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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateApplication, useCheckDuplicate } from '@/hooks/use-applications';
import { useProfiles } from '@/hooks/use-profiles';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { ALL_JOB_PORTALS, formatEnumLabel } from '@/components/shared/status-badge';
import { useAuth } from '@/context/auth-context';


function detectJobPortal(url: string): (typeof ALL_JOB_PORTALS)[number] | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

    if (host.includes('linkedin.com')) return 'LINKEDIN';
    if (host.includes('indeed.com')) return 'INDEED';
    if (host.includes('glassdoor.com')) return 'GLASSDOOR';
    if (host.includes('jobright.ai')) return 'JOBRIGHT';
    if (host.includes('simplify.jobs')) return 'SIMPLIFY';
    if (host.includes('simplyhired.com')) return 'SIMPLYHIRED';
    if (host.includes('wellfound.com') || host.includes('angel.co')) return 'WELLFOUND';
    if (host.includes('joinhandshake.com')) return 'HANDSHAKE';
    if (host === 'jobs.lever.co' || host.endsWith('.lever.co')) return 'LEVER';
    if (host.includes('greenhouse.io') || host.includes('greenhouse.com')) return 'GREENHOUSE';
    if (host.includes('careerbuilder.com')) return 'CAREERBUILDER';

  } catch {
    return null;
  }

  return null;
}


const applicationSchema = z.object({
  profileId: z.string().uuid('Please select a profile'),

  jobLink: z.string().url('Enter a valid job posting URL'),

  companyName: z
    .string()
    .trim()
    .max(200, 'Company name must be 200 characters or less'),

  jobTitle: z
    .string()
    .trim()
    .max(200, 'Job title must be 200 characters or less'),

  jobPortal: z.enum(ALL_JOB_PORTALS),
});


type ApplicationForm = z.infer<typeof applicationSchema>;


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProfileId?: string;
}


export function ApplicationFormDialog({
  open,
  onOpenChange,
  defaultProfileId,
}: Props) {

  const { user } = useAuth();

  const createMutation = useCreateApplication();
  const checkDuplicate = useCheckDuplicate();


  const { data: profilesData } = useProfiles({
    pageSize: 100,
    assignedRecruiterId:
      user?.role === 'RECRUITER'
        ? user.id
        : undefined,
  });


  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),

    defaultValues: {
      profileId: defaultProfileId ?? '',
      jobLink: '',
      companyName: '',
      jobTitle: '',
      jobPortal: 'OTHER',
    },
  });


  const jobLink = form.watch('jobLink');
  const profileId = form.watch('profileId');

  const debouncedLink = useDebounce(jobLink, 500);


  const [duplicateResult, setDuplicateResult] =
    useState<{
      isDuplicate: boolean;
      appliedByRecruiter?: {
        name: string;
      } | null;
    } | null>(null);



  useEffect(() => {

    if (open) {

      form.reset({
        profileId: defaultProfileId ?? '',
        jobLink: '',
        companyName: '',
        jobTitle: '',
        jobPortal: 'OTHER',
      });

      setDuplicateResult(null);
    }

  }, [open, defaultProfileId]);



  useEffect(() => {

    setDuplicateResult(null);

    if (!profileId || !debouncedLink)
      return;


    try {
      new URL(debouncedLink);
    }
    catch {
      return;
    }



    const detectedPortal = detectJobPortal(debouncedLink);


    if (detectedPortal) {

      form.setValue(
        'jobPortal',
        detectedPortal,
        {
          shouldDirty: true,
          shouldValidate: true
        }
      );

    }



    checkDuplicate.mutate(
      {
        profileId,
        jobLink: debouncedLink
      },
      {
        onSuccess: (result) => {
          setDuplicateResult(result);
        }
      }
    );


  }, [
    profileId,
    debouncedLink
  ]);




  const onSubmit = async (values: ApplicationForm) => {

    try {

      await createMutation.mutateAsync(values);

      toast.success(
        'Application submitted successfully'
      );

      onOpenChange(false);

    }
    catch (err) {

      toast.error(
        extractErrorMessage(
          err,
          'This profile may have already applied to this job.'
        )
      );

    }

  };



  const profiles = profilesData?.data ?? [];

  const isSubmitting = createMutation.isPending;



  return (

    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >

      <DialogContent className="max-w-lg">


        <DialogHeader>

          <DialogTitle>
            Log Job Application
          </DialogTitle>


          <DialogDescription>
            Select a profile and paste the job link.
            Company name and job title are optional.
          </DialogDescription>


        </DialogHeader>



        <form
          onSubmit={
            form.handleSubmit(onSubmit)
          }
          className="space-y-4"
        >


          <div className="space-y-1.5">

            <Label>
              Candidate Profile
            </Label>


            <Select
              value={
                form.watch('profileId')
              }
              onValueChange={
                value =>
                  form.setValue(
                    'profileId',
                    value
                  )
              }
            >

              <SelectTrigger>

                <SelectValue placeholder="Select a profile" />

              </SelectTrigger>


              <SelectContent>


                {
                  profiles.map((p) => (

                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >

                      {p.candidateName}
                      {' · '}
                      {p.technology}

                    </SelectItem>

                  ))
                }


              </SelectContent>


            </Select>


          </div>




          <div className="space-y-1.5">


            <Label htmlFor="jobLink">
              Job Posting Link
            </Label>


            <Input
              id="jobLink"
              placeholder="https://www.linkedin.com/jobs/view/..."
              {...form.register('jobLink')}
            />



            {
              duplicateResult?.isDuplicate && (

                <p className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">

                  <AlertTriangle className="h-3.5 w-3.5" />

                  This profile has already applied to this job.

                </p>

              )
            }



            {
              duplicateResult &&
              !duplicateResult.isDuplicate && (

                <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-700">

                  <CheckCircle2 className="h-3.5 w-3.5" />

                  No duplicate found.

                </p>

              )
            }



          </div>





          <div className="grid grid-cols-2 gap-4">


            <div>

              <Label>
                Company Name
              </Label>


              <Input
                placeholder="e.g. Google"
                {...form.register('companyName')}
              />


            </div>



            <div>


              <Label>
                Job Title
              </Label>


              <Input
                placeholder="e.g. Backend Engineer"
                {...form.register('jobTitle')}
              />


            </div>


          </div>





          <div className="space-y-1.5">


            <Label>
              Job Portal
            </Label>



            <Select

              value={
                form.watch('jobPortal')
              }

              onValueChange={
                value =>
                  form.setValue(
                    'jobPortal',
                    value as any
                  )
              }

            >


              <SelectTrigger>

                <SelectValue />

              </SelectTrigger>



              <SelectContent>


                {
                  ALL_JOB_PORTALS.map(portal => (

                    <SelectItem
                      key={portal}
                      value={portal}
                    >

                      {formatEnumLabel(portal)}

                    </SelectItem>

                  ))
                }


              </SelectContent>


            </Select>


          </div>





          <DialogFooter>


            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >

              Cancel

            </Button>



            <Button

              type="submit"

              variant="brand"

              disabled={
                isSubmitting ||
                duplicateResult?.isDuplicate
              }

            >

              {
                isSubmitting &&
                <Loader2 className="h-4 w-4 animate-spin" />
              }


              Submit Application


            </Button>


          </DialogFooter>



        </form>



      </DialogContent>


    </Dialog>

  );

}