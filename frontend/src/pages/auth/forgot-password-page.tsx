import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Mail, ShieldQuestion, Lock, ArrowLeft, Sparkles, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { ApiSuccess } from '@/types';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { motion } from 'framer-motion';

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
      toast.success('Security question loaded • Premium recovery');
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04070f] px-4 py-8">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/20 blur-[80px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-blue-600/20 to-teal-600/20 blur-[80px]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-[420px]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />

          <div className="bg-white rounded-[23px] p-8">
            <div className="mb-8 flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <KeyRound className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-[22px] font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
                  Forgot Password
                  <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">SECURE</span>
                </h1>
                <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-[300px]">Answer your security question to reset password • Premium recovery flow</p>
              </div>
            </div>

            {!securityQuestion ? (
              <form onSubmit={emailForm.handleSubmit(fetchQuestion)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-slate-700">Email Address</Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input type="email" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 text-[14px]" placeholder="you@mayzaxsolutions.com" {...emailForm.register('email')} />
                  </div>
                  {emailForm.formState.errors.email && <p className="text-xs text-red-600">{emailForm.formState.errors.email.message}</p>}
                </div>

                <Button type="submit" className="w-full h-[46px] rounded-xl bg-slate-900 hover:bg-black text-white font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.12)] group relative overflow-hidden" disabled={emailForm.formState.isSubmitting}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    {emailForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading question...
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>

                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-3 flex gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-violet-800">
                    <span className="font-semibold">Premium security:</span> We’ll show your security question only if account exists. No email enumeration.
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-5" noValidate>
                <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50/50 p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                    <ShieldQuestion className="h-3.5 w-3.5" /> Security Question
                  </p>
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed">{securityQuestion}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Answer is case-insensitive • Stored as bcrypt hash</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-slate-700">Answer</Label>
                  <Input type="password" placeholder="Your secret answer" className="h-[44px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-[14px]" {...resetForm.register('securityAnswer')} />
                  {resetForm.formState.errors.securityAnswer && <p className="text-xs text-red-600">{resetForm.formState.errors.securityAnswer.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-slate-700">New Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input type="password" placeholder="Minimum 8 chars, uppercase, number" className="h-[44px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-[14px]" {...resetForm.register('newPassword')} />
                  </div>
                  {resetForm.formState.errors.newPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-slate-700">Confirm New Password</Label>
                  <Input type="password" placeholder="Repeat new password" className="h-[44px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-[14px]" {...resetForm.register('confirmPassword')} />
                  {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="w-full h-[44px] rounded-xl bg-slate-900 hover:bg-black text-white font-semibold shadow-lg group relative overflow-hidden" disabled={resetForm.formState.isSubmitting}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-2">
                    {resetForm.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : <>Reset Password • Premium</>}
                  </span>
                </Button>

                <Button type="button" variant="outline" className="w-full rounded-xl h-[44px] border-slate-200 bg-white" onClick={() => setSecurityQuestion('')}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Use another email
                </Button>
              </form>
            )}

            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <span>Remembered password?</span>
              <Link to="/login" className="font-semibold text-slate-900 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                Back to login <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>

            <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Secure recovery</span>
              <span className="h-3 w-px bg-slate-200" />
              <span>Business date IST</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/40">© 2026 Mayzax Solutions • Premium ATS • Dazzling eyes ✨</p>
      </motion.div>
    </div>
  );
}
