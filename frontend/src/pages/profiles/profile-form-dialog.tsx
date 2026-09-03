import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Search, Sparkles, User2, Mail, Phone, Code2, FileText, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCreateProfile, useUpdateProfile } from '@/hooks/use-profiles';
import { useRecruiters } from '@/hooks/use-recruiters';
import { extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { ClientProfile } from '@/types';

const profileSchema = z.object({
  candidateName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Phone number is too short').regex(/^[+0-9\s()-]+$/, 'Only digits, spaces, +, -, () are allowed'),
  technology: z.string().min(1, 'Technology is required'),
  notes: z.string().optional(),
  assignedRecruiterId: z.string().nullable().optional(),
  assignedRecruiterIds: z.array(z.string().uuid()).min(1, 'Assign at least 1 recruiter').max(5, 'You can assign up to 5 recruiters').optional(),
  assignedResumeAssistId: z.string().nullable().optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  visaStatus: z.string().optional().nullable(),
  entryToUS: z.string().optional().nullable(),
  currentLocation: z.string().optional().nullable(),
  skills: z.string().optional().nullable(),
  experienceDetails: z.string().optional().nullable(),
  certifications: z.string().optional().nullable(),
  planSelected: z.string().optional().nullable(),
  amountPaid: z.preprocess((val) => (val === '' || val === undefined || val === null ? null : Number(val)), z.number().nullable().optional()),
  paymentRef: z.string().optional().nullable(),
  education: z.string().refine((val) => {
    if (!val) return true;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed);
    } catch (_) {
      return false;
    }
  }, 'Must be a valid JSON array of education history').optional().nullable(),
  addressHistory: z.string().refine((val) => {
    if (!val) return true;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed);
    } catch (_) {
      return false;
    }
  }, 'Must be a valid JSON array of address history').optional().nullable(),
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
  const { data: resumeAssistsData } = useRecruiters({ role: 'RESUME_ASSIST', isActive: true, pageSize: 100 });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      candidateName: '',
      email: '',
      phone: '',
      technology: '',
      notes: '',
      assignedRecruiterId: null,
      assignedRecruiterIds: [],
      assignedResumeAssistId: null,
      dateOfBirth: '',
      gender: '',
      visaStatus: '',
      entryToUS: '',
      currentLocation: '',
      skills: '',
      experienceDetails: '',
      certifications: '',
      planSelected: '',
      amountPaid: null,
      paymentRef: '',
      education: '',
      addressHistory: ''
    },
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
              assignedRecruiterId: profile.assignedRecruiter?.isActive !== false && !profile.assignedRecruiter?.deletedAt ? profile.assignedRecruiterId : null,
              assignedRecruiterIds: (profile.assignedRecruiterAssignments?.length
                ? profile.assignedRecruiterAssignments
                : profile.assignedRecruiter ? [profile.assignedRecruiter] : []
              )
                .filter((a: any) => {
                  const r = a.recruiter || a;
                  return r && r.isActive !== false && !r.deletedAt;
                })
                .map((a: any) => a.recruiterId || a.id),
              assignedResumeAssistId: profile.assignedResumeAssistId ?? null,
              dateOfBirth: profile.dateOfBirth ?? '',
              gender: profile.gender ?? '',
              visaStatus: profile.visaStatus ?? '',
              entryToUS: profile.entryToUS ?? '',
              currentLocation: profile.currentLocation ?? '',
              skills: profile.skills ?? '',
              experienceDetails: profile.experienceDetails ?? '',
              certifications: profile.certifications ?? '',
              planSelected: profile.planSelected ?? '',
              amountPaid: profile.amountPaid ?? null,
              paymentRef: profile.paymentRef ?? '',
              education: profile.education ? JSON.stringify(profile.education, null, 2) : '',
              addressHistory: profile.addressHistory ? JSON.stringify(profile.addressHistory, null, 2) : '',
            }
          : {
              candidateName: '',
              email: '',
              phone: '',
              technology: '',
              notes: '',
              assignedRecruiterId: user?.role === 'RECRUITER' ? user.id : null,
              assignedRecruiterIds: user?.role === 'RECRUITER' ? [user.id] : [],
              assignedResumeAssistId: null,
              dateOfBirth: '',
              gender: '',
              visaStatus: '',
              entryToUS: '',
              currentLocation: '',
              skills: '',
              experienceDetails: '',
              certifications: '',
              planSelected: '',
              amountPaid: null,
              paymentRef: '',
              education: '',
              addressHistory: '',
            }
      );
    }
  }, [open, profile]);

  const onSubmit = async (values: ProfileForm) => {
    if (!isEdit && !isManager) {
      toast.error('Only admins and team leaders can create client profiles');
      return;
    }
    try {
      const payload = {
        ...values,
        notes: values.notes || undefined,
        assignedResumeAssistId: values.assignedResumeAssistId === '' ? null : values.assignedResumeAssistId,
        education: values.education ? JSON.parse(values.education) : undefined,
        addressHistory: values.addressHistory ? JSON.parse(values.addressHistory) : undefined,
      };
      if (isEdit && profile) {
        const { assignedRecruiterId, assignedRecruiterIds, ...rest } = payload;
        await updateMutation.mutateAsync({ id: profile.id, ...(isManager ? payload : rest) });
        toast.success('Profile updated successfully • Success');
      } else {
        await createMutation.mutateAsync(payload as any);
        toast.success('Client profile created • Client vault');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const recruiters = useMemo(() => {
    const list = [...(recruitersData?.data ?? [])].filter(
      (r) => r.role === 'RECRUITER' || r.role === 'TEAM_LEADER'
    );
    if (user && user.role === 'TEAM_LEADER') {
      const exists = list.some((r) => r.id === user.id);
      if (!exists) {
        list.unshift({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: true,
        } as any);
      }
    }
    return list;
  }, [recruitersData, user]);

  const [recruiterSearch, setRecruiterSearch] = useState('');

  const filteredRecruiters = recruiters.filter((r) => r.name.toLowerCase().includes(recruiterSearch.toLowerCase()) || r.email.toLowerCase().includes(recruiterSearch.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="h-1 w-full bg-mayzax-gradient shrink-0" />
        <div className="p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md">
                <User2 className="h-4 w-4" />
              </div>
              {isEdit ? 'Edit Client Profile' : 'New Client Profile'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <User2 className="h-3 w-3 text-mayzax-blue-500" /> Candidate Name
                </Label>
                <Input
                  placeholder="e.g. John Doe"
                  disabled={isEdit && user?.role === 'RECRUITER'}
                  className="rounded-xl h-11 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-mayzax-blue-400 focus:ring-4 focus:ring-mayzax-blue-500/10"
                  {...form.register('candidateName')}
                />
                {form.formState.errors.candidateName && <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.candidateName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Mail className="h-3 w-3 text-slate-400" /> Email
                </Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  {...form.register('email')}
                />
                {form.formState.errors.email && <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Phone className="h-3 w-3 text-slate-400" /> Phone
                </Label>
                <Input
                  placeholder="+91 98765 43210"
                  className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  {...form.register('phone')}
                />
                {form.formState.errors.phone && <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.phone.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Code2 className="h-3 w-3 text-slate-400" /> Technology
                </Label>
                <Input
                  placeholder="e.g. Java Full Stack, React, DevOps"
                  className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                  {...form.register('technology')}
                />
                {form.formState.errors.technology && <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.technology.message}</p>}
              </div>

              {isManager && (
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Users className="h-3 w-3 text-mayzax-blue-500" /> Assigned Recruiters
                    </Label>
                    <span className="text-xs font-bold text-mayzax-blue-700 dark:text-mayzax-blue-300 bg-mayzax-blue-50 dark:bg-mayzax-blue-950/30 border border-mayzax-blue-200 dark:border-mayzax-blue-800 rounded-full px-2 py-0.5">{selectedRecruiterIds.length}/5</span>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search recruiter..."
                      className="pl-8 h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      value={recruiterSearch}
                      onChange={(e) => setRecruiterSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 p-2">
                    {filteredRecruiters.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No recruiters found</p>
                    ) : (
                      filteredRecruiters.map((recruiter) => {
                        const checked = selectedRecruiterIds.includes(recruiter.id);
                        const disabled = !checked && selectedRecruiterIds.length >= 5;
                        return (
                          <label
                            key={recruiter.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : checked
                                ? 'bg-mayzax-blue-50 dark:bg-mayzax-blue-950/40 border border-mayzax-blue-200 dark:border-mayzax-blue-800'
                                : 'hover:bg-white dark:hover:bg-slate-750 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-mayzax-blue-600 focus:ring-mayzax-blue-500"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => {
                                const next = e.target.checked ? [...selectedRecruiterIds, recruiter.id] : selectedRecruiterIds.filter((id) => id !== recruiter.id);
                                form.setValue('assignedRecruiterIds', next, { shouldDirty: true, shouldValidate: true });
                                form.setValue('assignedRecruiterId', next[0] ?? null, { shouldDirty: true, shouldValidate: true });
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{recruiter.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{recruiter.email}</p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {form.formState.errors.assignedRecruiterIds && <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.assignedRecruiterIds.message}</p>}
                </div>
              )}

              {isManager && (
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <User2 className="h-3 w-3 text-mayzax-blue-500" /> Assigned Resume Assist
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-mayzax-blue-500/40 transition"
                    {...form.register('assignedResumeAssistId')}
                    defaultValue={profile?.assignedResumeAssistId ?? ''}
                  >
                    <option value="" className="dark:bg-slate-800">Unassigned</option>
                    {resumeAssistsData?.data?.map((u) => (
                      <option key={u.id} value={u.id} className="dark:bg-slate-800">
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isAdmin && (
                <>
                  <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-mayzax-blue-600 dark:text-mayzax-blue-400 uppercase tracking-widest mb-3">Onboarding & Personal Details</h4>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Date of Birth</Label>
                    <Input type="text" placeholder="DD/MM/YYYY" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('dateOfBirth')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Gender</Label>
                    <Input type="text" placeholder="e.g. Male, Female" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('gender')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Visa Status</Label>
                    <Input type="text" placeholder="e.g. H1B, OPT" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('visaStatus')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">US Entry Date</Label>
                    <Input type="text" placeholder="e.g. 08/2026" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('entryToUS')} />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Current Location</Label>
                    <Input type="text" placeholder="e.g. Aubrey, Texas" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('currentLocation')} />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Skills</Label>
                    <Input type="text" placeholder="e.g. React, Node.js, Python" className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800" {...form.register('skills')} />
                  </div>
                </>
              )}

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-slate-700 dark:text-slate-300"><FileText className="h-3 w-3 text-slate-400" /> Notes</Label>
                <Textarea placeholder="Additional context..." rows={3} className="rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:bg-white dark:focus:bg-slate-800" {...form.register('notes')} />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting} className="rounded-full gap-1.5 bg-mayzax-gradient border-0 text-white shadow-md shadow-mayzax-blue-200/30 hover:opacity-90">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-3.5 w-3.5" />
                {isEdit ? 'Save Changes' : 'Create Profile'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

