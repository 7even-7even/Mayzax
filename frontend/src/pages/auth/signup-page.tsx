import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck, Users } from 'lucide-react';
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
    <div className="relative flex min-h-screen overflow-hidden bg-[#04070f]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/30 blur-[80px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-amber-600/20 to-orange-600/20 blur-[90px] animate-pulse [animation-delay:1s]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative hidden w-[58%] flex-col justify-between overflow-hidden px-16 py-12 lg:flex">
        <div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
            <img src={mayzaxLogo} alt="Mayzax" className="h-10 w-10 rounded-xl bg-white p-2 shadow-lg shadow-violet-500/20 ring-1 ring-white/20" />
            <span className="text-sm font-semibold tracking-wider text-white/70 uppercase">Mayzax Solutions</span>
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl px-3 py-1 text-xs font-medium text-white/70">
              <Users className="h-3.5 w-3.5 text-emerald-300" />
              Join 500+ recruiters shipping 2k+ applications daily
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white leading-[1.1]">
              Start hiring
              <br />
              <span className="bg-gradient-to-r from-violet-200 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">at the speed of light</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/50">
              Create your recruiter account in seconds. Get instant access to candidate profiles, verified application tracking, and team analytics.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 max-w-lg">
            {[
              { label: 'Setup in 30s', sub: 'No credit card' },
              { label: 'Free for recruiters', sub: 'Admin approval' },
              { label: 'Chrome extension', sub: 'Auto-verify' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl p-3">
                <p className="text-xs font-semibold text-white/80">{f.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{f.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="text-xs text-white/30">© 2026 Mayzax • Built for dazzling eyes ✨</div>

        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
      </div>

      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 lg:w-[42%] lg:bg-white lg:rounded-l-[32px] lg:shadow-[-20px_0_80px_rgba(0,0,0,0.3)]">
        <div className="relative z-10 w-full max-w-[380px]">
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/5 blur-2xl" />

            <div className="relative">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1 text-[11px] font-semibold tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  RECRUITER ONBOARDING
                </div>
                <h2 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Create your account</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Join Mayzax ATS • Instant access • No spam</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Full Name</Label>
                  <div className="relative group">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input placeholder="Your full name" className="h-[44px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 text-[14px]" {...register('name')} />
                  </div>
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Work Email</Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input type="email" placeholder="you@company.com" className="h-[44px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 text-[14px]" {...register('email')} />
                  </div>
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Password</Label>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" className="h-[44px] pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 text-[14px]" {...register('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Repeat password" className="h-[44px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 text-[14px]" {...register('confirmPassword')} />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="group relative w-full h-[44px] rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all overflow-hidden" disabled={isSubmitting}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                      </>
                    ) : (
                      <>
                        Create account <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-slate-900 hover:text-violet-600 transition-colors inline-flex items-center gap-1">
                  Sign in <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>

              <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Secure</span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Premium ATS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
