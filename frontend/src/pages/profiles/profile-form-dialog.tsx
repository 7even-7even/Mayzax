import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
});

type ProfileForm = z.infer<typeof profileSchema>;

const UNASSIGNED = '__unassigned__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: ClientProfile | null;
}

export function ProfileFormDialog({ open, onOpenChange, profile }: Props) {
  const { user } = useAuth();
  const isEdit = !!profile;
  const isAdmin = user?.role === 'ADMIN';

  const createMutation = useCreateProfile();
  const updateMutation = useUpdateProfile();
  const { data: recruitersData } = useRecruiters({ isActive: true, pageSize: 100 });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { candidateName: '', email: '', phone: '', technology: '', notes: '', assignedRecruiterId: null },
  });

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
            }
          : { candidateName: '', email: '', phone: '', technology: '', notes: '', assignedRecruiterId: user?.role === 'RECRUITER' ? user.id : null },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile]);

  const onSubmit = async (values: ProfileForm) => {
    try {
      const payload = { ...values, notes: values.notes || undefined };
      if (isEdit && profile) {
        // Recruiters cannot change assignment; strip it if not admin
        const { assignedRecruiterId, ...rest } = payload;
        await updateMutation.mutateAsync({ id: profile.id, ...(isAdmin ? payload : rest) });
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
              <Input id="candidateName" placeholder="e.g. John Doe" {...form.register('candidateName')} />
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

            {isAdmin && (
              <div className="col-span-2 space-y-1.5">
                <Label>Assigned Recruiter</Label>
                <Select
                  value={form.watch('assignedRecruiterId') ?? UNASSIGNED}
                  onValueChange={(value) => form.setValue('assignedRecruiterId', value === UNASSIGNED ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {recruiters.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
