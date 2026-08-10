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
  DollarSign, Receipt, Download, Loader2, CreditCard, Sparkles, AlertCircle, LogIn, Eye
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
  technology: z.string().min(1, 'Select a technology stack'),
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
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experiences', idx, 'companyName'], message: 'Company Name is required' });
        }
        if (!exp.post || exp.post.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experiences', idx, 'post'], message: 'Post/Job Title is required' });
        }
        if (!exp.startDate || exp.startDate.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experiences', idx, 'startDate'], message: 'Start Date is required' });
        }
        if (!exp.roles || exp.roles.trim() === '') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experiences', idx, 'roles'], message: 'Roles & responsibilities are required' });
        }
      });
    }
  }
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

// NOTE: order changed — Preview is now the FINAL step (after Receipt)
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
  { name: 'Preview', desc: 'Review all details and documents', icon: Eye }
];

const PLANS = [
  { name: 'Basic Plan', price: 1500, description: 'Basic support (50-100 applications)' },
  { name: 'Gold Plan', price: 2500, description: 'Priority support & coaching (100-150 applications)' },
  { name: 'Premium Plan', price: 3500, description: 'Comprehensive marketing & vendor pipelines (150-200 applications)' }
];

const STEP_HEADERS = [
  { title: "Personal Info", desc: "Tell us a bit about yourself to get started with your candidate profile." },
  { title: "Education Details", desc: "Add your academic qualifications, degree levels, and major study paths." },
  { title: "Technical Stack & Skills", desc: "Select your target stack and list your core programming/software skills." },
  { title: "US Visa & Immigration Status", desc: "Select your current visa status and entry details." },
  { title: "Physical Address History", desc: "Provide details of your US physical addresses (up to 5 entries)." },
  { title: "Professional Work Experience", desc: "If you have prior experience, list details about roles and achievements." },
  { title: "Certifications & Coursework", desc: "List credentials, key awards, or external courses that show your expertise." },
  { title: "Resume & Profile Documents", desc: "Upload your latest resume. Only PDF, DOCX, or DOC formats are supported." },
  { title: "Self-Attestation & Declaration", desc: "Confirm and declare that the information provided is accurate and true." },
  { title: "Preview & Confirm", desc: "Review all provided information and uploaded files before finalizing." }
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
  // Local, auth-free preview URL generated directly from the selected File.
  // This is what we use to PREVIEW the document "right then and there"
  // (instead of the server uploads-folder URL which returns 401/unauthorised).
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFinished, setIsFinished] = useState(false);

  // Revoke the object URL whenever it is replaced, and on unmount, to avoid memory leaks
  useEffect(() => {
    return () => {
      if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
    };
  }, [resumePreviewUrl]);

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
      education: [
        { qualification: '', fieldOfStudy: '', specialization: '', instituteName: '', honors: '', startDate: '', endDate: '', currentlyOngoing: false },
        { qualification: '', fieldOfStudy: '', specialization: '', instituteName: '', honors: '', startDate: '', endDate: '', currentlyOngoing: false }
      ],
      technology: '',
      skills: '',
      visaStatus: '',
      entryToUS: '',
      currentLocation: '',
      addressHistory: [],
      hasExperience: false,
      experiences: [],
      experienceDetails: '',
      certificationBlocks: [],
      certifications: '',
      resumeUrl: '',
      resumeFileName: '',
      declared: false,
      planSelected: 'Basic',
      amountPaid: 0,
      paymentRef: 'MOCK_GATEWAY'
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
  const dateOfBirth = watch('dateOfBirth');
  const entryToUS = watch('entryToUS');
  const gender = watch('gender');
  const technology = watch('technology');
  const skills = watch('skills');
  const visaStatus = watch('visaStatus');
  const currentLocation = watch('currentLocation');
  const declared = watch('declared');
  // Split the comma-separated skills string into individual pills for the preview
  const skillsList = skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [];

  // Convert stored DD/MM/YYYY back to YYYY-MM-DD so the native date inputs stay in sync
  const toInputDate = (ddmmyyyy?: string) => {
    if (!ddmmyyyy) return '';
    const [D, M, Y] = ddmmyyyy.split('/');
    if (!D || !M || !Y) return '';
    return `${Y}-${M}-${D}`;
  };
  const dobInputValue = toInputDate(dateOfBirth);
  const entryInputValue = entryToUS ? (entryToUS.includes('/') ? toInputDate(entryToUS) : entryToUS) : '';

  // Format YYYY-MM or YYYY-MM-DD into "Mon YYYY" for month-only displays
  const formatMonthYear = (val?: string) => {
    if (!val) return '—';
    // Accept both YYYY-MM and YYYY-MM-DD
    const ym = val.split('-').slice(0, 2);
    if (ym.length < 2) return val;
    const [Y, M] = ym;
    try {
      const d = new Date(Number(Y), Number(M) - 1, 1);
      return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
    } catch (_) {
      return val;
    }
  };

  useEffect(() => {
    if (hasExperience) {
      if (expFields.length === 0) {
        appendExp({ companyName: '', post: '', startDate: '', endDate: '', currentlyWorking: false, roles: '', achievements: '' });
      }
    } else {
      if (expFields.length > 0) {
        setValue('experiences', []);
      }
    }
    // only re-run when hasExperience changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasExperience]);

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
    if (currentStep === 8) fieldsToValidate = ['declared'];

    const isValid = await trigger(fieldsToValidate as any);

    if (!isValid) {
      toast.error('Please resolve validation errors before continuing.');
      return;
    }

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
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);

    // Build a LOCAL preview URL straight from the File object — no server/auth needed.
    // (uploadedResume.url from the server stays protected in /uploads and would 401.)
    if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
    setResumePreviewUrl(URL.createObjectURL(file));

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
      toast.success('Onboarding details submitted successfully!');
      setIsFinished(true);
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

  const dateInputClass =
    'flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert';

  if (isFinished) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6">
        <ParticleField />
        <FloatingCube size={120} top="10%" left="10%" variant="blue" duration={12} />
        <FloatingCube size={80} bottom="15%" right="12%" variant="green" duration={10} delay={1} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 text-center shadow-2xl relative z-10 overflow-hidden"
        >
          <div className="h-1.5 w-full bg-mayzax-gradient absolute top-0 left-0" />
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6 animate-none">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            Thank You For Providing Your Data
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed mb-6">
            Our team will verify your onboarding information and contact you back within 24 business hours.
          </p>
          <Button 
            variant="brand" 
            className="w-full rounded-full bg-mayzax-gradient border-0 text-white font-bold h-11 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={() => navigate('/client-login')}
          >
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }

        /* ===== Print-only branded document =====
           The whole app is removed from print flow (display:none -> no space,
           no blank pages), and this dedicated document prints from the TOP of
           the page in normal flow. print-color-adjust forces Mayzax colours to
           actually print (backgrounds are off by default in browsers). */
        #print-document { display: none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #ffffff !important; }
          #onboarding-app { display: none !important; }
          #print-document { display: block !important; }
          #print-document, #print-document * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Keep each section / row intact — never split one across pages.
             If a block won't fit, the whole block moves to the next page. */
          #print-document .keep-together,
          #print-document tr,
          #print-document .row-keep {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #print-document .keep-with-next {
            break-after: avoid;
            page-break-after: avoid;
          }
          #print-document h3 {
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

    <div id="onboarding-app" className="relative flex min-h-screen w-full lg:flex-row flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">

      {/* Left Sidebar Column - Stepper Timeline */}
      <div
        className="relative lg:w-[35%] xl:w-[20%] w-full bg-mayzax-gradient text-slate-100 p-6 lg:py-6 lg:px-5 flex flex-col justify-between overflow-y-auto lg:overflow-y-hidden border-b lg:border-b-0 lg:border-r border-slate-200/10 lg:h-screen shrink-0 scrollbar-none"
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
                <img src={mayzaxLogo} alt="Mayzax Solutions" className="h-9 w-9 rounded-xl bg-white p-2 shadow-lg shadow-black/10 ring-1 ring-white/20" />
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </div>
              <span className="text-xl font-bold tracking-wider text-white/90 uppercase">Mayzax Solutions</span>
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
                    strokeDasharray={2 * Math.PI * 20}
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
                  {currentStep === 0 ? 'Just getting started' : currentStep < 5 ? 'Keep going!' : currentStep < 9 ? 'Almost there...' : currentStep === 11 ? 'Complete!' : 'Final step ahead!'}
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
                    isActive ? 'bg-white/10 shadow-inner' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setCurrentStep(idx)}
                >
                  {/* Connecting Line */}
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
                      ? <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                      <svg viewBox="0 0 8 8" fill="white" className="h-2 w-2"><polygon points="2,1 6,4 2,7" /></svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-white/10 mt-4 relative z-10 text-[10px] text-white/40 flex justify-between items-center shrink-0">
          <span>All rights reserved @Mayzax Solutions </span>
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

          {/* Uniform step headers (only for the data-entry steps) */}
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
                            value={dobInputValue}
                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                            className={dateInputClass}
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
                        {dateOfBirth && <p className="text-[11px] text-slate-400">Saved as {dateOfBirth}</p>}
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
                              <input type="month" className={dateInputClass} {...register(`education.${idx}.startDate`)} />
                              {errors.education?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.education[idx] as any).startDate?.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End Date
                                {isOngoing && <span className="ml-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full">Ongoing</span>}
                              </Label>
                              <input type="month" disabled={isOngoing} className={dateInputClass} {...register(`education.${idx}.endDate`)} />
                              <label className="flex items-center gap-2 mt-1.5 cursor-pointer w-fit">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer" {...register(`education.${idx}.currentlyOngoing`)} />
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
                          type="month"
                          value={entryInputValue}
                          className={dateInputClass}
                          onChange={(e) => {
                            const raw = e.target.value; // YYYY-MM
                            if (raw) {
                              setValue('entryToUS', raw, { shouldValidate: true });
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
                      addrFields.map((field, idx) => {
                        const toDateVal = watch(`addressHistory.${idx}.toDate`);
                        return (
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
                                <input type="month" className={dateInputClass} {...register(`addressHistory.${idx}.fromDate`)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-indigo-500" /> To Date
                                </Label>
                                <input
                                  type="month"
                                  disabled={toDateVal === 'Present'}
                                  className={dateInputClass}
                                  value={toDateVal === 'Present' ? '' : toDateVal || ''}
                                  onChange={(e) => setValue(`addressHistory.${idx}.toDate`, e.target.value, { shouldValidate: true })}
                                />
                                <label className="flex items-center gap-2 mt-1.5 cursor-pointer w-fit">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                                    checked={toDateVal === 'Present'}
                                    onChange={(e) => {
                                      setValue(`addressHistory.${idx}.toDate`, e.target.checked ? 'Present' : '', { shouldValidate: true });
                                    }}
                                  />
                                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Currently residing here</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })
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
                          I already have work experience in this field and want to retain it on my resume
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
                                    <input type="month" className={dateInputClass} {...register(`experiences.${idx}.startDate`)} />
                                    {errors.experiences?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.experiences[idx] as any).startDate?.message}</p>}
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End Date
                                      {isWorking && <span className="ml-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full">Present</span>}
                                    </Label>
                                    <input
                                      type="month"
                                      disabled={isWorking}
                                      className={dateInputClass}
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
                              <input type="month" className={dateInputClass} {...register(`certificationBlocks.${idx}.startDate`)} />
                              {errors.certificationBlocks?.[idx]?.startDate && <p className="text-xs text-rose-500">{(errors.certificationBlocks[idx] as any).startDate?.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> End / Expiration Date (if applicable)
                              </Label>
                              <input type="month" className={dateInputClass} {...register(`certificationBlocks.${idx}.endDate`)} />
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
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Drag &amp; drop your resume file here</p>
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

                    {/* Live, local preview — rendered straight from the File (no server / no auth) */}
                    {resumePreviewUrl && (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-indigo-500" /> Live Preview
                          </span>
                          <button type="button" onClick={() => window.open(resumePreviewUrl, '_blank')} className="text-xs text-indigo-600 dark:text-indigo-400 underline">
                            Open in new tab
                          </button>
                        </div>
                        <iframe src={resumePreviewUrl} title="Resume preview" className="w-full h-[420px] bg-white" />
                        <p className="px-4 py-1.5 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                          PDF files render inline here. DOC/DOCX may need to be opened in a new tab.
                        </p>
                      </div>
                    )}
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
                      <p>4. I authorize Mayzax Solutions and its assigned recruitment team leaders/recruiters to represent my profile and submit job applications on my behalf in accordance with the marketing plan I select.</p>
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

                {/* Step 9: Preview & Confirm (FINAL STEP) */}
                {currentStep === 9 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Preview Your Submission</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-450">Review all provided details, payment, and attached documents below. You can print or save as PDF.</p>
                    </div>

                    <div id="form-preview" className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
                      {/* Personal Information */}
                      <PreviewSection title="Personal Information" icon={User2}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <PreviewField label="Full Name" value={fullName} />
                          <PreviewField label="Gender" value={gender} />
                          <PreviewField label="Date of Birth" value={dateOfBirth} />
                          <PreviewField label="Email" value={email} />
                          <PreviewField label="Phone" value={phone} />
                        </div>
                      </PreviewSection>

                      {/* Education */}
                      <PreviewSection title="Education" icon={GraduationCap}>
                        <div className="space-y-2">
                          {eduFields.map((ed, i) => (
                            <div key={ed.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{watch(`education.${i}.qualification`) || '—'} <span className="text-slate-400 font-normal">in</span> {watch(`education.${i}.fieldOfStudy`) || '—'}</div>
                              <div className="text-xs text-slate-500 mt-1">Specialization: {watch(`education.${i}.specialization`) || '—'}</div>
                              <div className="text-xs text-slate-500">Institute: {watch(`education.${i}.instituteName`) || '—'}</div>
                              <div className="text-xs text-slate-500">{formatMonthYear(watch(`education.${i}.startDate`))} → {watch(`education.${i}.currentlyOngoing`) ? 'Ongoing' : (formatMonthYear(watch(`education.${i}.endDate`)))}{watch(`education.${i}.honors`) ? ` • Honors: ${watch(`education.${i}.honors`)}` : ''}</div>
                            </div>
                          ))}
                        </div>
                      </PreviewSection>
                      
                      {/* Technical Profile */}
                      <PreviewSection title="Technical Profile" icon={Code2}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <PreviewField label="Target Technology" value={technology} />
                        </div>
                        <div className="mt-3">
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">Skills</p>
                          {skillsList.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {skillsList.map((s, i) => (
                                <Badge key={i} variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 font-normal">{s}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </div>
                      </PreviewSection>

                      {/* Visa & Location */}
                      <PreviewSection title="Visa & Location" icon={ShieldCheck}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <PreviewField label="Visa Status" value={visaStatus} />
                          <PreviewField label="Entry to USA" value={formatMonthYear(entryToUS)} />
                          <PreviewField label="Current Location" value={currentLocation} />
                        </div>
                      </PreviewSection>

                      {/* Address History */}
                      <PreviewSection title="Address History" icon={MapPin}>
                        {addrFields.length > 0 ? (
                          <div className="space-y-2">
                            {addrFields.map((a, i) => (
                              <div key={a.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm">
                                <span className="font-semibold">{watch(`addressHistory.${i}.state`) || '—'}, {watch(`addressHistory.${i}.country`) || '—'}</span>
                                <span className="text-slate-500"> — {formatMonthYear(watch(`addressHistory.${i}.fromDate`))} → {watch(`addressHistory.${i}.toDate`) === 'Present' ? 'Present' : formatMonthYear(watch(`addressHistory.${i}.toDate`))}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No address history added.</p>
                        )}
                      </PreviewSection>

                      {/* Experience */}
                      <PreviewSection title="Experience" icon={FileText}>
                        {hasExperience && expFields.length > 0 ? (
                          <div className="space-y-2">
                            {expFields.map((ex, i) => (
                              <div key={ex.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <div className="text-sm font-semibold">{watch(`experiences.${i}.post`) || '—'} <span className="text-slate-400 font-normal">@</span> {watch(`experiences.${i}.companyName`) || '—'}</div>
                                <div className="text-xs text-slate-500">{formatMonthYear(watch(`experiences.${i}.startDate`))} → {watch(`experiences.${i}.currentlyWorking`) ? 'Present' : (formatMonthYear(watch(`experiences.${i}.endDate`)) || '—')}</div>
                                {watch(`experiences.${i}.roles`) ? <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{watch(`experiences.${i}.roles`)}</div> : null}
                                {watch(`experiences.${i}.achievements`) ? <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap"><span className="font-semibold">Achievements:</span> {watch(`experiences.${i}.achievements`)}</div> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No experience provided.</p>
                        )}
                      </PreviewSection>

                      {/* Certifications */}
                      <PreviewSection title="Certifications" icon={Shield}>
                        {certFields.length > 0 ? (
                          <div className="space-y-2">
                            {certFields.map((c, i) => (
                              <div key={c.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                <div className="text-sm font-semibold">{watch(`certificationBlocks.${i}.name`) || '—'}</div>
                                <div className="text-xs text-slate-500">Valid: {formatMonthYear(watch(`certificationBlocks.${i}.startDate`))} → {watch(`certificationBlocks.${i}.endDate`) ? formatMonthYear(watch(`certificationBlocks.${i}.endDate`)) : 'No Expiration'}</div>
                                {watch(`certificationBlocks.${i}.credentialId`) ? <div className="text-xs text-slate-500 break-all">Credential: {watch(`certificationBlocks.${i}.credentialId`)}</div> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">No certifications added.</p>
                        )}
                      </PreviewSection>

                      {/* Uploaded Documents */}
                      <PreviewSection title="Uploaded Documents" icon={Upload}>
                        <div className="space-y-2">
                          {uploadedResume ? (
                            <>
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-indigo-500" /> {uploadedResume.fileName}
                                </span>
                                {resumePreviewUrl && (
                                  <button type="button" onClick={() => window.open(resumePreviewUrl, '_blank')} className="text-xs text-indigo-600 dark:text-indigo-400 underline">
                                    Open in new tab
                                  </button>
                                )}
                              </div>
                              {resumePreviewUrl && (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                  <iframe src={resumePreviewUrl} title="Resume preview" className="w-full h-[420px] bg-white" />
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-slate-400">No documents uploaded</p>
                          )}
                        </div>
                      </PreviewSection>

                      {/* Declaration */}
                      <PreviewSection title="Declaration" icon={CheckCircle2}>
                        <PreviewField label="Self-Declaration" value={declared ? 'Agreed & confirmed' : 'Not agreed'} />
                      </PreviewSection>

                      <div className="flex flex-wrap gap-2 justify-end pt-1">
                        <Button type="button" variant="outline" onClick={() => window.print()}>Print / Save as PDF</Button>
                        <Button type="submit" variant="brand" className="bg-mayzax-gradient border-0 text-white shadow-lg" disabled={createMutation.isPending}>
                          {createMutation.isPending ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
                          ) : (
                            <><Sparkles className="h-3.5 w-3.5" /> Submit Onboarding</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Action Buttons (only for data-entry steps) */}
            {currentStep < 9 && (
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

                <Button
                  type="button"
                  variant="brand"
                  className="rounded-full bg-mayzax-gradient border-0 text-white gap-1.5 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  disabled={createMutation.isPending}
                  onClick={handleNext}
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <>Continue <span className="opacity-70">→</span></>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>

      {/* ============================================================
          PRINT-ONLY BRANDED DOCUMENT
          Hidden on screen (#print-document { display:none }).
          Shown only when printing — clean, Mayzax-branded, starts at
          the top of page 1 (normal flow, app removed from print).
         ============================================================ */}
      <div id="print-document">
        {/* ---------- RECEIPT (step 10) ---------- */}
        {currentStep === 10 && (
          <div className="max-w-[800px] mx-auto text-slate-900 font-sans">
            <div className="rounded-t-2xl px-7 py-6 text-white bg-mayzax-gradient flex items-center justify-between keep-together keep-with-next">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center font-black text-2xl">M</div>
                <div>
                  <div className="text-2xl font-black tracking-wider leading-none">MAYZAX SOLUTIONS</div>
                  {/* <div className="text-[11px] text-white/80 mt-1">Talent &amp; Operations Management</div> */}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">Official Receipt</div>
                <div className="text-sm font-mono font-bold mt-1">MZ-{(createdId?.slice(0, 8) || 'RECEIPT').toUpperCase()}</div>
              </div>
            </div>

            <div className="border border-t-0 border-slate-200 px-7 py-5 keep-together">
              <span className="inline-block px-3 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">PAYMENT COMPLETED</span>
              <div className="grid grid-cols-2 gap-6 mt-5 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bill To</p>
                  <p className="font-bold mt-1">{fullName || '—'}</p>
                  <p className="text-slate-500">{email || '—'}</p>
                  <p className="text-slate-500">{phone || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Transaction</p>
                  <p className="font-bold mt-1">Ref: <span className="font-mono">{paymentRef || '—'}</span></p>
                  <p className="text-slate-500">Amount: ${amountPaid || 0}.00</p>
                  <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="border border-t-0 border-slate-200 keep-together">
              <div className="grid grid-cols-12 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-7 py-2">
                <span className="col-span-6">Description</span>
                <span className="col-span-3 text-center">Plan</span>
                <span className="col-span-3 text-right">Amount</span>
              </div>
              <div className="grid grid-cols-12 text-sm px-7 py-3 items-center border-t border-slate-100 row-keep">
                <span className="col-span-6 font-semibold">Onboarding &amp; Profile Setup Fee</span>
                <span className="col-span-3 text-center text-slate-600">{selectedPlan || '—'}</span>
                <span className="col-span-3 text-right font-bold text-indigo-600">${amountPaid || 0}.00</span>
              </div>
              <div className="grid grid-cols-12 px-7 py-3 border-t border-slate-100 bg-slate-50 row-keep">
                <span className="col-span-9 text-right text-xs font-semibold text-slate-500">Total Paid</span>
                <span className="col-span-3 text-right font-black text-slate-900">${amountPaid || 0}.00</span>
              </div>
            </div>

            <div className="rounded-b-2xl border border-t-0 border-slate-200 px-7 py-5 text-center text-[11px] text-slate-400 keep-together">
              <p className="font-semibold text-slate-500">Thank you for choosing Mayzax Solutions.</p>
              <p className="mt-0.5">A confirmation email has been sent. Please allow 24 hours for document verification.</p>
              <p className="mt-2 text-slate-300">Aubrey, Texas, USA</p>
            </div>
          </div>
        )}

        {/* ---------- FINAL PREVIEW (step 11) ---------- */}
        {currentStep === 11 && (
          <div className="max-w-[800px] mx-auto text-slate-900 font-sans">
            <div className="rounded-t-2xl px-7 py-6 text-white bg-mayzax-gradient flex items-center justify-between keep-together keep-with-next">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center font-black text-2xl">M</div>
                <div>
                  <div className="text-2xl font-black tracking-wider leading-none">MAYZAX SOLUTIONS</div>
                  <div className="text-[11px] text-white/80 mt-1">Candidate Onboarding Summary</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">Submitted</div>
                <div className="text-sm font-mono font-bold mt-1">{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div className="border border-t-0 border-slate-200 px-7 py-6 space-y-5 text-sm">
              <PrintSection title="Personal Information">
                <PrintRow label="Full Name" value={fullName} />
                <PrintRow label="Gender" value={gender} />
                <PrintRow label="Date of Birth" value={dateOfBirth} />
                <PrintRow label="Email" value={email} />
                <PrintRow label="Phone" value={phone} />
              </PrintSection>

              <PrintSection title="Education">
                {eduFields.map((ed, i) => (
                  <div key={ed.id} className="py-1">
                    <div className="font-semibold">Education #{i + 1}: {watch(`education.${i}.qualification`) || '—'} — {watch(`education.${i}.fieldOfStudy`) || '—'}</div>
                    <div className="text-slate-500 text-[13px]">Specialization: {watch(`education.${i}.specialization`) || '—'}</div>
                    <div className="text-slate-500 text-[13px]">Institute: {watch(`education.${i}.instituteName`) || '—'}</div>
                    <div className="text-slate-500 text-[13px]">{formatMonthYear(watch(`education.${i}.startDate`))} to {watch(`education.${i}.currentlyOngoing`) ? 'Ongoing' : (formatMonthYear(watch(`education.${i}.endDate`)))}{watch(`education.${i}.honors`) ? ` - Honors: ${watch(`education.${i}.honors`)}` : ''}</div>
                  </div>
                ))}
              </PrintSection>

              <PrintSection title="Technical Profile">
                <PrintRow label="Target Technology" value={technology} />
                <div className="flex py-1 gap-3">
                  <span className="w-44 text-slate-500 shrink-0">Skills</span>
                  <span className="font-medium flex-1 break-words">{skills ? skills : '—'}</span>
                </div>
              </PrintSection>

                      <PrintSection title="Visa & Location">
                <PrintRow label="Visa Status" value={visaStatus} />
                <PrintRow label="Entry to USA" value={formatMonthYear(entryToUS)} />
                <PrintRow label="Current Location" value={currentLocation} />
              </PrintSection>

              <PrintSection title="Address History">
                {addrFields.length > 0 ? (
                  addrFields.map((a, i) => (
                    <div key={a.id} className="py-1">
                      <span className="font-medium">{watch(`addressHistory.${i}.state`) || '—'}, {watch(`addressHistory.${i}.country`) || '—'}</span>
                      <span className="text-slate-500 text-[13px]"> - {watch(`addressHistory.${i}.fromDate`) || '—'} to {watch(`addressHistory.${i}.toDate`) || '—'}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">No address history added.</div>
                )}
              </PrintSection>

                      <PrintSection title="Experience">
                {hasExperience && expFields.length > 0 ? (
                  expFields.map((ex, i) => (
                    <div key={ex.id} className="py-1">
                      <div className="font-semibold">{watch(`experiences.${i}.post`) || '—'} — {watch(`experiences.${i}.companyName`) || '—'}</div>
                      <div className="text-slate-500 text-[13px]">{formatMonthYear(watch(`experiences.${i}.startDate`))} to {watch(`experiences.${i}.currentlyWorking`) ? 'Present' : (formatMonthYear(watch(`experiences.${i}.endDate`)) || '—')}</div>
                      {watch(`experiences.${i}.roles`) ? <div className="text-slate-600 text-[13px] mt-0.5 whitespace-pre-wrap">{watch(`experiences.${i}.roles`)}</div> : null}
                      {watch(`experiences.${i}.achievements`) ? <div className="text-slate-500 text-[13px] mt-0.5 whitespace-pre-wrap">Achievements: {watch(`experiences.${i}.achievements`)}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">No experience provided.</div>
                )}
              </PrintSection>

              <PrintSection title="Certifications">
                {certFields.length > 0 ? (
                  certFields.map((c, i) => (
                    <div key={c.id} className="py-1">
                      <div className="font-semibold">{watch(`certificationBlocks.${i}.name`) || '—'}</div>
                      <div className="text-slate-500 text-[13px]">Valid: {formatMonthYear(watch(`certificationBlocks.${i}.startDate`))} to {watch(`certificationBlocks.${i}.endDate`) ? formatMonthYear(watch(`certificationBlocks.${i}.endDate`)) : 'No Expiration'}</div>
                      {watch(`certificationBlocks.${i}.credentialId`) ? <div className="text-slate-500 text-[13px] break-all">Credential: {watch(`certificationBlocks.${i}.credentialId`)}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">No certifications added.</div>
                )}
              </PrintSection>

              <PrintSection title="Documents">
                <PrintRow label="Resume" value={uploadedResume?.fileName} />
              </PrintSection>

              <PrintSection title="Declaration">
                <PrintRow label="Self-Declaration" value={declared ? 'Agreed & confirmed' : 'Not agreed'} />
              </PrintSection>
            </div>

            <div className="rounded-b-2xl border border-t-0 border-slate-200 px-7 py-4 text-center text-[11px] text-slate-400 keep-together">
              <p>This is a system-generated summary of your onboarding submission.</p>
              <p className="mt-0.5 text-slate-300">Mayzax Solutions</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Small helpers for the print document ---------- */
function PrintRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex py-1 gap-3">
      <span className="w-44 text-slate-500 shrink-0">{label}</span>
      <span className="font-medium flex-1 break-words">{value ? String(value) : '—'}</span>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="keep-together">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-200 pb-1 mb-2">{title}</h3>
      {children}
    </div>
  );
}

/* ---------- Small helpers for the on-screen preview ---------- */
function PreviewSection({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {Icon ? <Icon className="h-4 w-4 text-indigo-500" /> : null}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      </div>
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 p-3">{children}</div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{value ? String(value) : '—'}</p>
    </div>
  );
}

