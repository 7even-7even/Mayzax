import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Sparkles, User2, Mail, Shield, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateRecruiter, useUpdateRecruiter, useRecruiters } from '@/hooks/use-recruiters';
import { extractErrorMessage } from '@/lib/api-client';
import { Recruiter } from '@/types';
import { useAuth } from '@/context/auth-context';

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[a-z]/, 'Needs lowercase').regex(/[0-9]/, 'Needs number'),
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
  const { data: teamLeadersResponse } = useRecruiters({ role: 'TEAM_LEADER', pageSize: 100 });
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
          : { name: '', email: '', role: 'RECRUITER', password: '', createdById: null }
      );
    }
  }, [open, recruiter]);

  const onSubmit = async (values: CreateForm | UpdateForm) => {
    try {
      if (isEdit && recruiter) {
        await updateMutation.mutateAsync({ id: recruiter.id, ...values });
        toast.success('Recruiter updated');
      } else {
        await createMutation.mutateAsync(values as CreateForm);
        toast.success('Recruiter created');
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
      <DialogContent className="rounded-2xl border-slate-200/60 p-0 overflow-hidden shadow-2xl max-w-lg">
        <div className="h-1 w-full bg-mayzax-gradient" />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md">
                <User2 className="h-4 w-4" />
              </div>
              {user?.role === 'ADMIN' ? (isEdit ? 'Edit User' : 'Create New User') : isEdit ? 'Edit Recruiter' : 'Create New Recruiter'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {user?.role === 'ADMIN' ? (isEdit ? 'Update user details' : 'Add admin, TL, or recruiter') : isEdit ? 'Update recruiter' : 'Add recruiter'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User2 className="h-3 w-3 text-mayzax-blue-500" /> Full Name
              </Label>
              <Input placeholder="e.g. Riya Sharma" className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 dark:text-black" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-400" /> Email Address
              </Label>
              <Input type="email" placeholder="riya@mayzaxsolutions.com" className="rounded-xl h-11 bg-white border-slate-200 dark:text-black" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Temporary Password</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="rounded-xl h-11 pr-10 bg-white border-slate-200" {...form.register('password' as any)} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(form.formState.errors as any).password && <p className="text-xs text-red-600">{(form.formState.errors as any).password.message}</p>}
              </div>
            )}

            {user?.role === 'ADMIN' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-400" /> Role
                </Label>
                <Select value={form.watch('role')} onValueChange={(value) => { form.setValue('role', value as any); if (value !== 'RECRUITER') form.setValue('createdById', null); }}>
                  <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200 dark:text-black">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="RECRUITER">Recruiter</SelectItem>
                    <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {user?.role === 'ADMIN' && form.watch('role') === 'RECRUITER' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" /> Assign Team Leader (Optional)
                </Label>
                <Select value={form.watch('createdById') || '__none__'} onValueChange={(value) => form.setValue('createdById', value === '__none__' ? null : value)}>
                  <SelectTrigger className="rounded-xl h-11 bg-white border-slate-200 dark:text-black">
                    <SelectValue placeholder="Select Team Leader" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={isSubmitting} className="rounded-full gap-1.5 bg-mayzax-gradient border-0 text-white shadow-md hover:opacity-90">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-3.5 w-3.5" />
                {isEdit ? 'Save Changes' : user?.role === 'ADMIN' ? 'Create User' : 'Create Recruiter'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
