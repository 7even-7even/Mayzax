import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateProfile, useUpdateProfile } from '@/hooks/use-profiles';
import { useRecruiters } from '@/hooks/use-recruiters';
import { extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { ClientProfile } from '@/types';

const profileSchema = z.object({
  candidateName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .regex(/^[+0-9\s()-]+$/, 'Only digits, spaces, +, -, () are allowed'),
  technology: z.string().min(1, 'Technology is required'),
  notes: z.string().optional(),
  assignedRecruiterId: z.string().nullable().optional(),
  assignedRecruiterIds: z.array(z.string().uuid()).min(1, 'Assign at least 1 recruiter').max(5, 'You can assign up to 5 recruiters').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ClientProfile | null;
}

export function ProfileFormDialog({ open, onOpenChange, profile }: Props) {
  const { user } = useAuth();
  const isEdit = !!profile;
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';

  const createMutation = useCreateProfile();
  const updateMutation = useUpdateProfile();
  const { data: recruitersData } = useRecruiters({ isActive: true, pageSize: 100 });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { candidateName: '', email: '', phone: '', technology: '', notes: '', assignedRecruiterId: null, assignedRecruiterIds: [] },
  });

  const selectedRecruiterIds = form.watch('assignedRecruiterIds') ?? [];

  useEffect(() => {
    if (open) {
      form.reset(
        profile
          ? {
              candidateName: profile.candidateName,
              email: profile.email,
              phone: profile.phone,
              technology: profile.technology,
              notes: profile.notes ?? '',
              assignedRecruiterId: profile.assignedRecruiterId,
              assignedRecruiterIds:
                profile.assignedRecruiterAssignments?.map((assignment) => assignment.recruiterId) ??
                (profile.assignedRecruiterId ? [profile.assignedRecruiterId] : []),
            }
          : {
              candidateName: '',
              email: '',
              phone: '',
              technology: '',
              notes: '',
              assignedRecruiterId: user?.role === 'RECRUITER' ? user.id : null,
              assignedRecruiterIds: user?.role === 'RECRUITER' ? [user.id] : [],
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile]);

  const onSubmit = async (values: ProfileForm) => {
    if (!isEdit && !isManager) {
      toast.error('Only admins and team leaders can create client profiles');
      return;
    }
    try {
      const payload = { ...values, notes: values.notes || undefined };
      if (isEdit && profile) {
        // Recruiters cannot change assignment; strip it if not admin
        const { assignedRecruiterId, assignedRecruiterIds, ...rest } = payload;
        await updateMutation.mutateAsync({ id: profile.id, ...(isManager ? payload : rest) });
        toast.success('Profile updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Client profile created successfully');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const recruiters = recruitersData?.data ?? [];
  const [recruiterSearch, setRecruiterSearch] = useState('');

  const filteredRecruiters = recruiters.filter(
    (r) =>
      r.name.toLowerCase().includes(recruiterSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(recruiterSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client Profile' : 'New Client Profile'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update candidate details.' : 'Add a new candidate profile to the platform.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="candidateName">Candidate Name</Label>
              <Input
                id="candidateName"
                placeholder="e.g. John Doe"
                disabled={isEdit && user?.role === 'RECRUITER'}
                {...form.register('candidateName')}
              />
              {isEdit && user?.role === 'RECRUITER' && (
                <p className="text-[11px] text-slate-400">Candidate name can only be edited by Team Leaders and Admins.</p>
              )}
              {form.formState.errors.candidateName && (
                <p className="text-xs text-red-600">{form.formState.errors.candidateName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+91 98765 43210" {...form.register('phone')} />
              {form.formState.errors.phone && <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="technology">Technology</Label>
              <Input id="technology" placeholder="e.g. Java Full Stack, React, DevOps" {...form.register('technology')} />
              {form.formState.errors.technology && (
                <p className="text-xs text-red-600">{form.formState.errors.technology.message}</p>
              )}
            </div>

            {isManager && (
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assigned Recruiters</Label>
                  <span className="text-xs text-slate-400">{selectedRecruiterIds.length}/5 selected</span>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search recruiter by name or email..."
                    className="pl-8 h-8 text-xs"
                    value={recruiterSearch}
                    onChange={(e) => setRecruiterSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
                  {filteredRecruiters.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">
                      {recruiters.length === 0
                        ? user?.role === 'TEAM_LEADER'
                          ? 'No active recruiters found in your team.'
                          : 'No active recruiters available.'
                        : 'No matching recruiters found.'}
                    </p>
                  ) : (
                    filteredRecruiters.map((recruiter) => {
                      const checked = selectedRecruiterIds.includes(recruiter.id);
                      const disabled = !checked && selectedRecruiterIds.length >= 5;
                      return (
                        <label
                          key={recruiter.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 transition ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-mayzax-blue focus:ring-mayzax-blue"
                            checked={checked}
                            disabled={disabled}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedRecruiterIds, recruiter.id]
                                : selectedRecruiterIds.filter((id) => id !== recruiter.id);
                              form.setValue('assignedRecruiterIds', next, { shouldDirty: true, shouldValidate: true });
                              form.setValue('assignedRecruiterId', next[0] ?? null, { shouldDirty: true, shouldValidate: true });
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900">{recruiter.name}</p>
                            <p className="text-[11px] text-slate-400">{recruiter.email}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                {form.formState.errors.assignedRecruiterIds && (
                  <p className="text-xs text-red-600">{form.formState.errors.assignedRecruiterIds.message}</p>
                )}
              </div>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional context about the candidate..." rows={3} {...form.register('notes')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
