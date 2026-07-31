import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingCube } from '@/components/shared/floating-cube';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User2, Mail, Phone, Calendar, GraduationCap, Code2, ShieldCheck,
  MapPin, Plus, Trash2, Shield, Upload, FileText, CheckCircle2,
  DollarSign, Receipt, Download, Loader2, CreditCard, Sparkles, AlertCircle, LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateOnboarding, useUploadResume } from '@/hooks/use-onboarding';
import { ThemeTogglePremium } from '@/components/theme/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { apiClient } from '@/lib/api-client';

// Form validation schema
const educationSchema = z.object({
  qualification: z.string().min(1, 'Qualification is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  instituteName: z.string().min(1, 'Institute name is required'),
  honors: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  currentlyOngoing: z.boolean().default(false),
});

const addressSchema = z.object({
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  fromDate: z.string().min(1, 'From Date'),
  toDate: z.string().min(1, 'To Date'),
});

const experienceBlockSchema = z.object({
  companyName: z.string().optional(),
  post: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currentlyWorking: z.boolean().default(false),
  roles: z.string().optional(),
  achievements: z.string().optional(),
});

const certificationBlockSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  credentialId: z.string().optional(),
});

const onboardingFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.string().min(1, 'Select your gender'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Phone number is too short'),
  dateOfBirth: z.string().min(10, 'Provide DOB in DD/MM/YYYY format'),
  education: z.array(educationSchema).min(1, 'Provide at least one educational entry'),
  technology: z.string().min(1, 'Select a technology track'),
  skills: z.string().min(1, 'Skills list is required'),
  visaStatus: z.string().min(1, 'Select your Visa Status'),
  entryToUS: z.string().optional(),
  currentLocation: z.string().min(1, 'Current location is required'),
  addressHistory: z.array(addressSchema).max(5, 'Up to 5 address entries allowed'),
  hasExperience: z.boolean().default(false),
  experiences: z.array(experienceBlockSchema).optional(),
  experienceDetails: z.string().optional(),
  certificationBlocks: z.array(certificationBlockSchema).optional(),
  certifications: z.string().optional(),
  resumeUrl: z.string().optional(),
  resumeFileName: z.string().optional(),
  declared: z.boolean().refine((val) => val === true, 'You must agree to the declaration'),
  planSelected: z.string().min(1, 'Select a plan'),
  amountPaid: z.number().min(0, 'Enter paid amount'),
  paymentRef: z.string().min(1, 'Enter payment reference'),
}).superRefine((data, ctx) => {
  if (data.hasExperience) {
    if (!data.experiences || data.experiences.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['experiences'],
        message: 'Provide at least one experience entry',
      });
    } else {
      data.experiences.forEach((exp, idx) => {
        if (!exp.companyName || exp.companyName.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['experiences', idx, 'companyName'],
            message: 'Company Name is required',
          });
        }
        if (!exp.post || exp.post.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['experiences', idx, 'post'],
            message: 'Post/Job Title is required',
          });
        }
        if (!exp.startDate || exp.startDate.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['experiences', idx, 'startDate'],
            message: 'Start Date is required',
          });
        }
        if (!exp.roles || exp.roles.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['experiences', idx, 'roles'],
            message: 'Roles & responsibilities are required',
          });
        }
      });
    }
  }
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

const STEPS = [
  { name: 'Personal Info', desc: 'Contact & identity details', icon: User2 },
  { name: 'Education', desc: 'Degrees & academic history', icon: GraduationCap },
  { name: 'Technical Info', desc: 'Tech stack & target roles', icon: Code2 },
  { name: 'Visa Details', desc: 'US work authorization', icon: ShieldCheck },
  { name: 'Address History', desc: 'Past physical locations', icon: MapPin },
  { name: 'Experience', desc: 'Professional work history', icon: FileText },
  { name: 'Certifications', desc: 'Credentials & courses', icon: Shield },
  { name: 'Resume Upload', desc: 'Attach PDF/Word resume', icon: Upload },
  { name: 'Declaration', desc: 'Self-attestation & terms', icon: CheckCircle2 },
  { name: 'Mock Payment', desc: 'Billing plan & checkout', icon: CreditCard },
  { name: 'Receipt', desc: 'Confirmation receipt', icon: Receipt }
];

const PLANS = [
  { name: 'Silver Plan', price: 199, description: 'Basic profile matching & support' },
  { name: 'Gold Plan', price: 399, description: 'Priority submission & 1-on-1 coaching' },
  { name: 'Platinum Plan', price: 599, description: 'Comprehensive marketing & direct vendor pipelines' }
];

