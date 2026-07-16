import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
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
import { useCreateRecruiter, useUpdateRecruiter, useRecruiters } from '@/hooks/use-recruiters';
import { extractErrorMessage } from '@/lib/api-client';
import { Recruiter } from '@/types';
import { useAuth } from '@/context/auth-context';

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a number'),
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER']),
  createdById: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ADMIN', 'TEAM_LEADER', 'RECRUITER']),
  createdById: z.string().uuid().nullable().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruiter?: Recruiter | null;
}

export function RecruiterFormDialog({ open, onOpenChange, recruiter }: Props) {
  const { user } = useAuth();
  const isEdit = !!recruiter;
  const createMutation = useCreateRecruiter();
  const updateMutation = useUpdateRecruiter();

  // Fetch team leaders for optional assignment
  const { data: teamLeadersResponse } = useRecruiters({
    role: 'TEAM_LEADER',
    pageSize: 100,
  });
  const teamLeaders = teamLeadersResponse?.data ?? [];

  const form = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as any,
    defaultValues: { name: '', email: '', role: 'RECRUITER', createdById: null, ...(isEdit ? {} : { password: '' }) },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        recruiter
          ? { name: recruiter.name, email: recruiter.email, role: recruiter.role, createdById: (recruiter as any).createdById ?? null }
          : { name: '', email: '', role: 'RECRUITER', password: '', createdById: null },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recruiter]);

  const onSubmit = async (values: CreateForm | UpdateForm) => {
    try {
      if (isEdit && recruiter) {
        await updateMutation.mutateAsync({ id: recruiter.id, ...values });
        toast.success('Recruiter updated successfully');
      } else {
        await createMutation.mutateAsync(values as CreateForm);
        toast.success('Recruiter created successfully');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {user?.role === 'ADMIN'
              ? isEdit
                ? 'Edit User'
                : 'Create New User'
              : isEdit
              ? 'Edit Recruiter'
              : 'Create New Recruiter'}
          </DialogTitle>
          <DialogDescription>
            {user?.role === 'ADMIN'
              ? isEdit
                ? 'Update user account details.'
                : 'Add a new admin, team leader, or recruiter to the platform.'
              : isEdit
              ? 'Update recruiter account details.'
              : 'Add a new recruiter to the platform.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="e.g. Riya Sharma" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="riya@mayzaxsolutions.com" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-9"
                  {...form.register('password' as any)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {(form.formState.errors as any).password && (
                <p className="text-xs text-red-600">{(form.formState.errors as any).password.message}</p>
              )}
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(value) => {
                  form.setValue('role', value as 'ADMIN' | 'TEAM_LEADER' | 'RECRUITER');
                  if (value !== 'RECRUITER') {
                    form.setValue('createdById', null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECRUITER">Recruiter</SelectItem>
                  <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {user?.role === 'ADMIN' && form.watch('role') === 'RECRUITER' && (
            <div className="space-y-1.5">
              <Label>Assign Team Leader (Optional)</Label>
              <Select
                value={form.watch('createdById') || '__none__'}
                onValueChange={(value) => {
                  form.setValue('createdById', value === '__none__' ? null : value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Team Leader (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (No Team Leader)</SelectItem>
                  {teamLeaders.map((tl) => (
                    <SelectItem key={tl.id} value={tl.id}>
                      {tl.name} ({tl.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit
                ? 'Save Changes'
                : user?.role === 'ADMIN'
                ? 'Create User'
                : 'Create Recruiter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
