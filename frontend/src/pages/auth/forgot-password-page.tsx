import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Loader2, Mail, ShieldQuestion, Lock, ArrowLeft, Sparkles, ShieldCheck, KeyRound, ArrowRight, MousePointer2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { ApiSuccess } from '@/types';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { FloatingCube } from '@/components/shared/floating-cube';

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

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const fetchQuestion = async (values: EmailForm) => {
    try {
      const { data } = await apiClient.post<ApiSuccess<{ email: string; securityQuestion: string }>>('/auth/forgot-password/question', values);
      setEmail(data.data.email);
      setSecurityQuestion(data.data.securityQuestion);
      toast.success('Security question loaded • Recovery panel ready');
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
              Secure password
              <br />
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">recovery system</span>
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 max-w-lg">
            {[
              { icon: KeyRound, label: 'Instant Reset', sub: 'Security QA' },
              { icon: ShieldCheck, label: 'Bcrypt Hash', sub: 'High security' },
              { icon: Zap, label: 'No spam', sub: 'Zero latency' },
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
              <div className="mb-7 flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mayzax-blue-50 border border-mayzax-blue-100 text-mayzax-blue-700 shadow-sm mb-4">
                  <KeyRound className="h-7 w-7" />
                </div>
                <h1 className="text-[22px] font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
                  Forgot Password
                  <span className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">SECURE</span>
                </h1>
                <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed max-w-[300px]">Answer your security question to reset password • Recovery flow</p>
              </div>

              {!securityQuestion ? (
                <form onSubmit={emailForm.handleSubmit(fetchQuestion)} className="space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Email Address</Label>
                    <div className="relative group">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-mayzax-blue-500 transition-colors" />
                      <Input type="email" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all" placeholder="you@mayzaxsolutions.com" {...emailForm.register('email')} />
                    </div>
                    {emailForm.formState.errors.email && <p className="text-xs text-red-600">{emailForm.formState.errors.email.message}</p>}
                  </div>

                  <Button type="submit" className="group relative w-full h-[46px] rounded-xl bg-mayzax-gradient hover:opacity-90 text-white font-semibold text-[14px] shadow-[0_8px_24px_rgba(42,93,168,0.25)] hover:shadow-[0_12px_32px_rgba(42,93,168,0.3)] transition-all duration-300 overflow-hidden" disabled={emailForm.formState.isSubmitting}>
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

                  <div className="rounded-xl bg-gradient-to-br from-mayzax-blue-50 to-mayzax-green-50/30 border border-mayzax-blue-100 p-3 flex gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mayzax-gradient text-white shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span className="font-semibold text-mayzax-blue-700">Security safeguard:</span> We’ll show your security question only if account exists. No email enumeration.
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-5" noValidate>
                  <div className="rounded-xl border border-mayzax-blue-200 bg-gradient-to-br from-mayzax-blue-50 to-mayzax-green-50/50 p-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mayzax-blue-750">
                      <ShieldQuestion className="h-3.5 w-3.5" /> Security Question
                    </p>
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">{securityQuestion}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Answer is case-insensitive • Stored securely</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Answer</Label>
                    <Input type="password" placeholder="Your secret answer" className="h-[46px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all" {...resetForm.register('securityAnswer')} />
                    {resetForm.formState.errors.securityAnswer && <p className="text-xs text-red-600">{resetForm.formState.errors.securityAnswer.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">New Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type="password" placeholder="Minimum 8 chars, uppercase, number" className="h-[46px] pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all" {...resetForm.register('newPassword')} />
                    </div>
                    {resetForm.formState.errors.newPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-700">Confirm New Password</Label>
                    <Input type="password" placeholder="Repeat new password" className="h-[46px] rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 text-[14px] transition-all" {...resetForm.register('confirmPassword')} />
                    {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>}
                  </div>

                  <Button type="submit" className="group relative w-full h-[46px] rounded-xl bg-mayzax-gradient hover:opacity-90 text-white font-semibold text-[14px] shadow-[0_8px_24px_rgba(42,93,168,0.25)] hover:shadow-[0_12px_32px_rgba(42,93,168,0.3)] transition-all duration-300 overflow-hidden" disabled={resetForm.formState.isSubmitting}>
                    <span className="relative flex items-center justify-center gap-2">
                      {resetForm.formState.isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : <>Reset Password</>}
                    </span>
                  </Button>

                  <Button type="button" variant="outline" className="w-full rounded-xl h-[46px] border-slate-200 bg-white" onClick={() => setSecurityQuestion('')}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Use another email
                  </Button>
                </form>
              )}

              <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                <span>Remembered password?</span>
                <Link to="/login" className="font-bold text-mayzax-blue-700 hover:text-mayzax-blue-800 transition-colors inline-flex items-center gap-1">
                  Back to login <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>

              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-mayzax-green-600" /> Secure recovery
                </span>
                <span className="h-3 w-px bg-slate-200" />
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-mayzax-blue-600" /> Uptime 99.9%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
