import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/lib/api-client';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { FloatingCube } from '@/components/shared/floating-cube';

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: SignupForm) => {
    try {
      const user = await signup(values);
      toast.success(`Welcome, ${user.name.split(' ')[0]}! Your recruiter account is ready.`);
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/applications', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Could not create your account'));
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50">
      <div className="relative hidden w-3/5 flex-col justify-center overflow-hidden bg-mayzax-gradient px-16 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-transparent" />
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-mayzax-blue/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-mayzax-green/20 blur-3xl" />

        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
        <FloatingCube size={40} bottom="30%" right="22%" variant="white" duration={8} delay={1.5} opacity={0.7} />
        <FloatingCube size={110} bottom="-5%" right="-5%" variant="blue" duration={12} delay={0.3} opacity={0.5} />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <motion.img
              layoutId="mayzax-logo"
              src={mayzaxLogo}
              alt="Mayzax"
              className="ml-12 h-25 w-25 rounded-2xl bg-white pl-1.5 pt-1.5 shadow-xl ring-1 ring-slate-200"
            />
            <div>
              <h1 className="pb-[15px] pl-[15px] text-5xl font-bold text-white">Mayzax Solutions</h1>
              <p className="pl-[17px] text-2xl font-bold text-white/70">Recruitment ATS</p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-0 z-0 h-full w-80 bg-gradient-to-r from-transparent via-slate-50/20 to-slate-50" />
      </div>

      <div className="relative flex w-full flex-col items-center justify-center px-4 lg:w-1/2">
        <FloatingCube size={45} top="10%" right="10%" variant="white" duration={11} opacity={0.5} />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <img src={mayzaxLogo} alt="Mayzax Solutions" className="h-16 w-16 rounded-2xl bg-white p-2 shadow-md ring-1 ring-slate-200" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mayzax ATS</h1>
              <p className="text-sm text-slate-500">Recruiter account setup</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-5xl shadow-slate-200/60">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Create your recruiter account</h2>
              <p className="mt-1.5 text-sm text-slate-500">Set up access to the Mayzax ATS dashboard</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Full name
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    className="h-12 rounded-xl border-slate-200 pl-11 text-[15px] focus-visible:ring-mayzax-blue/30"
                    {...register('name')}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="h-12 rounded-xl border-slate-200 pl-11 text-[15px] focus-visible:ring-mayzax-blue/30"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    className="h-12 rounded-xl border-slate-200 pl-11 pr-11 text-[15px] focus-visible:ring-mayzax-blue/30"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className="h-12 rounded-xl border-slate-200 pl-11 pr-11 text-[15px] focus-visible:ring-mayzax-blue/30"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              <Button
                type="submit"
                variant="brand"
                className="h-12 w-full rounded-xl text-[15px] font-medium shadow-lg shadow-mayzax-blue/20 transition-transform active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-mayzax-blue hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}