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
import { useCreateRecruiter, useUpdateRecruiter } from '@/hooks/use-recruiters';
import { extractErrorMessage } from '@/lib/api-client';
import { Recruiter } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a number'),
  role: z.enum(['ADMIN', 'RECRUITER']),
});

const updateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ADMIN', 'RECRUITER']),
});

type CreateForm = z.infer<typeof createSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruiter?: Recruiter | null;
}

export function RecruiterFormDialog({ open, onOpenChange, recruiter }: Props) {
  const isEdit = !!recruiter;
  const createMutation = useCreateRecruiter();
  const updateMutation = useUpdateRecruiter();

  const form = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as any,
    defaultValues: { name: '', email: '', role: 'RECRUITER', ...(isEdit ? {} : { password: '' }) },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        recruiter
          ? { name: recruiter.name, email: recruiter.email, role: recruiter.role }
          : { name: '', email: '', role: 'RECRUITER', password: '' },
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
          <DialogTitle>{isEdit ? 'Edit Recruiter' : 'Create New Recruiter'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update recruiter account details.' : 'Add a new recruiter or admin to the platform.'}
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

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(value) => form.setValue('role', value as 'ADMIN' | 'RECRUITER')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECRUITER">Recruiter</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Recruiter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