const STEP_HEADERS = [
  { title: "Personal Info", desc: "Tell us a bit about yourself to get started with your candidate profile." },
  { title: "Education Details", desc: "Add your academic qualifications, degree levels, and major study paths." },
  { title: "Technical Stack & Skills", desc: "Select your target tracks and list your core programming/software skills." },
  { title: "US Visa & Immigration Status", desc: "Select your current visa status and entry details." },
  { title: "Physical Address History", desc: "Provide details of your US physical addresses (up to 5 entries)." },
  { title: "Professional Work Experience", desc: "If you have prior experience, list details about roles and achievements." },
  { title: "Certifications & Coursework", desc: "List credentials, key awards, or external courses that show your expertise." },
  { title: "Resume & Profile Documents", desc: "Upload your latest resume. Only PDF, DOCX, or DOC formats are supported." },
  { title: "Self-Attestation & Declaration", desc: "Confirm and declare that the information provided is accurate and true." },
  { title: "Billing Plan & Checkout", desc: "Choose a marketing/support plan and complete mock payment checkout." },
  { title: "Confirmation Receipt", desc: "Your registration is complete! Save or print this receipt for your records." }
];
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
export default function OnboardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadedResume, setUploadedResume] = useState<{ url: string; fileName: string } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const createMutation = useCreateOnboarding();
  const uploadMutation = useUploadResume();

  const { register, control, handleSubmit, setValue, watch, trigger, formState: { errors } } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      fullName: '',
      gender: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      education: [{ qualification: '', fieldOfStudy: '', specialization: '', instituteName: '', honors: '', startDate: '', endDate: '', currentlyOngoing: false }],
      technology: '',
      skills: '',
      visaStatus: '',
      entryToUS: '',
      currentLocation: '',
      addressHistory: [],
      hasExperience: false,
      experiences: [{ companyName: '', post: '', startDate: '', endDate: '', currentlyWorking: false, roles: '', achievements: '' }],
      experienceDetails: '',
      certificationBlocks: [],
      certifications: '',
      resumeUrl: '',
      resumeFileName: '',
      declared: false,
      planSelected: 'Gold Plan',
      amountPaid: 399,
      paymentRef: ''
    }
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: 'education' });
  const { fields: addrFields, append: appendAddr, remove: removeAddr } = useFieldArray({ control, name: 'addressHistory' });
  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control, name: 'experiences' });
  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({ control, name: 'certificationBlocks' });

  const selectedPlan = watch('planSelected');
  const hasExperience = watch('hasExperience');
  const paymentRef = watch('paymentRef');
  const amountPaid = watch('amountPaid');
  const fullName = watch('fullName');
  const email = watch('email');
  const phone = watch('phone');

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 0) fieldsToValidate = ['fullName', 'gender', 'email', 'phone', 'dateOfBirth'];
    if (currentStep === 1) fieldsToValidate = ['education'];
    if (currentStep === 2) fieldsToValidate = ['technology', 'skills'];
    if (currentStep === 3) fieldsToValidate = ['visaStatus', 'entryToUS', 'currentLocation'];
    if (currentStep === 4) fieldsToValidate = ['addressHistory'];
    if (currentStep === 5) {
      fieldsToValidate = ['hasExperience'];
      if (watch('hasExperience')) {
        fieldsToValidate.push('experiences');
      }
    }
    if (currentStep === 6) fieldsToValidate = ['certificationBlocks'];
    if (currentStep === 7) {
      if (!uploadedResume) {
        toast.error('Please upload your resume first.');
        return;
      }
      fieldsToValidate = ['resumeUrl', 'resumeFileName'];
    }
    if (currentStep === 8) fieldsToValidate = ['declared'];
    if (currentStep === 9) fieldsToValidate = ['planSelected', 'amountPaid', 'paymentRef'];

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) {
      if (currentStep === 0) {
        try {
          const emailVal = watch('email');
          const phoneVal = watch('phone');
          const { data } = await apiClient.get(`/onboarding/check-duplicate?email=${encodeURIComponent(emailVal)}&phone=${encodeURIComponent(phoneVal)}`);
          if (data?.data?.exists) {
            toast.error(data.data.message || 'A client with these details already exists.');
            return;
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.error || err?.message || 'Error checking for duplicate registration.');
          return;
        }
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      toast.error('Please resolve validation errors before continuing.');
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    try {
      const res = await uploadMutation.mutateAsync(file);
      setValue('resumeUrl', res.url);
      setValue('resumeFileName', res.fileName);
      setUploadedResume(res);
      toast.success('Resume uploaded successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload resume.');
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      // Format structured experiences into a readable text string for database/backend
      if (data.hasExperience && data.experiences && data.experiences.length > 0) {
        const formatted = data.experiences.map((exp, idx) => {
          const duration = `${exp.startDate} to ${exp.currentlyWorking ? 'Present' : (exp.endDate || '')}`;
          return `[Job #${idx + 1}]
Company Name: ${exp.companyName}
Post/Title: ${exp.post}
Duration: ${duration}
Roles & Responsibilities:
${exp.roles}
${exp.achievements ? `Key Achievements:\n${exp.achievements}\n` : ''}`;
        }).join('\n---\n\n');
        data.experienceDetails = formatted;
      } else {
        data.experienceDetails = '';
      }

      // Format structured certification blocks into a readable text string for database/backend
      if (data.certificationBlocks && data.certificationBlocks.length > 0) {
        const formattedCerts = data.certificationBlocks.filter(c => c.name.trim() !== '').map((cert, idx) => {
          const dateRange = `${cert.startDate} to ${cert.endDate || 'No Expiration'}`;
          return `[Certification #${idx + 1}]
Name: ${cert.name}
Valid: ${dateRange}
Credential ID/Link: ${cert.credentialId || 'N/A'}`;
        }).join('\n---\n\n');
        data.certifications = formattedCerts;
      } else {
        data.certifications = '';
      }

      const res = await createMutation.mutateAsync(data);
      setCreatedId(res.id);
      toast.success('Onboarding details and payment submitted successfully!');
      setCurrentStep(10); // Go to receipt page
    } catch (err: any) {
      toast.error(err?.message || 'Submission failed.');
    }
  };

  const handlePlanSelect = (plan: typeof PLANS[0]) => {
    setValue('planSelected', plan.name);
    setValue('amountPaid', plan.price);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative flex min-h-screen w-full lg:flex-row flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #payment-receipt, #payment-receipt * {
            visibility: visible;
          }
          #payment-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
      {/* Left Sidebar Column - Stepper Timeline */}
      <div 
        className="relative lg:w-[35%] xl:w-[30%] w-full bg-mayzax-gradient text-slate-100 p-6 lg:py-6 lg:px-5 flex flex-col justify-between overflow-y-auto lg:overflow-y-hidden border-b lg:border-b-0 lg:border-r border-slate-200/10 lg:h-screen shrink-0 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseMove={handleMouseMove}
      >
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/30 via-transparent to-black/20 pointer-events-none" />
        <ParticleField />

        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        {/* Floating cubes */}
        <FloatingCube size={90} top="12%" left="15%" variant="blue" duration={10} />
        <FloatingCube size={50} top="25%" right="18%" variant="white" duration={7} delay={0.5} />
        <FloatingCube size={65} bottom="20%" left="10%" variant="green" duration={9} delay={1} />
        <FloatingCube size={40} bottom="30%" right="22%" variant="white" duration={8} delay={1.5} opacity={0.7} />

              <div className="flex flex-col h-full relative z-10">
                {/* Branding */}
                <div className="relative z-10 mb-3">
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                    <div className="relative">
                      <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-xl bg-white p-2 shadow-lg shadow-black/10 ring-1 ring-white/20" />
                      <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                    </div>
                    <span className="text-2xl font-bold tracking-wider text-white/90 uppercase">Mayzax Solutions</span>
                  </motion.div>
                </div>

                {/* Circular progress summary widget */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="my-3 relative z-10"
                >
                  <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 p-3 flex items-center gap-4">
                    {/* SVG progress ring */}
                    <div className="relative shrink-0">
                      <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                        <motion.circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke="rgba(52,211,153,1)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - (currentStep / (STEPS.length - 1))) }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center rotate-90">
                        <span className="text-white font-black text-xs leading-none">{Math.round((currentStep / (STEPS.length - 1)) * 100)}%</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm leading-tight">Registration Progress</p>
                      <p className="text-white/60 text-[11px] mt-0.5">
                        {currentStep === 0 ? 'Just getting started' : currentStep < 5 ? 'Keep going!' : currentStep < 9 ? 'Almost there...' : currentStep === 10 ? '🎉 Complete!' : 'Final step ahead!'}
                      </p>
                      <div className="mt-1.5 flex gap-1">
                        {STEPS.map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${
                              i < currentStep ? 'bg-emerald-400 flex-1' : i === currentStep ? 'bg-white flex-[1.5]' : 'bg-white/20 flex-1'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Vertical Stepper Timeline */}
                <div className="space-y-0.5 relative z-10">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;
                    
                    return (
                      <div
                        key={step.name}
                        className={`relative flex items-center gap-3 cursor-pointer rounded-xl px-2 py-1.5 transition-all duration-200 group ${
                          isActive
                            ? 'bg-white/10 shadow-inner'
                            : 'hover:bg-white/5'
                        }`}
                        onClick={() => setCurrentStep(idx)}
                      >
                        {/* Connecting Line — rendered inside a positioned wrapper so it aligns to circle center */}
                        {idx < STEPS.length - 1 && (
                          <div
                            className={`absolute left-[22px] top-[calc(50%+14px)] h-[calc(100%-14px+6px)] w-[1.5px] pointer-events-none transition-colors duration-300 ${
                              idx < currentStep ? 'bg-emerald-400' : 'bg-white/15'
                            }`}
                          />
                        )}

                        {/* Circle Node */}
                        <div className={`relative z-10 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                            : isActive
                              ? 'bg-white text-slate-900 ring-[3px] ring-white/30 shadow-[0_0_16px_rgba(255,255,255,0.3)]'
                              : 'bg-white/10 border border-white/15 text-white/50'
                        }`}>
                          {isCompleted
                            ? <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <Icon className="h-3 w-3" />
                          }
                        </div>

                        {/* Text Stack */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold leading-tight text-white transition-all ${isActive ? '' : 'opacity-80 group-hover:opacity-100'}`}>
                            {step.name}
                          </p>
                          <p className={`text-[11px] leading-tight text-white/60 truncate max-w-[180px] transition-all ${isActive ? 'opacity-90' : 'opacity-60 group-hover:opacity-70'}`}>
                            {step.desc}
                          </p>
                        </div>

                        {/* Active arrow indicator */}
                        {isActive && (
                          <div className="shrink-0 h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                            <svg viewBox="0 0 8 8" fill="white" className="h-2 w-2"><polygon points="2,1 6,4 2,7"/></svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-white/10 mt-4 relative z-10 text-[10px] text-white/40 flex justify-between items-center shrink-0">
          <span>All rights reserved @Mayzax</span>
          <span className="font-mono">2026</span>
        </div>
      </div>

      {/* Right Content Column - Active Form */}
      <div className="lg:w-[65%] xl:w-[70%] w-full bg-white dark:bg-slate-900 overflow-y-auto lg:h-screen p-6 sm:p-10 md:p-12 flex flex-col justify-between relative">
        {/* Decorative shapes */}
        <div className="absolute top-1/4 right-0 w-32 h-64 bg-slate-100/40 dark:bg-slate-800/10 rounded-l-full pointer-events-none border border-slate-200/20 dark:border-slate-800/10 border-r-0" />
        <div className="absolute bottom-12 right-12 w-24 h-24 rounded-full border border-slate-100 dark:border-slate-800/30 pointer-events-none" />

              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header bar within Content */}
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/20 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                      Step {currentStep + 1} <span className="text-indigo-400 dark:text-indigo-600">/ {STEPS.length}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 gap-1.5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm"
                    onClick={() => navigate('/client-login')}
                  >
                    <LogIn className="h-3.5 w-3.5" /> Back to Login
                  </Button>
                </div>

                {/* Animated progress bar */}
                <div className="mb-5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-mayzax-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(((currentStep + 1) / STEPS.length) * 100)}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                {/* Uniform step headers */}
                {currentStep < 10 && (
                  <div className="mb-6 border-l-4 border-indigo-500 pl-4 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="h-5 w-5 text-indigo-500 shrink-0" />; })()}
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{STEP_HEADERS[currentStep].title}</h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{STEP_HEADERS[currentStep].desc}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between">
                  <div className="flex-grow">
                    <AnimatePresence mode="wait">
                      {/* Step 1: Personal Info */}
                      {currentStep === 0 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Full Name *</Label>
                              <Input placeholder="e.g. John Doe" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register('fullName')} />
                              {errors.fullName && <p className="text-xs text-rose-500">{errors.fullName.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address *</Label>
                              <Input type="email" placeholder="john@example.com" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register('email')} />
                              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Phone Number *</Label>
                              <Input placeholder="+1 940-843-1358" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register('phone')} />
                              {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Gender *</Label>
                              <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" {...register('gender')}>
                                <option value="">Select gender...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Non-binary">Non-binary</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                              </select>
                              {errors.gender && <p className="text-xs text-rose-500">{errors.gender.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                Date of Birth *
                              </Label>
                              <div className="relative">
                                <input
                                  type="date"
                                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                                  className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                  onChange={(e) => {
                                    const raw = e.target.value; // YYYY-MM-DD
                                    if (raw) {
                                      const [Y, M, D] = raw.split('-');
                                      setValue('dateOfBirth', `${D}/${M}/${Y}`, { shouldValidate: true });
                                    } else {
                                      setValue('dateOfBirth', '', { shouldValidate: true });
                                    }
                                  }}
                                />
                              </div>
                              {errors.dateOfBirth && <p className="text-xs text-rose-500">{errors.dateOfBirth.message}</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Educational Details */}
                      {currentStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="flex justify-end pb-1">
                            <Button type="button" variant="outline" size="sm" className="rounded-full border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" onClick={() => appendEdu({ qualification: '', fieldOfStudy: '', specialization: '', instituteName: '', honors: '', startDate: '', endDate: '', currentlyOngoing: false })}>
                              <Plus className="h-4 w-4 mr-1" />Add Education Block
                            </Button>
                          </div>

                          {eduFields.map((field, idx) => {
                            const isOngoing = watch(`education.${idx}.currentlyOngoing`);
                            return (
                            <div key={field.id} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 space-y-4">
                              {/* Block header */}
                              <div className="flex justify-between items-center">
                                <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">Block #{idx + 1}</Badge>
                                {eduFields.length > 1 && (
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-full" onClick={() => removeEdu(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Row 1: Qualification + Field of Study */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Qualification *</Label>
                                  <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" {...register(`education.${idx}.qualification`)}>
                                    <option value="">Select qualification...</option>
                                    <option value="High School Diploma">High School Diploma</option>
                                    <option value="Associate Degree">Associate Degree (A.S. / A.A.)</option>
                                    <option value="Bachelor's Degree">Bachelor's Degree (B.S. / B.A. / B.E.)</option>
                                    <option value="Post Graduate Diploma">Post Graduate Diploma (PGD)</option>
                                    <option value="Master's Degree">Master's Degree (M.S. / M.A. / M.E. / MBA)</option>
                                    <option value="M.Phil">M.Phil</option>
                                    <option value="PhD">Doctor of Philosophy (PhD)</option>
                                    <option value="Doctorate">Professional Doctorate (DBA / EdD / MD / JD)</option>
                                    <option value="Post-Doctoral">Post-Doctoral Research</option>
                                    <option value="Certificate">Professional Certificate</option>
                                    <option value="Diploma">Diploma</option>
                                  </select>
                                  {errors.education?.[idx]?.qualification && <p className="text-xs text-rose-500">{(errors.education[idx] as any).qualification?.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Field of Study *</Label>
                                  <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" {...register(`education.${idx}.fieldOfStudy`)}>
                                    <option value="">Select field...</option>
                                    <option value="Engineering">Engineering & Technology</option>
                                    <option value="Computer Science">Computer Science & IT</option>
                                    <option value="Natural Sciences">Natural Sciences (Physics, Chemistry, Biology)</option>
                                    <option value="Mathematics">Mathematics & Statistics</option>
                                    <option value="Business">Business & Management</option>
                                    <option value="Finance & Economics">Finance & Economics</option>
                                    <option value="Medicine & Health">Medicine & Health Sciences</option>
                                    <option value="Law">Law & Legal Studies</option>
                                    <option value="Arts & Humanities">Arts & Humanities</option>
                                    <option value="Social Sciences">Social Sciences</option>
                                    <option value="Education">Education & Teaching</option>
                                    <option value="Architecture">Architecture & Urban Planning</option>
                                    <option value="Agriculture">Agriculture & Environmental Sciences</option>
                                    <option value="Other">Other</option>
                                  </select>
                                  {errors.education?.[idx]?.fieldOfStudy && <p className="text-xs text-rose-500">{(errors.education[idx] as any).fieldOfStudy?.message}</p>}
                                </div>
                              </div>

                              {/* Row 2: Specialization + Institute Name */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Specialization *</Label>
                                  <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" {...register(`education.${idx}.specialization`)}>
                                    <option value="">Select specialization...</option>
                                    <optgroup label="Computer Science / IT">
                                      <option value="Computer Science">Computer Science (CS)</option>
                                      <option value="Information Technology">Information Technology (IT)</option>
                                      <option value="Software Engineering">Software Engineering</option>
                                      <option value="Data Science">Data Science & Analytics</option>
                                      <option value="Artificial Intelligence">Artificial Intelligence / ML</option>
                                      <option value="Cybersecurity">Cybersecurity</option>
                                      <option value="Cloud Computing">Cloud Computing & DevOps</option>
                                      <option value="Network Engineering">Network Engineering</option>
                                    </optgroup>
                                    <optgroup label="Engineering">
                                      <option value="Civil Engineering">Civil Engineering</option>
                                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                                      <option value="Electrical Engineering">Electrical Engineering</option>
                                      <option value="Electronics">Electronics & Communication</option>
                                      <option value="Chemical Engineering">Chemical Engineering</option>
                                      <option value="Aerospace">Aerospace Engineering</option>
                                      <option value="Industrial Engineering">Industrial & Systems Engineering</option>
                                    </optgroup>
                                    <optgroup label="Business / Finance">
                                      <option value="Finance">Finance</option>
                                      <option value="Accounting">Accounting</option>
                                      <option value="Marketing">Marketing</option>
                                      <option value="Human Resources">Human Resources (HR)</option>
                                      <option value="Operations Management">Operations Management</option>
                                      <option value="Quantitative Finance">Quantitative Finance</option>
                                    </optgroup>
                                    <optgroup label="Sciences">
                                      <option value="Physics">Physics</option>
                                      <option value="Chemistry">Chemistry</option>
                                      <option value="Biology">Biology / Life Sciences</option>
                                      <option value="Environmental Science">Environmental Science</option>
                                      <option value="Statistics">Statistics</option>
                                      <option value="Applied Mathematics">Applied Mathematics</option>
                                    </optgroup>
                                    <option value="Other">Other / Not Listed</option>
                                  </select>
                                  {errors.education?.[idx]?.specialization && <p className="text-xs text-rose-500">{(errors.education[idx] as any).specialization?.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Institute / University Name *</Label>
                                  <Input placeholder="e.g. University of Texas at Dallas" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`education.${idx}.instituteName`)} />
                                  {errors.education?.[idx]?.instituteName && <p className="text-xs text-rose-500">{(errors.education[idx] as any).instituteName?.message}</p>}
                                </div>
                              </div>

                              {/* Row 3: Honors */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Honors / Distinction (optional)</Label>
                                <Input placeholder="e.g. Summa Cum Laude, Dean's List, Gold Medalist, First Class with Distinction" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`education.${idx}.honors`)} />
                              </div>

                              {/* Row 4: Start Date + End Date + Ongoing */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Start Date *
                                  </Label>
                                  <input
                                    type="date"
                                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                    {...register(`education.${idx}.startDate`)}
                                  />
                                  {errors.education?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.education[idx] as any).startDate?.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End Date
                                    {isOngoing && <span className="ml-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full">Ongoing</span>}
                                  </Label>
                                  <input
                                    type="date"
                                    disabled={isOngoing}
                                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                    {...register(`education.${idx}.endDate`)}
                                  />
                                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer w-fit">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      {...register(`education.${idx}.currentlyOngoing`)}
                                    />
                                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Currently ongoing / not yet graduated</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                          })}
                        </motion.div>
                      )}

                      {/* Step 3: Technical Details */}
                      {currentStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Target Technology *</Label>
                              <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-650 transition animate-none" {...register('technology')}>
                                <option value="" className="text-slate-500">Select Technology Track...</option>
                                <option value="Java Full Stack">Java Full Stack</option>
                                <option value="Python Developer">Python Developer</option>
                                <option value="React/Node Web Developer">React/Node Web Developer</option>
                                <option value="DevOps / Cloud Engineer">DevOps / Cloud Engineer</option>
                                <option value="Salesforce Developer">Salesforce Developer</option>
                                <option value="Data Science / AI Engineer">Data Science / AI Engineer</option>
                                <option value="Business Analyst / PM">Business Analyst / PM</option>
                                <option value="Financial Quantitative Analyst">Financial Quantitative Analyst</option>
                              </select>
                              {errors.technology && <p className="text-xs text-rose-500">{errors.technology.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Skills *</Label>
                              <Textarea rows={4} placeholder="e.g. Xero, Python, React, SQL, Excel Modeling (comma separated)" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 resize-none" {...register('skills')} />
                              {errors.skills && <p className="text-xs text-rose-500">{errors.skills.message}</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4: Visa Status */}
                      {currentStep === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Visa Status *</Label>
                              <select className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-650" {...register('visaStatus')}>
                                <option value="">Select Visa...</option>
                                <option value="Initial OPT">Initial OPT</option>
                                <option value="Stem OPT">Stem OPT</option>
                                <option value="H1B">H1B</option>
                                <option value="CPT">CPT</option>
                                <option value="F1 Student">F1 Student</option>
                                <option value="L1/L2">L1/L2</option>
                                <option value="Green Card / Citizen">Green Card / Citizen</option>
                              </select>
                              {errors.visaStatus && <p className="text-xs text-rose-500">{errors.visaStatus.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                Entry Into the USA (Date)
                              </Label>
                              <input
                                type="date"
                                className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                onChange={(e) => {
                                  const raw = e.target.value; // YYYY-MM-DD
                                  if (raw) {
                                    const [y, m, d] = raw.split('-');
                                    setValue('entryToUS', `${d}/${m}/${y}`, { shouldValidate: true });
                                  } else {
                                    setValue('entryToUS', '', { shouldValidate: true });
                                  }
                                }}
                              />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Location * (City, State, Zip)</Label>
                              <Input placeholder="e.g. Seattle, Washington, USA - 98133" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register('currentLocation')} />
                              {errors.currentLocation && <p className="text-xs text-rose-500">{errors.currentLocation.message}</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 5: Address Details/History */}
                      {currentStep === 4 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="flex justify-end pb-2">
                            {addrFields.length < 5 && (
                              <Button type="button" variant="outline" size="sm" className="rounded-full border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" onClick={() => appendAddr({ state: '', country: '', fromDate: '', toDate: '' })}>
                                <Plus className="h-4 w-4 mr-1" /> Add Address
                              </Button>
                            )}
                          </div>

                          {addrFields.length === 0 ? (
                            <div className="py-8 text-center text-slate-450 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                              <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                              <p className="text-sm font-semibold">No address history added</p>
                              <p className="text-xs text-slate-400 mt-1">If applicable, you can add up to 5 past addresses</p>
                            </div>
                          ) : (
                            addrFields.map((field, idx) => (
                              <div key={field.id} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 relative space-y-4">
                                <div className="flex justify-between items-center">
                                  <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0">Address #{idx + 1}</Badge>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-full" onClick={() => removeAddr(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">State *</Label>
                                    <Input placeholder="e.g. Texas" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`addressHistory.${idx}.state`)} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Country *</Label>
                                    <Input placeholder="e.g. United States" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`addressHistory.${idx}.country`)} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-indigo-500" /> From Date *
                                    </Label>
                                    <input
                                      type="date"
                                      className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                      {...register(`addressHistory.${idx}.fromDate`)}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-indigo-500" /> To Date
                                    </Label>
                                    <input
                                      type="date"
                                      disabled={watch(`addressHistory.${idx}.toDate`) === 'Present'}
                                      className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                      value={watch(`addressHistory.${idx}.toDate`) === 'Present' ? '' : (watch(`addressHistory.${idx}.toDate`) || '')}
                                      onChange={(e) => setValue(`addressHistory.${idx}.toDate`, e.target.value)}
                                    />
                                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer w-fit">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                        checked={watch(`addressHistory.${idx}.toDate`) === 'Present'}
                                        onChange={(e) => {
                                          setValue(`addressHistory.${idx}.toDate`, e.target.checked ? 'Present' : '');
                                        }}
                                      />
                                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Currently residing here</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}

                      {/* Step 6: Experience Details */}
                      {currentStep === 5 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
                              <input type="checkbox" id="hasExperience" className="h-5 w-5 rounded border-slate-250 dark:border-slate-800 text-indigo-650 bg-white dark:bg-slate-955 focus:ring-indigo-600 cursor-pointer animate-none" {...register('hasExperience')} />
                              <label htmlFor="hasExperience" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                I have genuine work experience in this field and want to retain it on my resume
                              </label>
                            </div>

                            {hasExperience && (
                              <div className="space-y-4 animate-fadeIn">
                                <div className="flex justify-end pb-1">
                                  <Button type="button" variant="outline" size="sm" className="rounded-full border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" onClick={() => appendExp({ companyName: '', post: '', startDate: '', endDate: '', currentlyWorking: false, roles: '', achievements: '' })}>
                                    <Plus className="h-4 w-4 mr-1" />Add Experience Block
                                  </Button>
                                </div>

                                {expFields.map((field, idx) => {
                                  const isWorking = watch(`experiences.${idx}.currentlyWorking`);
                                  return (
                                    <div key={field.id} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 space-y-4">
                                      {/* Block header */}
                                      <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">Experience Block #{idx + 1}</Badge>
                                        {expFields.length > 1 && (
                                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-full" onClick={() => removeExp(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>

                                      {/* Row 1: Company Name + Post */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Company Name *</Label>
                                          <Input placeholder="e.g. Google LLC" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955" {...register(`experiences.${idx}.companyName`)} />
                                          {errors.experiences?.[idx]?.companyName && <p className="text-xs text-rose-500">{(errors.experiences[idx] as any).companyName?.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Post / Job Title *</Label>
                                          <Input placeholder="e.g. Senior Software Engineer" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955" {...register(`experiences.${idx}.post`)} />
                                          {errors.experiences?.[idx]?.post && <p className="text-xs text-rose-500">{(errors.experiences[idx] as any).post?.message}</p>}
                                        </div>
                                      </div>

                                      {/* Row 2: Start Date + End Date */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Start Date *
                                          </Label>
                                          <input
                                            type="date"
                                            className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                            {...register(`experiences.${idx}.startDate`)}
                                          />
                                          {errors.experiences?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.experiences[idx] as any).startDate?.message}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End Date
                                            {isWorking && <span className="ml-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full">Present</span>}
                                          </Label>
                                          <input
                                            type="date"
                                            disabled={isWorking}
                                            className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                            value={isWorking ? '' : (watch(`experiences.${idx}.endDate`) || '')}
                                            onChange={(e) => setValue(`experiences.${idx}.endDate`, e.target.value)}
                                          />
                                          <label className="flex items-center gap-2 mt-1.5 cursor-pointer w-fit">
                                            <input
                                              type="checkbox"
                                              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                              checked={isWorking}
                                              onChange={(e) => {
                                                setValue(`experiences.${idx}.currentlyWorking`, e.target.checked);
                                                if (e.target.checked) {
                                                  setValue(`experiences.${idx}.endDate`, 'Present');
                                                } else {
                                                  setValue(`experiences.${idx}.endDate`, '');
                                                }
                                              }}
                                            />
                                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Currently working here</span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Row 3: Roles & Responsibilities */}
                                      <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Roles &amp; Responsibilities *</Label>
                                        <Textarea rows={4} placeholder="Describe your day-to-day duties, technologies used, and core responsibilities..." className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 resize-none" {...register(`experiences.${idx}.roles`)} />
                                        {errors.experiences?.[idx]?.roles && <p className="text-xs text-rose-500">{(errors.experiences[idx] as any).roles?.message}</p>}
                                      </div>

                                      {/* Row 4: Achievements */}
                                      <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Key Achievements (optional)</Label>
                                        <Textarea rows={3} placeholder="Describe any awards, project completions, metric improvements, or special achievements..." className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 resize-none" {...register(`experiences.${idx}.achievements`)} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 7: Certifications */}
                      {currentStep === 6 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="flex justify-end pb-1">
                            <Button type="button" variant="outline" size="sm" className="rounded-full border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20" onClick={() => appendCert({ name: '', startDate: '', endDate: '', credentialId: '' })}>
                              <Plus className="h-4 w-4 mr-1" />Add Certification
                            </Button>
                          </div>

                          {certFields.length === 0 ? (
                            <div className="py-8 text-center text-slate-450 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-950/20">
                              <Shield className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                              <p className="text-sm font-semibold">No certifications added</p>
                              <p className="text-xs text-slate-400 mt-1">This step is optional. Click "Add Certification" if you have any.</p>
                            </div>
                          ) : (
                            certFields.map((field, idx) => (
                              <div key={field.id} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-955/40 border border-slate-150 dark:border-slate-800 space-y-4">
                                {/* Block Header */}
                                <div className="flex justify-between items-center">
                                  <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50">Certification #{idx + 1}</Badge>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-full" onClick={() => removeCert(idx)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                              {/* Certification Name */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Certification / Course Name *</Label>
                                <Input placeholder="e.g. AWS Certified Solutions Architect - Associate" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`certificationBlocks.${idx}.name`)} />
                                {errors.certificationBlocks?.[idx]?.name && <p className="text-xs text-rose-500">{(errors.certificationBlocks[idx] as any).name?.message}</p>}
                              </div>

                              {/* Dates row */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Start / Issue Date *
                                  </Label>
                                  <input
                                    type="date"
                                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                    {...register(`certificationBlocks.${idx}.startDate`)}
                                  />
                                  {errors.certificationBlocks?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.certificationBlocks[idx] as any).startDate?.message}</p>}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End / Expiration Date (if applicable)
                                  </Label>
                                  <input
                                    type="date"
                                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
                                    {...register(`certificationBlocks.${idx}.endDate`)}
                                  />
                                </div>
                              </div>

                              {/* Credential ID / Link */}
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Credential ID / Verification URL</Label>
                                <Input placeholder="e.g. https://www.credly.com/earner/earned/badge/..." className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" {...register(`certificationBlocks.${idx}.credentialId`)} />
                              </div>
                            </div>
                          ))
                        )}
                        </motion.div>
                      )}

                      {/* Step 8: Resume Upload */}
                      {currentStep === 7 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-950/30 text-center relative group hover:border-indigo-500/50 transition">
                            <input type="file" accept=".pdf,.docx,.doc" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                            <div className="h-14 w-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition duration-300">
                              <Upload className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Drag & drop your resume file here</p>
                            <p className="text-xs text-slate-450 mt-1">Accepts PDF, DOCX or DOC formats (Max 10MB)</p>
                            
                            {uploadMutation.isPending && (
                              <div className="mt-4 flex items-center gap-2 text-xs text-indigo-650 dark:text-indigo-400">
                                <Loader2 className="h-4 w-4 animate-spin" /> Uploading resume...
                              </div>
                            )}

                            {uploadedResume && (
                              <div className="mt-5 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-full text-emerald-650 dark:text-emerald-450 text-xs font-semibold">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span>Uploaded: {uploadedResume.fileName}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 9: Self Declaration */}
                      {currentStep === 8 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div className="space-y-4 text-slate-600 dark:text-slate-350 text-xs leading-relaxed max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl">
                            <p className="font-bold text-slate-800 dark:text-slate-200">Please read and confirm the following terms:</p>
                            <p>1. I declare that the details and information provided by me in this onboarding checklist are true, complete and accurate to the best of my knowledge.</p>
                            <p>2. I understand that the creation of my resume and candidate profile will be based entirely on the information provided herein, and any inaccurate/misleading information may impact my job search placement results.</p>
                            <p>3. I acknowledge that document verification will take approximately 24 hours, after which my profile in the CMS will be generated upon approval by the Administration team.</p>
                            <p>4. I authorize Mayzax and its assigned recruitment team leaders/recruiters to represent my profile and submit job applications on my behalf in accordance with the marketing plan I select.</p>
                          </div>

                          <div className="flex items-start gap-3 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl">
                            <input type="checkbox" id="declared" className="mt-1 h-5 w-5 rounded border-slate-250 dark:border-slate-800 text-indigo-650 bg-white dark:bg-slate-950 focus:ring-indigo-600 cursor-pointer animate-none" {...register('declared')} />
                            <label htmlFor="declared" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                              I hereby declare and agree to the terms and conditions outlined above. *
                            </label>
                          </div>
                          {errors.declared && <p className="text-xs text-rose-500">{errors.declared.message}</p>}
                        </motion.div>
                      )}

                      {/* Step 10: Mock Payment Checkout */}
                      {currentStep === 9 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PLANS.map((plan, planIdx) => (
                              <div key={plan.name} className={`cursor-pointer rounded-2xl border overflow-hidden transition-all duration-200 ${
                                selectedPlan === plan.name
                                  ? 'border-indigo-500 shadow-xl shadow-indigo-100/60 dark:shadow-indigo-900/20 scale-[1.02]'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                              }`} onClick={() => handlePlanSelect(plan)}>
                                <div className={`h-1 w-full ${planIdx === 0 ? 'bg-gradient-to-r from-slate-400 to-slate-500' : planIdx === 1 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600'}`} />
                                <div className={`p-4 ${selectedPlan === plan.name ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-white dark:bg-slate-950'}`}>
                                  <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{plan.name}</h3>
                                    {selectedPlan === plan.name && <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />}
                                  </div>
                                  <p className="text-2xl font-black mt-2 text-indigo-600 dark:text-indigo-400">${plan.price}<span className="text-xs font-normal text-slate-400">/one-time</span></p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{plan.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Selected Plan</Label>
                              <Input readOnly className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400" value={selectedPlan} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Plan Amount ($) *</Label>
                              <Input type="number" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955" {...register('amountPaid', { valueAsNumber: true })} />
                              {errors.amountPaid && <p className="text-xs text-rose-500">{errors.amountPaid.message}</p>}
                            </div>
                            <div className="col-span-2 space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-indigo-500" /> Mock Payment Transaction ID / Reference Code *
                              </Label>
                              <Input placeholder="e.g. TXN-9847294829" className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 font-mono" {...register('paymentRef')} />
                              {errors.paymentRef && <p className="text-xs text-rose-500">{errors.paymentRef.message}</p>}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 11: Printable Confirmation Receipt */}
                      {currentStep === 10 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                          <div className="text-center space-y-2">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2 animate-none">
                              <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Onboarding Registration Complete!</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-450">Your documents will be verified by our administrative team within 24 hours.</p>
                          </div>

                          {/* Receipt Document */}
                          <div id="payment-receipt" className="relative bg-white text-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 overflow-hidden font-sans">
                            {/* Company Logo Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none rotate-12">
                              <span className="text-8xl font-black tracking-widest text-slate-800">MAYZAX</span>
                            </div>

                            {/* Receipt Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-6 w-6 rounded-lg bg-indigo-650 text-white font-extrabold flex items-center justify-center text-xs">M</span>
                                  <span className="text-lg font-black tracking-wider text-slate-900">MAYZAX</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Mayzax Talent & Operations Management</p>
                                <p className="text-[10px] text-slate-500">Aubrey, Texas, USA</p>
                              </div>
                              <div className="text-right">
                                <span className="inline-block px-3 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">PAYMENT COMPLETED</span>
                                <p className="text-xs font-mono font-bold text-slate-600 mt-2">Receipt: MZ-{createdId?.slice(0, 8).toUpperCase() || 'RECEIPT'}</p>
                              </div>
                            </div>

                            {/* Receipt Details */}
                            <div className="py-5 grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Bill To</p>
                                <p className="font-bold text-slate-800 mt-1">{fullName}</p>
                                <p className="text-slate-500">{email}</p>
                                <p className="text-slate-500">{phone}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Transaction Info</p>
                                <p className="font-bold text-slate-800 mt-1">Reference: <span className="font-mono">{paymentRef}</span></p>
                                <p className="text-slate-500">Paid: ${amountPaid}.00</p>
                                <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
                              </div>
                            </div>

                            {/* Item Table */}
                            <div className="border-t border-b border-slate-100 py-3 mt-2">
                              <div className="grid grid-cols-3 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                                <span>Description</span>
                                <span className="text-center">Plan</span>
                                <span className="text-right">Total</span>
                              </div>
                              <div className="grid grid-cols-3 text-xs text-slate-800 font-bold mt-2">
                                <span>Onboarding & Profile Setup Fee</span>
                                <span className="text-center text-slate-600">{selectedPlan}</span>
                                <span className="text-right text-indigo-750">${amountPaid}.00</span>
                              </div>
                            </div>

                            {/* Receipt Footer */}
                            <div className="pt-5 text-center text-[10px] text-slate-400">
                              <p>Thank you for choosing Mayzax. A confirmation email has been sent.</p>
                              <p className="mt-0.5">Please allow 24 hours for administrative document verification.</p>
                            </div>
                          </div>

                          <div className="flex justify-center gap-3">
                            <Button type="button" variant="outline" className="rounded-full gap-1.5" onClick={handlePrint}>
                              <Download className="h-4 w-4" /> Download Receipt
                            </Button>
                            <Button type="button" variant="brand" className="rounded-full gap-1.5 bg-mayzax-gradient border-0 text-white" onClick={() => window.location.href = '/'}>
                              <Sparkles className="h-3.5 w-3.5" /> Submit
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Navigation Action Buttons */}
                  {currentStep < 10 && (
                    <div className="flex justify-between items-center mt-8 border-t border-slate-100 dark:border-slate-800 pt-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 gap-1.5 transition-all"
                        disabled={currentStep === 0}
                        onClick={handlePrev}
                      >
                        ← Back
                      </Button>
                      
                      {currentStep < 9 ? (
                        <Button
                          type="button"
                          variant="brand"
                          className="rounded-full bg-mayzax-gradient border-0 text-white gap-1.5 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                          onClick={handleNext}
                        >
                          Continue <span className="opacity-70">→</span>
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="brand"
                          disabled={createMutation.isPending}
                          className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 text-white gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-bold"
                        >
                          {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                          <CheckCircle2 className="h-4 w-4" />
                          Submit & Complete
                        </Button>
                      )}
                    </div>
                  )}
                </form>
              </div>
      </div>
    </div>
  );
}
