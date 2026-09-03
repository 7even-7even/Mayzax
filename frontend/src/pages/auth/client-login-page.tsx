import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles, ShieldCheck, Zap, ArrowRight, SendHorizonal, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
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

const SERVICES = ['Placement', 'Training', 'OPT/Stem OPT Support', 'H1B Sponsorship', 'Other'] as const;

export default function ClientLoginPage() {
  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Enquiry dialog state
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enqName, setEnqName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqService, setEnqService] = useState<string>('Placement');
  const [enqDetails, setEnqDetails] = useState('');

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

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enqName.trim() || !enqEmail.trim() || !enqDetails.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setEnquirySubmitting(true);
    try {
      await apiClient.post('/inquiries', {
        fullName: enqName.trim(),
        email: enqEmail.trim(),
        phone: enqPhone.trim() || undefined,
        serviceInterested: enqService,
        details: enqDetails.trim(),
      });
      setEnquirySuccess(true);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to submit enquiry. Please try again.'));
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const handleEnquiryClose = () => {
    setEnquiryOpen(false);
    // Reset after close animation
    setTimeout(() => {
      setEnquirySuccess(false);
      setEnqName(''); setEnqEmail(''); setEnqPhone('');
      setEnqService('Placement'); setEnqDetails('');
    }, 300);
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

        <div className="relative z-10 flex items-center gap-6 text-xs text-slate-450 text-white">
          <span>© 2026 Mayzax Solutions</span>
        </div>
      </div>
      {/* RIGHT FORM PANEL - Lighter, clean slate layout */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 lg:w-[42%] bg-slate-50 dark:bg-slate-950 lg:shadow-[-20px_0_80px_rgba(99,102,241,0.05)] overflow-hidden" onMouseMove={handleMouseMove}>
        <InteractiveSpotlight />

        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 shadow-xl ring-1 ring-white/10">
            <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-lg bg-slate-900 p-1" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mayzax Client Portal</h1>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[380px]">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-[0_20px_80px_rgba(99,102,241,0.06),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-600" />
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/20 to-emerald-100/10 dark:from-indigo-900/20 dark:to-emerald-900/10 blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="mb-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/60 dark:border-indigo-800 px-3 py-1 text-[11px] font-bold tracking-wide text-indigo-700 dark:text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CLIENT LOGIN
                </div>
                <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white">Login To Your Dashboard</h2>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-wide uppercase text-slate-600 dark:text-slate-300">Work Email</Label>
                  <div className="relative group">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <Input type="email" placeholder="you@clientemail.com" className="h-[46px] pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] transition-all" {...register('email')} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold tracking-wide uppercase text-slate-600 dark:text-slate-300">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="h-[46px] pl-10 pr-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-[14px] transition-all" {...register('password')} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
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
                        Access Client Dashboard <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              {/* Enquiry link */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Interested in our services?{' '}
                  <button
                    type="button"
                    onClick={() => { setEnquirySuccess(false); setEnquiryOpen(true); }}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
                  >
                    Submit an Enquiry
                  </button>
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Client Protected
                </span>
                <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-indigo-500" /> Real-time Data
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ENQUIRY MODAL */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl">
          {/* Top header banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase mb-2">
                <Sparkles className="h-3 w-3" /> Mayzax Solutions
              </div>
              <DialogTitle className="text-xl font-extrabold text-white">Partner With Us</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-1">
                Tell us about your requirements — our team will reach out within 24 hours.
              </DialogDescription>
            </div>
          </div>

          <div className="p-6">
            {enquirySuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto shadow-inner border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Enquiry Received!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Thank you for reaching out. A Mayzax representative will review your request and get in touch shortly.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnquiryOpen(false)}
                  className="mt-2 rounded-xl border-slate-200 dark:border-slate-700 dark:text-slate-200"
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={enqName}
                    onChange={e => setEnqName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-[14px]"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={enqEmail}
                    onChange={e => setEnqEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-[14px]"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Phone <span className="text-slate-400 font-normal">(Optional)</span></Label>
                  <Input
                    value={enqPhone}
                    onChange={e => setEnqPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-[14px]"
                  />
                </div>

                {/* Service Interested */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">Service Interested In <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEnqService(s)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-bold border transition-all duration-150 ${
                          enqService === s
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">How Can We Help? <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={enqDetails}
                    onChange={e => setEnqDetails(e.target.value)}
                    placeholder="Tell us about your background, visa status & goals..."
                    rows={3}
                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-[14px] resize-none"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[14px] shadow-[0_8px_24px_rgba(16,185,129,0.2)] transition-all duration-300 group"
                >
                  {enquirySubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Submit Enquiry <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
