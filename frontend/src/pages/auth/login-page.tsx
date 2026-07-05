import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
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
      const from = (location.state as any)?.from?.pathname ?? (user.role === 'ADMIN' ? '/dashboard' : '/applications');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Invalid email or password'));
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50">
      {/* ---------- LEFT BRAND PANEL ---------- */}
      <div className="relative hidden w-3/5 flex-col justify-center overflow-hidden bg-mayzax-gradient px-16 lg:flex">
        {/* Dark overshade for depth + contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-transparent" />

        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-mayzax-blue/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-mayzax-green/20 blur-3xl" />

        {/* Floating cubes */}
        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
        <FloatingCube size={40} bottom="30%" right="22%" variant="white" duration={8} delay={1.5} opacity={0.7} />
        <FloatingCube size={110} bottom="-5%" right="-5%" variant="blue" duration={12} delay={0.3} opacity={0.5} />

        {/* Logo + copy — this is where the intro logo "lands" via shared layoutId */}
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <motion.img
              layoutId="mayzax-logo"
              src={mayzaxLogo}
              alt="Mayzax"
              className="h-25 w-25 rounded-2xl shadow-xl ml-12 pl-1.5 pt-1.5 ring-1 ring-slate-200 bg-white"
            />
            <div>
              <h1 className="text-5xl font-bold text-white pb-[15px] pl-[15px]">Mayzax Solutions</h1>
              <p className="text-2xl font-bold text-white/70 pl-[17px]">Recruitment ATS</p>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 h-full w-80 bg-gradient-to-r from-transparent via-slate-50/20 to-slate-50 pointer-events-none z-0" />

      </div>

      {/* ---------- RIGHT FORM PANEL ---------- */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 lg:w-1/2">
        {/* Subtle cubes to add richness without distracting from the form */}
        <FloatingCube size={45} top="10%" right="10%" variant="white" duration={11} opacity={0.5} />

        <div className="relative z-10 w-full max-w-md">
          {/* Compact branding shown only when the left panel is hidden (mobile/tablet) */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <img src={mayzaxLogo} alt="Mayzax Solutions" className="h-16 w-16 rounded-2xl shadow-md ring-1 ring-slate-200 bg-white p-2" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mayzax ATS</h1>
              <p className="text-sm text-slate-500">Recruitment Management Platform</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-5xl shadow-slate-200/60">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-slate-900">Sign in to your account</h2>
              <p className="mt-1.5 text-sm text-slate-500">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@mayzaxsolutions.com"
                    className="h-12 pl-11 text-[15px] rounded-xl border-slate-200 focus-visible:ring-mayzax-blue/30"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-12 pl-11 pr-11 text-[15px] rounded-xl border-slate-200 focus-visible:ring-mayzax-blue/30"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                variant="brand"
                className="w-full h-12 rounded-xl text-[15px] font-medium shadow-lg shadow-mayzax-blue/20 transition-transform active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              New recruiter?{' '}
              <Link to="/signup" className="font-medium text-mayzax-blue hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}