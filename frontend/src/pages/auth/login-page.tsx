import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/lib/api-client';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { FloatingCube } from '@/components/shared/floating-cube';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = (location.state as any)?.from?.pathname ?? (user.role === 'ADMIN' || user.role === 'TEAM_LEADER' ? '/dashboard' : '/recruiter-dashboard');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Invalid email or password'));
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#04070f]">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/30 blur-[80px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-blue-600/30 to-teal-600/20 blur-[90px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 blur-[60px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* LEFT BRAND PANEL - Premium */}
      <div className="relative hidden w-[58%] flex-col justify-between overflow-hidden px-16 py-12 lg:flex">
        <div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
            <img src={mayzaxLogo} alt="Mayzax" className="h-10 w-10 rounded-xl bg-white p-2 shadow-lg shadow-violet-500/20 ring-1 ring-white/20" />
            <span className="text-sm font-semibold tracking-wider text-white/70 uppercase">Mayzax Solutions</span>
            <span className="ml-2 rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/60">ATS v2.1</span>
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              Trusted by 500+ recruiters • Night-shift optimized
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white leading-[1.1]">
              Where talent
              <br />
              <span className="bg-gradient-to-r from-violet-200 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">meets opportunity</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/50">
              Premium ATS built for Mayzax’s high-velocity night shift. Track applications, monitor team pulse, verify submissions with our Chrome extension — all in business-date time.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 max-w-lg">
            {[
              { icon: ShieldCheck, label: 'Enterprise Security', sub: 'JWT rotation + audit logs' },
              { icon: Zap, label: '60fps Experience', sub: 'Virtualized tables' },
              { icon: Sparkles, label: 'Premium Analytics', sub: 'Realtime heatmaps' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl p-3">
                <f.icon className="h-4 w-4 text-violet-300 mb-2" />
                <p className="text-xs font-semibold text-white/80">{f.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{f.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex items-center gap-6 text-xs text-white/30">
          <span>© 2026 Mayzax Solutions</span>
          <span className="h-3 w-px bg-white/10" />
          <span>Built for dazzling eyes ✨</span>
        </motion.div>

        {/* Floating cubes with glow */}
        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
      </div>

      {/* RIGHT FORM PANEL - Ultra premium glass */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 lg:w-[42%] lg:bg-white lg:rounded-l-[32px] lg:shadow-[-20px_0_80px_rgba(0,0,0,0.3)]">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl shadow-violet-500/10 ring-1 ring-slate-200">
            <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white lg:text-slate-900">Mayzax ATS</h1>
            <p className="text-xs text-white/50 lg:text-slate-500">Premium Recruitment OS</p>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[380px]">
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white p-8 shadow-[0_20px_80px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
            {/* Card top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500/10 to-indigo-500/5 blur-2xl" />

            <div className="relative">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1 text-[11px] font-semibold tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SECURE LOGIN
                </div>
                <h2 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Enter your credentials to access your premium dashboard</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                    Work Email
                  </Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@mayzaxsolutions.com"
                      className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 transition-all text-[14px]"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-600 flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-red-500" />{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                      Password
                    </Label>
                    <Link to="/forgot-password" className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-[46px] pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100 transition-all text-[14px]"
                      {...register('password')}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600 flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-red-500" />{errors.password.message}</p>}
                </div>

                <Button
                  type="submit"
                  className="group relative w-full h-[46px] rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all duration-300 overflow-hidden"
                  disabled={isSubmitting}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to dashboard
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              <div className="mt-7">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-slate-200" /></div>
                  <span className="relative bg-white px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">New to Mayzax?</span>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <span className="text-slate-500">New recruiter?</span>
                  <Link to="/signup" className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-violet-600 transition-colors">
                    Create an account <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Enterprise SSO</span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> 99.9% uptime</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 lg:text-slate-500">
            Protected by Mayzax security • Business date IST • <span className="font-medium">Premium ATS v2.1</span>
          </p>
        </div>
      </div>
    </div>
  );
}
