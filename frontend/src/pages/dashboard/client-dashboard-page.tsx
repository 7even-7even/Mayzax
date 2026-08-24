import { useState, useEffect } from 'react';
import { useApplications, useClientStats } from '@/hooks/use-applications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuth } from '@/context/auth-context';
import { formatDateTime } from '@/lib/utils';
import { getCurrentBusinessDate } from '@/lib/businessDate';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Briefcase, Clock, Award, Zap, Calendar, FileText, User, Settings,
  ShieldCheck, Mail, Phone, Upload, CheckCircle2, ChevronLeft, ChevronRight,
  LogOut, Sparkles, MessageSquare, ArrowRight, Loader2, Key, HelpCircle, CreditCard, ShieldAlert, Download, Plus, Trash2, RefreshCw
} from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ClientDashboardPage() {
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLinkConfirmOpen, setIsLinkConfirmOpen] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'interviews' | 'applications' | 'profile' | 'payments' | 'updates'>('overview');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const clientProfile = user?.clientProfile;

  const [educationList, setEducationList] = useState<any[]>([]);
  const [addressHistoryList, setAddressHistoryList] = useState<any[]>([]);

  useEffect(() => {
    if (clientProfile) {
      setEducationList(clientProfile.education || []);
      setAddressHistoryList(clientProfile.addressHistory || []);
    }
  }, [clientProfile]);

  const addEducation = () => {
    setEducationList([
      ...educationList,
      { qualification: "Bachelor's Degree", fieldOfStudy: "Computer Science", specialization: '', instituteName: '', honors: '', startDate: '', endDate: '', currentlyOngoing: false }
    ]);
  };

  const removeEducation = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: string, value: any) => {
    setEducationList(educationList.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addAddress = () => {
    setAddressHistoryList([
      ...addressHistoryList,
      { state: '', country: '', fromDate: '', toDate: '' }
    ]);
  };

  const removeAddress = (index: number) => {
    setAddressHistoryList(addressHistoryList.filter((_, i) => i !== index));
  };

  const updateAddress = (index: number, field: string, value: any) => {
    setAddressHistoryList(addressHistoryList.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const fetchPendingRequest = async () => {
    if (!clientProfile?.id) return;
    try {
      const { data } = await apiClient.get(`/profile-changes/my-profile/${clientProfile.id}/pending`);
      setPendingRequest(data.data);
    } catch (err) {
      console.error('Error fetching pending request', err);
    }
  };

  const fetchPayments = async () => {
    if (!clientProfile?.id) return;
    setIsLoadingPayments(true);
    try {
      const { data } = await apiClient.get(`/profiles/${clientProfile.id}/payment-history`);
      setPaymentsList(data.data || []);
    } catch (err) {
      console.error('Error fetching payments', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchPendingRequest();
  }, [clientProfile?.id]);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab, clientProfile?.id]);

  const [interviewsList, setInterviewsList] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false);

  const fetchInterviews = async () => {
    if (!clientProfile?.id) return;
    setIsLoadingInterviews(true);
    try {
      const { data } = await apiClient.get(`/profiles/${clientProfile.id}/interviews`);
      setInterviewsList(data.data || []);
    } catch (err) {
      console.error('Error fetching interviews', err);
    } finally {
      setIsLoadingInterviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'interviews') {
      fetchInterviews();
    }
  }, [activeTab, clientProfile?.id]);

  // Helper to convert DD/MM/YYYY (stored in DB) to YYYY-MM-DD (expected by input type="date")
  const toInputDate = (ddmmyyyy?: string | null) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) return ddmmyyyy;
    const [D, M, Y] = parts;
    return `${Y}-${M.padStart(2, '0')}-${D.padStart(2, '0')}`;
  };

  // Helper to convert YYYY-MM-DD back to DD/MM/YYYY for DB
  const toDbDate = (yyyymmdd?: string | null) => {
    if (!yyyymmdd) return null;
    const parts = yyyymmdd.split('-');
    if (parts.length !== 3) return yyyymmdd;
    const [Y, M, D] = parts;
    return `${D}/${M}/${Y}`;
  };

  // Helper to convert entryToUS from DB (which might be DD/MM/YYYY or MM/YYYY or YYYY-MM) to YYYY-MM (expected by input type="month")
  const toInputMonth = (entry?: string | null) => {
    if (!entry) return '';
    if (entry.includes('/')) {
      const parts = entry.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
      } else if (parts.length === 2) {
        return `${parts[1]}-${parts[0].padStart(2, '0')}`;
      }
    }
    return entry;
  };

  // Fetch applications
  const { data: appResponse, isLoading, refetch } = useApplications({
    page,
    pageSize: 10,
    search: searchQuery || undefined,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
  });

  const applications = appResponse?.data ?? [];
  const pagination = appResponse?.pagination;

  // Fetch unified client statistics in a single query
  const { data: stats, refetch: refetchStats } = useClientStats();

  // Manual refresh helper
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchStats()]);
      toast.success('Dashboard metrics refreshed successfully!');
    } catch {
      toast.error('Failed to refresh metrics. Please check connection.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get date strings for the last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Stats rollups mapped from backend-calculated stats endpoint
  const totalApps = stats?.totalApps ?? 0;
  const appsToday = stats?.appsToday ?? 0;
  const inReview = stats?.statuses?.inReview ?? 0;
  const interviewsCount = stats?.statuses?.interviews ?? 0;
  const offersCount = stats?.statuses?.offers ?? 0;

  // Build the trendData matching the last 7 days dates
  const trendData = last7Days.map((date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    // 8 PM IST = UTC 14:30 — reliably within the shift window
    const at8pmIST = new Date(Date.UTC(y, m, d, 14, 30, 0));
    const dateStr = getCurrentBusinessDate(at8pmIST);

    // Look up count in backend-returned trend map
    const match = stats?.trend?.find((t) => t.businessDate === dateStr);
    const count = match ? match.count : 0;

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'narrow' });
    return { day: dayOfWeek, val: count };
  });

  const weekTotal = trendData.reduce((sum, d) => sum + d.val, 0);

  // Fetch client updates
  const [updates, setUpdates] = useState<any[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);

  useEffect(() => {
    if (activeTab === 'updates') {
      setIsLoadingUpdates(true);
      apiClient.get('/updates')
        .then(({ data }) => setUpdates(data.data?.updates ?? []))
        .catch(() => toast.error('Failed to load portal announcements.'))
        .finally(() => setIsLoadingUpdates(false));
    }
  }, [activeTab]);

  // Recruiter info
  const recruiter = clientProfile?.assignedRecruiter;

  // Determine current placement progress step (1 to 4)
  // Step 1: Assessment (always done)
  // Step 2: Planning (completed if resume is uploaded)
  // Step 3: Training (in progress/done if applications are submitted)
  // Step 4: Placement (when active interviews or offers exist)
  let currentStep = 1;
  if (clientProfile?.resumeUrl) currentStep = 2;
  if (totalApps > 0) currentStep = 3;
  if (interviewsCount > 0 || offersCount > 0) currentStep = 4;

  const stepNames = [
    { name: 'Onboarding', desc: 'Provide your information for your profile.' },
    { name: 'Resume Building', desc: 'Tailor your resume for the best opportunities.' },
    { name: 'Applications', desc: 'Apply for jobs and track your progress.' },
    { name: 'Assesments & Interview', desc: 'Get ready for your interviews.' },
    { name: 'Offers', desc: 'Connect with opportunities and secure your dream job.' }
  ];

  if (clientProfile?.paymentBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-rose-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-[60px] pointer-events-none" />

          <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight">Account Disabled</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your account has been disabled due to Payment Not Received.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl text-xs text-slate-500 text-left space-y-1.5">
            <p className="font-bold text-slate-400">Next Steps:</p>
            <p>1. Ensure your installment payments are up to date.</p>
            <p>2. Contact your Recruiter or Admin for verification and reactivation.</p>
          </div>

          <Button
            onClick={logout}
            variant="outline"
            className="w-full rounded-full border-slate-800 hover:bg-slate-800 text-white font-bold"
          >
            Log Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-955 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">

      {/* 1. TOP PORTAL HEADER */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src={mayzaxLogo} alt="Mayzax Solutions" className="h-8 w-8 rounded-lg bg-white p-1 shadow-md ring-1 ring-slate-200 dark:ring-slate-800" />
          <div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">MAYZAX SOLUTIONS</span>
            <span className="ml-1.5 text-xs font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Candidate Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">{clientProfile?.planSelected ? `${clientProfile.planSelected} Tier` : 'BASIC TIER'}</p>
          </div>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-black shadow-sm ring-2 ring-indigo-500/20 hover:scale-105 transition-transform duration-200"
            title="View Profile Info"
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </button>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition duration-200"
            title="Log out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* 2. BLUE GRADIENT BANNER WITH INTEGRATED TABS */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white pt-10 pb-0 px-6 sm:px-12 md:px-16 relative overflow-hidden shadow-inner">
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 h-[350px] w-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 tracking-[0.2em] uppercase">Welcome Back</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Hello {user?.name?.split(' ')[0]}.</h1>
            <p className="text-sm sm:text-base text-slate-300">Here is your placement progress.</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              You are currently in <span className="text-emerald-400 font-bold">step {currentStep} of 4</span> — keep going!
            </p>
          </div>

          {/* TAB ITEMS LAYOUT */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-4">
            {([
              { id: 'overview', label: 'Overview', icon: Zap },
              // { id: 'resumes', label: 'My Resumes', icon: FileText },
              { id: 'interviews', label: 'Interviews', icon: Calendar },
              { id: 'applications', label: 'Applications', icon: Briefcase },
              // { id: 'payments', label: 'Payment History', icon: CreditCard },
              { id: 'updates', label: 'Updates', icon: MessageSquare },
              { id: 'profile', label: 'Profile Settings', icon: User },
            ] as const).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 rounded-t-2xl px-5 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap border-b-2 ${activeTab === t.id
                    ? 'bg-[#f8fafc] text-black dark:bg-slate-950 text-indigo-750 dark:text-white border-indigo-500 font-extrabold shadow-sm'
                    : 'text-slate-300 hover:text-white border-transparent hover:bg-white/5'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${activeTab === t.id ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CORE CONTENT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Action Row */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">Overview Dashboard</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 text-xs font-bold rounded-lg border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshed...' : 'Refresh Stats'}
              </Button>
            </div>

            {/* Placement Progress Stepper Card */}
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Placement Progress</CardTitle>
                  <CardDescription className="text-xs">Follow your journey into your next professional milestone</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Stepper Steps Row */}
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
                  {/* Step Connector Line */}
                  <div className="absolute left-[15px] top-0 bottom-0 md:left-0 md:right-0 md:top-[15px] md:h-[3px] bg-slate-100 dark:bg-slate-800 pointer-events-none" />

                  {stepNames.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep > stepNum;
                    const isActive = currentStep === stepNum;
                    return (
                      <div key={idx} className="relative flex md:flex-col items-center gap-4 md:gap-2 z-10 md:flex-1 text-left md:text-center group">
                        <div className={`h-8.5 w-8.5 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${isCompleted
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : isActive
                            ? 'bg-white dark:bg-slate-900 border-indigo-500 text-indigo-600 ring-4 ring-indigo-500/20'
                            : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}>
                          {isCompleted ? <CheckCircle2 className="h-4.5 w-4.5" /> : stepNum}
                        </div>
                        <div className="flex flex-col md:items-center md:px-2">
                          <h4 className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {step.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] leading-relaxed hidden md:block">
                            {step.desc}
                          </p>
                          {isActive && (
                            <span className="inline-block md:mt-2 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
                              In Progress
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stepper Alert/Shortcut */}
                {!clientProfile?.resumeUrl && (
                  <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-650 dark:text-amber-400 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-650"><FileText className="h-4 w-4" /></div>
                      <div>
                        <p className="font-bold">No resume on file</p>
                        <p className="opacity-90">Please upload your latest resume so we can keep your career plan current.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('resumes')} className="border-amber-500/30 text-amber-650 hover:bg-amber-500/10 rounded-full h-8">
                      Upload Resume <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
                {clientProfile?.resumeUrl && (
                  <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-650 dark:text-emerald-455 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-650"><CheckCircle2 className="h-4 w-4" /></div>
                      <div>
                        <p className="font-bold">Resume verified</p>
                        <p className="opacity-90">Your profile resume is updated and active in marketing pipeline.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('resumes')} className="border-emerald-500/30 text-emerald-650 hover:bg-emerald-500/10 rounded-full h-8">
                      View Resume
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications & 7-Day Trend Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Applications Card */}
              <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-mayzax-blue-50 dark:bg-mayzax-blue-950/20 text-mayzax-blue-600 flex items-center justify-center">
                    <Briefcase className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Applications Today</CardTitle>
                    <CardDescription className="text-xs">Submissions performed on your behalf</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center items-start space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                      {appsToday}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    Applications submitted on your behalf today. Marketing tier is set to <span className="font-bold text-indigo-600 dark:text-indigo-400">{clientProfile?.planSelected || 'Gold Plan'}</span>.
                  </p>
                </CardContent>
              </Card>

              {/* Total Applications Card */}
              <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Total Applications</CardTitle>
                    <CardDescription className="text-xs">Cumulative submissions since onboarded</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col justify-center items-start space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                      {totalApps}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      All Time
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                    Total job applications submitted on your behalf since your profile was created.
                  </p>
                </CardContent>
              </Card>

              {/* 7-Day Trend Chart Card */}
              <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-650 flex items-center justify-center">
                    <Zap className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">7-day Trend</CardTitle>
                    <CardDescription className="text-xs">Weekly submission velocity logs</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Trend chart bars */}
                  <div className="h-28 flex items-end justify-between gap-2.5 pt-4 px-2">
                    {trendData.map((d, i) => {
                      // Find max value in trendData to scale graph, defaulting to 10 to avoid divide-by-zero
                      const maxVal = Math.max(...trendData.map((td) => td.val), 10);
                      const pct = Math.min((d.val / maxVal) * 100, 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-24 flex items-end relative overflow-hidden">
                            <div
                              style={{ height: `${pct}%` }}
                              className="w-full bg-gradient-to-t from-emerald-500 to-indigo-500 rounded-t-lg group-hover:opacity-90 transition-all duration-300"
                            />
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md z-30 pointer-events-none">
                              {d.val}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{d.day}</span>
                          <span className="text-[9px] font-black text-slate-650 dark:text-slate-355">{d.val}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                    <span>WEEK TOTAL</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{weekTotal}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recruiter Card */}
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-955/20 text-violet-650 flex items-center justify-center">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Your Personal Recruiter</CardTitle>
                  <CardDescription className="text-xs">Assigned recruitment officer managing your marketing pipeline</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {recruiter ? (
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
                        {recruiter.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{recruiter.name}</h4>
                        <p className="text-xs text-slate-400">Senior Career Advisor</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`mailto:${recruiter.email}`} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl transition">
                        <Mail className="h-3.5 w-3.5 text-indigo-500" />
                        {recruiter.email}
                      </a>
                      {recruiter.phone && (
                        <a href={`tel:${recruiter.phone}`} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl transition">
                          <Phone className="h-3.5 w-3.5 text-indigo-500" />
                          {recruiter.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-400 text-xs italic">
                    No recruiter has been assigned to your profile yet. An administrative manager will assign one shortly.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MY RESUMES TAB */}
        {activeTab === 'resumes' && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Active Placement Resume</CardTitle>
                  <CardDescription className="text-xs">Review and replace your resume in our active candidate directories</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* PDF Live preview if exists */}
                {clientProfile?.resumeUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-xs">
                      <div className="flex items-center gap-3 text-indigo-750 dark:text-indigo-300">
                        <div className="h-10 w-10 rounded-xl bg-indigo-650 text-white flex items-center justify-center shadow-sm">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold">{clientProfile.resumeFileName || 'Resume'}</p>
                          <p className="text-[10px] opacity-70">Active resume in marketing pipeline</p>
                        </div>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL}/${clientProfile.resumeUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition shadow-sm"
                      >
                        Open / Download
                      </a>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500">
                        LIVE RESUME INLINE PREVIEW
                      </div>
                      <iframe
                        src={`${import.meta.env.VITE_API_URL}/${clientProfile.resumeUrl}`}
                        title="Resume Preview"
                        className="w-full h-[500px] bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                    <Upload className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-semibold">No resume uploaded</p>
                    <p className="text-xs text-slate-455 mt-1">Please drag &amp; drop your resume below to update your profile</p>
                  </div>
                )}

                {/* Upload Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Replace / Update Resume</h3>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-855 hover:border-indigo-500/50 rounded-2xl p-8 text-center relative group transition cursor-pointer bg-slate-50/50 dark:bg-slate-955/20">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const fd = new FormData();
                        fd.append('resume', file);

                        const loadToast = toast.loading('Uploading resume...');
                        try {
                          const uploadRes = await apiClient.post('/onboarding/upload-resume', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });

                          // Save the URL to client profile
                          await apiClient.patch(`/profiles/${clientProfile.id}`, {
                            resumeUrl: uploadRes.data.url,
                            resumeFileName: file.name
                          });

                          toast.dismiss(loadToast);
                          toast.success('Resume updated successfully!');
                          refetch();
                        } catch (err: any) {
                          toast.dismiss(loadToast);
                          toast.error(err?.response?.data?.error?.message || 'Upload failed.');
                        }
                      }}
                    />
                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition duration-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Drag &amp; drop or click to upload</p>
                    <p className="text-[10px] text-slate-400 mt-1">Accepts PDF, DOCX or DOC formats (Max 10MB)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* INTERVIEWS TAB */}
        {activeTab === 'interviews' && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-teal-50 dark:bg-teal-955/20 text-teal-650 flex items-center justify-center">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Interviews &amp; Rounds</CardTitle>
                  <CardDescription className="text-xs">Google-Calendar style scheduler and stage timeline for upcoming round events</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Google Calendar Style Month Grid */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/10">
                  {/* Calendar Header */}
                  <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-sm">
                    <span className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-850 bg-slate-100/40 dark:bg-slate-900/30 text-center text-[10px] font-black tracking-widest text-slate-400 py-1.5">
                    <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                  </div>
                  <div className="grid grid-cols-7 text-[11px] font-bold text-slate-500">
                    {/* Month cells with events */}
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      const dayInterviews = interviewsList.filter((item) => {
                        if (!item.date) return false;
                        const itemDate = new Date(item.date);
                        return itemDate.getDate() === day && itemDate.getMonth() === new Date().getMonth();
                      });
                      return (
                        <div key={i} className="min-h-[75px] border-r border-b border-slate-150 dark:border-slate-850 p-1 flex flex-col justify-between bg-white dark:bg-slate-900 hover:bg-slate-50/60 transition">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${day === new Date().getDate() ? 'bg-indigo-650 text-white font-extrabold' : 'text-slate-400'
                            }`}>{day}</span>

                          <div className="space-y-1">
                            {dayInterviews.map((item, idx) => (
                              <div key={idx} className="bg-emerald-500/10 border-l-2 border-emerald-500 p-1 rounded text-[9px] text-emerald-650 dark:text-emerald-450 leading-tight">
                                <p className="font-extrabold truncate">{item.roundName}</p>
                                <p className="opacity-90 truncate">{item.startTime}</p>
                              </div>
                            ))}
                          </div>
                          <div />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline view */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Stages</h3>
                  <div className="relative border-l border-slate-200 dark:border-slate-800 pl-5 ml-2.5 space-y-5">
                    {isLoadingInterviews ? (
                      <div className="text-xs text-slate-400">Loading scheduled stages...</div>
                    ) : interviewsList.length > 0 ? (
                      interviewsList.map((item: any, idx: number) => {
                        const borderCol = idx % 2 === 0 ? 'border-emerald-500' : 'border-indigo-500';
                        const badgeCol = item.status === 'Completed'
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : item.status === 'Cancelled'
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-indigo-650 bg-indigo-500/10';

                        const btnCol = idx % 2 === 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-650 hover:bg-indigo-755';

                        // Parse readable date
                        const readableDate = item.date ? new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

                        return (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${borderCol} bg-white dark:bg-slate-900`} />
                            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-855 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                              <div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeCol}`}>
                                  {item.status}
                                </span>
                                <h4 className="text-sm font-extrabold text-slate-950 dark:text-white mt-1.5">{item.roundName}</h4>
                                <p className="text-xs text-slate-500 mt-1">Interviewer: <span className="font-semibold">{item.interviewer || 'N/A'}</span> • Mode: <span className="font-semibold">{item.mode || 'N/A'}</span></p>
                                <p className="text-xs text-slate-450 mt-0.5 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-indigo-500" /> {readableDate} • {item.startTime} - {item.endTime} ({item.timezone})
                                </p>
                              </div>
                              {item.meetingLink && (
                                <a href={item.meetingLink} target="_blank" rel="noreferrer" className={`text-xs font-bold text-white px-4 py-2 rounded-xl transition w-fit shadow-sm ${btnCol}`}>
                                  Join Meeting
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-slate-400 py-4">No interviews scheduled yet.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center">
                    <Briefcase className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Marketing Log &amp; Submissions</CardTitle>
                    <CardDescription className="text-xs">Monitor the real-time application pipelines run by your career advisors</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search company or title..."
                    className="max-w-[220px] h-9 text-xs rounded-xl bg-slate-55 focus:bg-white border-slate-200"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                  <Button size="sm" onClick={() => refetch()} className="rounded-xl h-9 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 border-0">Refresh</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6"><TableSkeleton cols={5} rows={5} /></div>
                ) : applications.length === 0 ? (
                  <div className="py-12"><EmptyState title="No applications log found" description="We haven't submitted any job applications on your behalf yet." /></div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/60 dark:bg-slate-900">
                          <TableRow>
                            {/* <TableHead className="font-semibold text-xs pl-6">Company</TableHead> */}
                            {/* <TableHead className="font-semibold text-xs">Job Title</TableHead> */}
                            <TableHead className="font-semibold text-xs">Portal</TableHead>
                            <TableHead className="font-semibold text-xs">Date Applied</TableHead>
                            <TableHead className="font-semibold text-xs">Status</TableHead>
                            <TableHead className="font-semibold text-xs pr-6">Job Link</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app) => (
                            <TableRow key={app.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30">
                              {/* <TableCell className="font-bold text-slate-900 dark:text-white pl-6">{app.companyName}</TableCell> */}
                              {/* <TableCell className="text-xs font-semibold">{app.jobTitle}</TableCell> */}
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] tracking-wide font-bold">{formatEnumLabel(app.jobPortal)}</Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">{formatDateTime(app.appliedAt)}</TableCell>
                              <TableCell>
                                <Badge
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${app.status === 'OFFERED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450'
                                    : app.status === 'REJECTED'
                                      ? 'bg-red-50 text-red-750 border-red-250 dark:bg-red-950/20 dark:text-red-400'
                                      : app.status.startsWith('INTERVIEW')
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/20 dark:text-indigo-400'
                                        : 'bg-slate-50 text-slate-655 border-slate-200 dark:bg-slate-800 dark:text-slate-350'
                                    }`}
                                >
                                  {formatEnumLabel(app.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="pr-6">
                                {app.jobLink ? (
                                  <a 
                                    href={app.jobLink}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPendingLink(app.jobLink);
                                      setIsLinkConfirmOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                                  >
                                    View Post
                                  </a>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {pagination && pagination.totalPages > 1 && (
                      <div className="p-4 border-t border-slate-100 dark:border-slate-850">
                        <PaginationControls pagination={pagination} onPageChange={setPage} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            {pendingRequest && (
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-850 dark:text-amber-300">Profile Update Pending Approval</h4>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    You have submitted changes that are awaiting review by an Admin. Until approved, your previous profile details remain live.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Left Column: Personal info form */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Onboarding Profile Vault</CardTitle>
                        <CardDescription className="text-xs">Edit personal data, US Entry metrics and address logs synced with recruitment CMS</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {clientProfile ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (pendingRequest) {
                            toast.error('You already have a pending change request under review.');
                            return;
                          }
                          const fd = new FormData(e.currentTarget);
                          const data = Object.fromEntries(fd.entries());

                          const changesPayload: Record<string, any> = {};
                          const addFieldIfChanged = (key: string, newValue: any, oldValue: any) => {
                            const v1 = newValue === '' ? null : (newValue ?? null);
                            const v2 = oldValue === '' ? null : (oldValue ?? null);
                            if (typeof v1 === 'object' && v1 !== null && typeof v2 === 'object' && v2 !== null) {
                              if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                                changesPayload[key] = v1;
                              }
                            } else if (v1 !== v2) {
                              changesPayload[key] = v1;
                            }
                          };

                          addFieldIfChanged('candidateName', data.candidateName, clientProfile.candidateName);
                          addFieldIfChanged('phone', data.phone, clientProfile.phone);
                          addFieldIfChanged('currentLocation', data.currentLocation, clientProfile.currentLocation);
                          addFieldIfChanged('visaStatus', data.visaStatus, clientProfile.visaStatus);
                          addFieldIfChanged('entryToUS', data.entryToUS || null, clientProfile.entryToUS);
                          addFieldIfChanged('dateOfBirth', toDbDate(data.dateOfBirth as string) || null, clientProfile.dateOfBirth);
                          addFieldIfChanged('gender', data.gender || null, clientProfile.gender);
                          addFieldIfChanged('technology', data.technology, clientProfile.technology);
                          addFieldIfChanged('skills', data.skills || null, clientProfile.skills);
                          addFieldIfChanged('experienceDetails', data.experienceDetails || null, clientProfile.experienceDetails);
                          addFieldIfChanged('certifications', data.certifications || null, clientProfile.certifications);
                          addFieldIfChanged('education', educationList, clientProfile.education);
                          addFieldIfChanged('addressHistory', addressHistoryList, clientProfile.addressHistory);

                          if (Object.keys(changesPayload).length === 0) {
                            toast.error('No changes were made to your profile details.');
                            return;
                          }

                          const loadToast = toast.loading('Submitting profile changes for admin approval...');
                          try {
                            await apiClient.post(`/profile-changes/profiles/${clientProfile.id}`, {
                              changes: changesPayload
                            });
                            toast.dismiss(loadToast);
                            toast.success('Changes submitted successfully for Admin review!');
                            fetchPendingRequest();
                          } catch (err: any) {
                            toast.dismiss(loadToast);
                            toast.error(err?.response?.data?.error?.message || 'Failed to submit changes.');
                          }
                        }}
                        className="space-y-6"
                      >
                        <fieldset disabled={!!pendingRequest} className="space-y-6">
                          {/* Section 1: Personal Profile */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5 border-b pb-1.5">
                              <User className="h-4 w-4 text-indigo-500" /> Personal Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Full Name</Label>
                                <Input name="candidateName" defaultValue={clientProfile.candidateName} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-555 uppercase">Email (Read Only)</Label>
                                <Input readOnly value={clientProfile.email} className="rounded-xl border-slate-200 bg-slate-100/50 text-slate-400 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Phone</Label>
                                <Input name="phone" defaultValue={clientProfile.phone} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Current Location</Label>
                                <Input name="currentLocation" defaultValue={clientProfile.currentLocation ?? ''} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Date of Birth</Label>
                                <Input type="date" name="dateOfBirth" defaultValue={toInputDate(clientProfile.dateOfBirth)} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Gender</Label>
                                <Input name="gender" defaultValue={clientProfile.gender ?? ''} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                            </div>
                          </div>

                          {/* Section 2: Visa & Immigration */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5 border-b pb-1.5">
                              <ShieldCheck className="h-4 w-4 text-indigo-500" /> Immigration Status
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Visa Status</Label>
                                <select name="visaStatus" defaultValue={clientProfile.visaStatus ?? ''} className="flex h-9.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition">
                                  <option value="Initial OPT">Initial OPT</option>
                                  <option value="Stem OPT">Stem OPT</option>
                                  <option value="H1B">H1B</option>
                                  <option value="CPT">CPT</option>
                                  <option value="F1 Student">F1 Student</option>
                                  <option value="L1/L2">L1/L2</option>
                                  <option value="Green Card / Citizen">Green Card / Citizen</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-555 uppercase">US Entry Date</Label>
                                <input type="month" name="entryToUS" defaultValue={toInputMonth(clientProfile.entryToUS)} className="flex h-9.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-3 py-2 text-xs text-slate-800 dark:text-slate-105 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                              </div>
                            </div>
                          </div>

                          {/* Section 3: Professional Experience & Stack */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5 border-b pb-1.5">
                              <Briefcase className="h-4 w-4 text-indigo-500" /> Professional Background
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Target Technology Stack</Label>
                                <Input name="technology" defaultValue={clientProfile.technology} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-550 uppercase">Key Skills (Comma Separated)</Label>
                                <Input name="skills" defaultValue={clientProfile.skills ?? ''} className="rounded-xl border-slate-200 text-xs h-9.5" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-550 uppercase">Professional Experience Details</Label>
                              <Textarea name="experienceDetails" defaultValue={clientProfile.experienceDetails ?? ''} className="rounded-xl border-slate-200 text-xs min-h-[80px]" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-slate-550 uppercase">Certifications &amp; Courses</Label>
                              <Textarea name="certifications" defaultValue={clientProfile.certifications ?? ''} className="rounded-xl border-slate-200 text-xs min-h-[80px]" />
                            </div>
                          </div>
                          {/* Section 4: Academic History */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-1.5">
                              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                                <Award className="h-4 w-4 text-indigo-500" /> Academic Background
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addEducation}
                                className="h-7 text-[10px] font-bold rounded-lg border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Education
                              </Button>
                            </div>
                            
                            {educationList.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">No education entries added. Click above to add one.</p>
                            ) : (
                              <div className="space-y-4">
                                {educationList.map((edu, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3 relative group">
                                    <div className="flex justify-between items-center">
                                      <Badge className="bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-slate-350 text-[10px] font-extrabold uppercase">Education #{idx + 1}</Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeEducation(idx)}
                                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-full"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">Qualification *</Label>
                                        <select
                                          value={edu.qualification || ''}
                                          onChange={(e) => updateEducation(idx, 'qualification', e.target.value)}
                                          className="flex h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
                                        >
                                          <option value="">Select Qualification...</option>
                                          <option value="High School Diploma">High School Diploma</option>
                                          <option value="Associate Degree">Associate Degree</option>
                                          <option value="Bachelor's Degree">Bachelor's Degree</option>
                                          <option value="Post Graduate Diploma">Post Graduate Diploma</option>
                                          <option value="Master's Degree">Master's Degree</option>
                                          <option value="PhD">PhD</option>
                                          <option value="Diploma">Diploma</option>
                                          <option value="Certificate">Certificate</option>
                                        </select>
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">Field of Study *</Label>
                                        <Input
                                          value={edu.fieldOfStudy || ''}
                                          onChange={(e) => updateEducation(idx, 'fieldOfStudy', e.target.value)}
                                          placeholder="e.g. Computer Science"
                                          className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-555 uppercase">Specialization</Label>
                                        <Input
                                          value={edu.specialization || ''}
                                          onChange={(e) => updateEducation(idx, 'specialization', e.target.value)}
                                          placeholder="e.g. Software Engineering"
                                          className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">Institute / University Name *</Label>
                                        <Input
                                          value={edu.instituteName || ''}
                                          onChange={(e) => updateEducation(idx, 'instituteName', e.target.value)}
                                          placeholder="e.g. Stanford University"
                                          className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-bold text-slate-550 uppercase">Honors / Distinction (optional)</Label>
                                      <Input
                                        value={edu.honors || ''}
                                        onChange={(e) => updateEducation(idx, 'honors', e.target.value)}
                                        placeholder="e.g. First Class with Distinction, Gold Medalist"
                                        className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">Start Date *</Label>
                                        <input
                                          type="month"
                                          value={edu.startDate || ''}
                                          onChange={(e) => updateEducation(idx, 'startDate', e.target.value)}
                                          className="flex h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">End Date</Label>
                                        <input
                                          type="month"
                                          disabled={edu.currentlyOngoing}
                                          value={edu.currentlyOngoing ? '' : (edu.endDate || '')}
                                          onChange={(e) => updateEducation(idx, 'endDate', e.target.value)}
                                          className="flex h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        <label className="flex items-center gap-1.5 mt-1 cursor-pointer w-fit">
                                          <input
                                            type="checkbox"
                                            checked={!!edu.currentlyOngoing}
                                            onChange={(e) => updateEducation(idx, 'currentlyOngoing', e.target.checked)}
                                            className="h-3.5 w-3.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                          />
                                          <span className="text-[10px] text-slate-500 font-medium">Currently ongoing / not yet graduated</span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Section 5: Address History */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b pb-1.5">
                              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-indigo-500" /> Physical Address History
                              </h3>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addAddress}
                                className="h-7 text-[10px] font-bold rounded-lg border-indigo-500/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Address
                              </Button>
                            </div>

                            {addressHistoryList.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">No addresses added. Click above to add one.</p>
                            ) : (
                              <div className="space-y-4">
                                {addressHistoryList.map((addr, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-3 relative group">
                                    <div className="flex justify-between items-center">
                                      <Badge className="bg-indigo-50 text-indigo-700 dark:bg-slate-800 dark:text-slate-350 text-[10px] font-extrabold uppercase">Address #{idx + 1}</Badge>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeAddress(idx)}
                                        className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 rounded-full"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">State *</Label>
                                        <Input
                                          value={addr.state || ''}
                                          onChange={(e) => updateAddress(idx, 'state', e.target.value)}
                                          placeholder="e.g. California"
                                          className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-550 uppercase">Country *</Label>
                                        <Input
                                          value={addr.country || ''}
                                          onChange={(e) => updateAddress(idx, 'country', e.target.value)}
                                          placeholder="e.g. United States"
                                          className="rounded-xl border-slate-200 text-xs h-9.5 dark:text-black"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-555 uppercase">From Date *</Label>
                                        <input
                                          type="month"
                                          value={addr.fromDate || ''}
                                          onChange={(e) => updateAddress(idx, 'fromDate', e.target.value)}
                                          className="flex h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-555 uppercase">To Date *</Label>
                                        <input
                                          type="month"
                                          disabled={addr.toDate === 'Present'}
                                          value={addr.toDate === 'Present' ? '' : (addr.toDate || '')}
                                          onChange={(e) => updateAddress(idx, 'toDate', e.target.value)}
                                          className="flex h-9.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:text-black focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        <label className="flex items-center gap-1.5 mt-1 cursor-pointer w-fit">
                                          <input
                                            type="checkbox"
                                            checked={addr.toDate === 'Present'}
                                            onChange={(e) => updateAddress(idx, 'toDate', e.target.checked ? 'Present' : '')}
                                            className="h-3.5 w-3.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                          />
                                          <span className="text-[10px] text-slate-500 font-medium">Currently living here</span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </fieldset>

                        {!pendingRequest && (
                          <div className="flex justify-end pt-2">
                            <Button type="submit" variant="brand" className="rounded-full px-6 font-bold shadow-lg shadow-indigo-500/25">Submit Updates for Approval</Button>
                          </div>
                        )}
                      </form>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs italic">No profile linked to account.</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Billing / Upgrade tier */}
              <div className="space-y-6">
                <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-650 flex items-center justify-center">
                      <Zap className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Active Plan Tier</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Selected Plan</Label>
                      <Input readOnly value={clientProfile?.planSelected ?? 'Basic'} className="rounded-xl border-slate-200 bg-slate-100/50 text-slate-700 dark:text-slate-300 text-xs h-9.5 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Total Amount Paid</Label>
                      <Input readOnly value={`$${clientProfile?.amountPaid ?? 1500}`} className="rounded-xl border-slate-200 bg-slate-100/50 text-slate-700 dark:text-slate-300 text-xs h-9.5 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Reference ID</Label>
                      <Input readOnly value={clientProfile?.paymentRef ?? 'N/A'} className="rounded-xl border-slate-200 bg-slate-100/50 text-slate-500 text-xs h-9.5" />
                    </div>

                    {clientProfile?.planSelected !== 'Premium' && (
                      <Button
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="w-full rounded-full h-10 font-bold text-black bg-indigo-650 hover:bg-indigo-700 hover:text-white text-xs mt-2"
                      >
                        Upgrade Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Upgrade Plan Modal */}
            {clientProfile && (
              <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                  <DialogHeader>
                    <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">Upgrade Marketing Plan</DialogTitle>
                    <DialogDescription className="text-xs text-slate-550 dark:text-slate-400">
                      Request to transition to the next tier of our candidate placement services.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4 space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-955 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Current Tier</p>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{clientProfile.planSelected ?? 'Basic'}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-500 uppercase">Target Upgrade</p>
                        <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          {clientProfile.planSelected === 'Basic' ? 'Gold Plan' : 'Premium Plan'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Upgrading increases application caps:
                      </p>
                      <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside font-medium">
                        {clientProfile.planSelected === 'Basic' ? (
                          <>
                            <li>Gold: 100-150 applications</li>
                            <li>Price: $2,500</li>
                          </>
                        ) : (
                          <>
                            <li>Premium: 150-200 applications</li>
                            <li>Price: $3,500</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsUpgradeModalOpen(false)} className="rounded-full text-xs">
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setIsSubmittingUpgrade(true);
                        try {
                          const target = clientProfile.planSelected === 'Basic' ? 'Gold' : 'Premium';
                          await apiClient.post(`/profile-changes/profiles/${clientProfile.id}/upgrade-plan`, { targetPlan: target });
                          toast.success('Plan upgrade request submitted to admin for approval!');
                          setIsUpgradeModalOpen(false);
                          fetchPendingRequest();
                        } catch (err: any) {
                          toast.error(err?.response?.data?.error?.message || 'Upgrade request failed.');
                        } finally {
                          setIsSubmittingUpgrade(false);
                        }
                      }}
                      disabled={isSubmittingUpgrade}
                      className="rounded-full text-xs bg-indigo-600 hover:bg-indigo-750 text-white font-bold"
                    >
                      {isSubmittingUpgrade ? 'Submitting...' : 'Confirm Upgrade'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Payment & Billing History</CardTitle>
                  <CardDescription className="text-xs">View past invoices and download verified printable receipts</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingPayments ? (
                  <TableSkeleton cols={6} rows={3} />
                ) : paymentsList.length === 0 ? (
                  <EmptyState title="No Payment History" description="We couldn't find any completed payments linked to this profile." />
                ) : (
                  <div className="overflow-hidden border border-slate-150 dark:border-slate-850 rounded-2xl">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Installment</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Status</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Due Date</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Paid Date</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Amount</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase">Reference</TableHead>
                          <TableHead className="text-xs font-bold text-slate-450 uppercase text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsList.map((pay) => (
                          <TableRow key={pay.id}>
                            <TableCell className="text-xs font-bold text-slate-900 dark:text-white">Installment #{pay.installmentNo}</TableCell>
                            <TableCell className="text-xs">
                              {pay.status === 'PAID' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 uppercase text-[9px] font-bold">
                                  Paid
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 gap-1 uppercase text-[9px] font-bold">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {pay.dueDate ? new Date(pay.dueDate).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-550">
                              {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell className="text-xs font-black text-slate-900 dark:text-white">${pay.amount}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-400">{pay.paymentRef || '—'}</TableCell>
                            <TableCell className="text-xs text-right">
                              {pay.status === 'PAID' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.open(`${apiClient.defaults.baseURL}/profiles/${clientProfile?.id}/payment-receipt?ref=${pay.paymentRef}`, '_blank');
                                  }}
                                  className="rounded-full text-[10px] font-bold h-7.5"
                                >
                                  <Download className="mr-1 h-3.5 w-3.5" /> Download
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400 mr-2">Pending</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* UPDATES TAB */}
        {activeTab === 'updates' && (
          <div className="space-y-6 animate-fadeIn">
            <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-row items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 flex items-center justify-center">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Software Updates &amp; Announcements</CardTitle>
                  <CardDescription className="text-xs">Stay informed on platform changes, new integrations and marketing policies</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingUpdates ? (
                  <div className="space-y-4">
                    <div className="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
                    <div className="h-10 bg-slate-100 dark:bg-slate-850 rounded-xl animate-pulse" />
                  </div>
                ) : updates.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic">No portal updates or announcements listed.</div>
                ) : (
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div key={update.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-955/20 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-extrabold text-slate-955 dark:text-white">{update.title}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(update.createdAt).toLocaleDateString()}</span>
                        </div>
                        {update.version && (
                          <span className="inline-block text-[9px] font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            v{update.version}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{update.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Candidate Profile Info Modal */}
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-600 absolute top-0 left-0" />
            
            <DialogHeader className="pt-2">
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-500" />
                Candidate Profile
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                Your registered candidate credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-black shadow-md ring-4 ring-indigo-500/10">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{user?.name}</h4>
                  <p className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">{clientProfile?.planSelected ? `${clientProfile.planSelected} Tier` : 'BASIC TIER'}</p>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mobile Number</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{clientProfile?.phone ?? user?.phone ?? '—'}</p>
                  </div>
                </div>

                {clientProfile?.technology && (
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Technology Focus</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{clientProfile.technology}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                onClick={() => setIsProfileModalOpen(false)}
                className="w-full rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Portal Login Credentials Reminder Modal */}
        <Dialog open={isLinkConfirmOpen} onOpenChange={setIsLinkConfirmOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-600 absolute top-0 left-0" />
            
            <DialogHeader className="pt-2">
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Portal Login Reminder
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Please log in with your updated credentials in the respective portal to verify your application details.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsLinkConfirmOpen(false)}
                className="w-full sm:w-auto rounded-full font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsLinkConfirmOpen(false);
                  window.open(pendingLink, '_blank', 'noopener,noreferrer');
                }}
                className="w-full sm:w-auto rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                Proceed to Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
