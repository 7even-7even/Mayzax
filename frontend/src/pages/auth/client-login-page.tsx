import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useMotionValue, useSpring } from 'framer-motion';
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
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.02) 50%, transparent 70%)',
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

export default function ClientLoginPage() {
  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    try {
      const user = await login(values);
      if (user.role !== 'CLIENT') {
        await logout();
        toast.error('Staff members are not allowed to log in here. Please use the Admin/Recruiter Portal.');
        return;
      }
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = (location.state as any)?.from?.pathname ?? '/client-dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Invalid email or password'));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* LEFT BRAND PANEL - Clean Slate/Indigo/Blue Gradient */}
      <div className="relative hidden w-[58%] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 px-16 py-12 lg:flex" onMouseMove={handleMouseMove}>
        {/* Interactive spotlight following mouse */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute h-[600px] w-[600px] rounded-full blur-[90px] transition-all duration-700 ease-out pointer-events-none"
            style={{
              left: mousePos.x - 300,
              top: mousePos.y - 300,
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, transparent 70%)',
            }}
          />
        </div>

        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/20 via-transparent to-black/20" />
        <ParticleField />

        {/* Ambient glow matching dashboard banner */}
        <div className="absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

        {/* Floating cubes matching brand colors */}
        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
        <FloatingCube size={40} bottom="30%" right="22%" variant="white" duration={8} delay={1.5} opacity={0.7} />

        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <div className="relative">
              <img src={mayzaxLogo} alt="Mayzax" className="h-10 w-10 rounded-xl bg-slate-900 p-2 shadow-lg shadow-black/20 ring-1 ring-white/10" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <span className="text-3xl font-semibold tracking-wider text-white/90 uppercase font-sans">Mayzax Solutions</span>
            <span className="ml-2 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/80 backdrop-blur-sm">Client Portal</span>
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Where talent
              <br />
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">meets opportunity</span>
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 max-w-lg">
            {[
              { icon: ShieldCheck, label: 'Secure Access', sub: 'Verified Client Area' },
              { icon: Zap, label: 'Live Tracking', sub: 'Direct Application Stats' },
              { icon: Sparkles, label: 'Fast Updates', sub: 'Instant status changes' },
            ].map((f, i) => (
              <div key={i} className="group rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl p-3 hover:bg-white/15 transition-colors cursor-default">
                <f.icon className="h-4 w-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-white">{f.label}</p>
                <p className="text-[11px] text-slate-350 mt-0.5 text-white">{f.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-450">
          <span>© 2026 Mayzax Solutions</span>
        </div>
      </div>

      {/* RIGHT FORM PANEL - Lighter, clean slate layout */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 lg:w-[42%] bg-slate-50 lg:shadow-[-20px_0_80px_rgba(99,102,241,0.05)] overflow-hidden" onMouseMove={handleMouseMove}>
        <InteractiveSpotlight />

        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 shadow-xl ring-1 ring-white/10">
            <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-lg bg-slate-900 p-1" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900">Mayzax Client Portal</h1>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[380px]">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/60 bg-white p-8 shadow-[0_20px_80px_rgba(99,102,241,0.06),0_0_0_1px_rgba(0,0,0,0.02)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-600" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/10 to-emerald-100/5 blur-2xl" />

            <div className="relative">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100/60 px-3 py-1 text-[11px] font-bold tracking-wide text-indigo-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CLIENT LOGIN
                </div>
                <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-slate-900">Login To Your Dashboard</h2>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-600">Work Email</Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input type="email" placeholder="you@clientemail.com" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] transition-all" {...register('email')} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-600">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="h-[46px] pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] transition-all" {...register('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="group relative w-full h-[46px] rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-[14px] shadow-[0_8px_24px_rgba(99,102,241,0.15)] transition-all duration-300 overflow-hidden" disabled={isSubmitting}>
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                      </>
                    ) : (
                      <>
                        Sign in to dashboard <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              <div className="mt-7">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-slate-100" />
                  </div>
                  {/* <span className="relative bg-white px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">New to Mayzax?</span> */}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Secure Area
                </span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-indigo-600" /> 99.9% uptime
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
