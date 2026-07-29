import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, User, Sparkles, ArrowRight, ShieldCheck, Users, MousePointer2, Zap } from 'lucide-react';
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

function InteractiveSpotlight() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 25, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 200 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    const el = ref.current;
    if (el) {
      el.addEventListener('mousemove', handleMouseMove);
      return () => el.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseX, mouseY]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute h-[500px] w-[500px] rounded-full opacity-20 blur-[60px] pointer-events-none"
        style={{
          x: springX,
          y: springY,
          background: 'radial-gradient(circle, rgba(42,93,168,0.25) 0%, rgba(63,156,113,0.15) 40%, transparent 70%)',
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </div>
  );
}

function ParticleField() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 4,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4 + p.delay, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50">
      {/* LEFT BRAND PANEL - Original palette Mayzax gradient */}
      <div className="relative hidden w-[58%] flex-col justify-between overflow-hidden bg-mayzax-gradient px-16 py-12 lg:flex" onMouseMove={handleMouseMove}>
        {/* Interactive spotlight following mouse */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute h-[600px] w-[600px] rounded-full blur-[80px] transition-all duration-700 ease-out pointer-events-none"
            style={{
              left: mousePos.x - 300,
              top: mousePos.y - 300,
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-transparent to-black/10" />
        <ParticleField />

        {/* Ambient glow with original colors */}
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-mayzax-green-300/20 blur-3xl" />

        {/* Floating cubes - original blue/green/white */}
        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
        <FloatingCube size={40} bottom="30%" right="22%" variant="white" duration={8} delay={1.5} opacity={0.7} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="relative">
              <img src={mayzaxLogo} alt="Mayzax" className="h-10 w-10 rounded-xl bg-white p-2 shadow-lg shadow-black/10 ring-1 ring-white/20" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            </div>
            <span className="text-3xl font-semibold tracking-wider text-white/90 uppercase">Mayzax Solutions</span>
            <span className="ml-2 rounded-full bg-white/15 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/80 backdrop-blur-sm">ATS v2.1</span>
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Start hiring
              <br />
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">at the speed of light</span>
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 max-w-lg">
            {[
              { icon: Users, label: 'Setup in 30s', sub: 'No external installations' },
              { icon: ShieldCheck, label: 'Free for recruiters', sub: 'Admin approval' },
              { icon: Sparkles, label: 'Chrome extension', sub: 'Auto-verify' },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl p-3 hover:bg-white/15 transition-colors cursor-default">
                <f.icon className="h-4 w-4 text-white mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-[11px] text-white/60 mt-0.5">{f.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-white/50">
          <span>© 2026 Mayzax Solutions</span>
        </div>
      </div>

      {/* RIGHT FORM PANEL - Premium white with interactive spotlight */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 lg:w-[42%] bg-white lg:shadow-[-20px_0_80px_rgba(42,93,168,0.08)] overflow-hidden" onMouseMove={handleMouseMove}>
        <InteractiveSpotlight />

        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mayzax-gradient shadow-xl shadow-mayzax-blue/20 ring-1 ring-white">
            <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-lg bg-white p-1" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Mayzax ATS</h1>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[380px]">
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white p-8 shadow-[0_20px_80px_rgba(42,93,168,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-mayzax-gradient" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-mayzax-blue-100 to-mayzax-green-50 blur-2xl" />

            <div className="relative">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-mayzax-blue-50 border border-mayzax-blue-100 px-3 py-1 text-[11px] font-bold tracking-wide text-mayzax-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500 animate-pulse" />
                  RECRUITER ONBOARDING
                </div>
                <h2 className="mt-4 text-[22px] font-bold tracking-tight text-slate-900">Create your account</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">Join Mayzax ATS • Instant access • No spam</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Full Name</Label>
                  <div className="relative group">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-mayzax-blue-500 transition-colors" />
                    <Input placeholder="Your full name" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all dark:text-black" {...register('name')} />
                  </div>
                  {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Work Email</Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-mayzax-blue-500 transition-colors" />
                    <Input type="email" placeholder="you@company.com" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all dark:text-black" {...register('email')} />
                  </div>
                  {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Password</Label>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-mayzax-blue-500 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" className="h-[46px] pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all dark:text-black" {...register('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-mayzax-blue-500 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Repeat password" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all dark:text-black" {...register('confirmPassword')} />
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="group relative w-full h-[46px] rounded-xl bg-mayzax-gradient hover:opacity-90 text-white font-semibold text-[14px] shadow-[0_8px_24px_rgba(42,93,168,0.25)] hover:shadow-[0_12px_32px_rgba(42,93,168,0.3)] transition-all duration-300 overflow-hidden" disabled={isSubmitting}>
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
                <Link to="/login" className="font-bold text-mayzax-blue-750 hover:text-mayzax-blue-800 transition-colors inline-flex items-center gap-1">
                  Sign in <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>

              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-mayzax-green-600" /> Enterprise
                </span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-mayzax-blue-600" /> 99.9% uptime
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
