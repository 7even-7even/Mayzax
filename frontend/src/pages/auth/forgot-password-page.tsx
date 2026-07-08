import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Mail, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { ApiSuccess } from '@/types';
import mayzaxLogo from '@/assets/mayzax-logo.png';

const emailSchema = z.object({ email: z.string().email('Enter a valid email address') });
const resetSchema = z
  .object({
    securityAnswer: z.string().min(1, 'Security answer is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const fetchQuestion = async (values: EmailForm) => {
    try {
      const { data } = await apiClient.post<ApiSuccess<{ email: string; securityQuestion: string }>>('/auth/forgot-password/question', values);
      setEmail(data.data.email);
      setSecurityQuestion(data.data.securityQuestion);
      toast.success('Security question loaded');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not load security question'));
    }
  };

  const resetPassword = async (values: ResetForm) => {
    try {
      await apiClient.post('/auth/forgot-password/reset', { email, ...values });
      toast.success('Password reset successfully. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not reset password'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={mayzaxLogo} alt="Mayzax" className="h-14 w-14 rounded-2xl bg-white p-2 shadow ring-1 ring-slate-200" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Forgot Password</h1>
            <p className="mt-1 text-sm text-slate-500">Answer your security question to reset your password.</p>
          </div>
        </div>

        {!securityQuestion ? (
          <form onSubmit={emailForm.handleSubmit(fetchQuestion)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="email" type="email" className="h-12 pl-10" placeholder="you@mayzaxsolutions.com" {...emailForm.register('email')} />
              </div>
              {emailForm.formState.errors.email && <p className="text-xs text-red-600">{emailForm.formState.errors.email.message}</p>}
            </div>
            <Button type="submit" variant="brand" className="h-12 w-full" disabled={emailForm.formState.isSubmitting}>
              {emailForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-5" noValidate>
            <div className="rounded-xl border border-mayzax-blue/20 bg-mayzax-blue/5 p-3">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mayzax-blue">
                <ShieldQuestion className="h-4 w-4" /> Security Question
              </p>
              <p className="text-sm font-medium text-slate-800">{securityQuestion}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityAnswer">Answer</Label>
              <Input id="securityAnswer" type="password" {...resetForm.register('securityAnswer')} />
              {resetForm.formState.errors.securityAnswer && <p className="text-xs text-red-600">{resetForm.formState.errors.securityAnswer.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...resetForm.register('newPassword')} />
              {resetForm.formState.errors.newPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" {...resetForm.register('confirmPassword')} />
              {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" variant="brand" className="h-12 w-full" disabled={resetForm.formState.isSubmitting}>
              {resetForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setSecurityQuestion('')}>
              Use another email
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link to="/login" className="font-medium text-mayzax-blue hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
