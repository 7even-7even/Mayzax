import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileText, Loader2, Plus, X, Sparkles, Building2, ShieldCheck, Users, ClipboardList, Activity, RefreshCw } from 'lucide-react';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { StatusBadge, ALL_STATUSES, ALL_JOB_PORTALS, formatEnumLabel } from '@/components/shared/status-badge';
import { ApplicationFormDialog } from './application-form-dialog';
import { useApplications } from '@/hooks/use-applications';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, generateExportFilename } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';
import { ApiSuccess, ApplicationStatus, JobApplication, JobPortal } from '@/types';
import { toast } from 'sonner';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { AdvancedFilterBar } from '@/components/shared/advanced-filter-bar';
import { useRecruiters } from '@/hooks/use-recruiters';
import { InterviewsCalendar } from '@/components/shared/interviews-calendar';
import { useProfiles } from '@/hooks/use-profiles';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ALL = '__all__';

function formatBusinessDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function downloadApplicationsExcel(applications: JobApplication[], isAdmin: boolean, filename: string) {
  let ExcelJS;
  try {
    ExcelJS = await import('exceljs').then((m) => m.default ?? m);
  } catch (err) {
    console.error('Failed to load exceljs', err);
    toast.error('Application update detected. Reloading page...');
    setTimeout(() => window.location.reload(), 1500);
    return;
  }
  const { saveAs } = await import('file-saver');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mayzax ATS';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Applications');
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  const headers = [
    'Candidate',
    'Technology',
    'Company Name',
    'Job Title',
    'Portal',
    'Applied By',
    'Recruiter Email',
    'Status',
    'Verified',
    'Verification Method',
    'Verification Score',
    'Verification Timestamp',
    'Business Date',
    'Applied At',
    'Job Link',
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5DA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  applications.forEach((app) => {
    worksheet.addRow([
      app.profile?.candidateName ?? '',
      app.profile?.technology ?? '',
      app.companyName || '',
      app.jobTitle || '',
      formatEnumLabel(app.jobPortal),
      app.recruiter?.name ?? '',
      app.recruiter?.email ?? '',
      formatEnumLabel(app.status),
      app.verified ? 'Verified' : 'Unverified',
      app.verificationMethod || '',
      app.verificationScore !== undefined && app.verificationScore !== null ? `${app.verificationScore}%` : '',
      app.verificationTimestamp ? formatDateTime(app.verificationTimestamp) : '',
      formatBusinessDateLabel(app.businessDate.slice(0, 10)),
      formatDateTime(app.appliedAt),
      app.jobLink,
    ]);
  });
  worksheet.autoFilter = 'A1:O1';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const { isAdmin, isManager, isTeamLeader } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('date');
  const fromFilter = searchParams.get('from');
  const toFilter = searchParams.get('to');
  const profileIdFilter = searchParams.get('profileId');

  const recruiterFilter = searchParams.get('recruiterId');

  const tabFilter = searchParams.get('tab');
  const interviewDateFilter = searchParams.get('interviewDate') || searchParams.get('date');

  const [fromDate, setFromDate] = useState<string>(fromFilter || dateFilter || '');
  const [toDate, setToDate] = useState<string>(toFilter || dateFilter || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL>(ALL);
  const [jobPortal, setJobPortal] = useState<JobPortal | typeof ALL>(ALL);
  const [verified, setVerified] = useState<string>(ALL);
  const [recruiterId, setRecruiterId] = useState<string>(recruiterFilter || ALL);
  const [companyName, setCompanyName] = useState('');
  const [sortBy, setSortBy] = useState('appliedAt');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search);
  const debouncedCompany = useDebounce(companyName);

  const [activeTab, setActiveTab] = useState<'applications' | 'interviews'>(() => {
    return tabFilter === 'interviews' ? 'interviews' : 'applications';
  });
  const [allInterviews, setAllInterviews] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (interviewDateFilter) {
      const d = new Date(interviewDateFilter + (interviewDateFilter.length === 10 ? 'T00:00:00' : ''));
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [scheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);

  const fetchAllInterviews = async () => {
    if (activeTab !== 'interviews') return;
    setIsLoadingInterviews(true);
    try {
      const { data } = await apiClient.get('/applications/interviews');
      setAllInterviews(data.data || []);
    } catch (err) {
      console.error('Failed to load interviews', err);
    } finally {
      setIsLoadingInterviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'interviews') {
      fetchAllInterviews();
    }
  }, [activeTab]);

  const { data: recruitersData } = useRecruiters({ pageSize: 100, isActive: true });
  const rawRecruiters = recruitersData?.data ?? [];
  const recruiters = useMemo(() => {
    const allowedRoles = ['RECRUITER', 'ADMIN', 'TEAM_LEADER'];
    const filteredRaw = rawRecruiters.filter((r) => allowedRoles.includes(r.role));

    if (isTeamLeader && user) {
      const exists = filteredRaw.some((r) => r.id === user.id);
      if (!exists) {
        return [
          {
            id: user.id,
            name: `${user.name} (Me)`,
            email: user.email,
            role: 'TEAM_LEADER',
            isActive: true,
            createdAt: user.createdAt,
          } as any,
          ...filteredRaw,
        ];
      }
    }
    return filteredRaw;
  }, [rawRecruiters, isTeamLeader, user]);

  useEffect(() => {
    if (tabFilter === 'interviews') {
      setActiveTab('interviews');
    }
  }, [tabFilter]);

  useEffect(() => {
    if (interviewDateFilter) {
      const d = new Date(interviewDateFilter + (interviewDateFilter.length === 10 ? 'T00:00:00' : ''));
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
      }
    }
  }, [interviewDateFilter]);

  useEffect(() => {
    if (fromFilter || toFilter) {
      setFromDate(fromFilter || '');
      setToDate(toFilter || '');
    } else if (dateFilter && tabFilter !== 'interviews') {
      setFromDate(dateFilter);
      setToDate(dateFilter);
    }
  }, [dateFilter, fromFilter, toFilter, tabFilter]);

  useEffect(() => {
    if (recruiterFilter) {
      setRecruiterId(recruiterFilter);
    } else {
      setRecruiterId(ALL);
    }
  }, [recruiterFilter]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    setFromDate(newFrom);
    setToDate(newTo);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    if (newFrom) next.set('from', newFrom);
    else next.delete('from');
    if (newTo) next.set('to', newTo);
    else next.delete('to');
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatus(ALL);
    setJobPortal(ALL);
    setVerified(ALL);
    setRecruiterId(ALL);
    setCompanyName('');
    setFromDate('');
    setToDate('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    next.delete('from');
    next.delete('to');
    next.delete('recruiterId');
    next.delete('profileId');
    setSearchParams(next);
  };

  const activeFilters = [
    ...(status !== ALL ? [{ key: 'status', label: 'Status', value: status, displayValue: formatEnumLabel(status) }] : []),
    ...(jobPortal !== ALL ? [{ key: 'portal', label: 'Portal', value: jobPortal, displayValue: formatEnumLabel(jobPortal) }] : []),
    ...(verified !== ALL ? [{ key: 'verified', label: 'Verification', value: verified, displayValue: verified === 'true' ? 'Verified' : 'Unverified' }] : []),
    ...(recruiterId !== ALL ? [{ key: 'recruiter', label: 'Recruiter', value: recruiterId, displayValue: recruiters.find((r) => r.id === recruiterId)?.name || 'Selected' }] : []),
    ...(fromDate || toDate ? [{ key: 'dateRange', label: 'Date', value: `${fromDate}-${toDate}`, displayValue: fromDate === toDate ? formatBusinessDateLabel(fromDate) : `${fromDate || 'Start'} → ${toDate || 'Present'}` }] : []),
    ...(profileIdFilter ? [{ key: 'profile', label: 'Candidate', value: profileIdFilter, displayValue: 'Filtered' }] : []),
  ];

  const { data, isLoading, isError, refetch, isFetching } = useApplications({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    jobPortal: jobPortal === ALL ? undefined : jobPortal,
    verified: verified === ALL ? undefined : verified === 'true',
    companyName: debouncedCompany || undefined,
    recruiterId: recruiterId === ALL ? undefined : recruiterId,
    profileId: profileIdFilter || undefined,
    businessDateFrom: fromDate || undefined,
    businessDateTo: toDate || undefined,
    page,
    pageSize: 16,
    sortBy,
    sortOrder: 'desc',
  });

  const applications = data?.data ?? [];
  const totalApplications = data?.pagination?.total ?? applications.length;

  const exportApplications = async () => {
    setIsExporting(true);
    try {
      const baseParams = {
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : status,
        jobPortal: jobPortal === ALL ? undefined : jobPortal,
        verified: verified === ALL ? undefined : verified === 'true',
        companyName: debouncedCompany || undefined,
        recruiterId: recruiterId === ALL ? undefined : recruiterId,
        profileId: profileIdFilter || undefined,
        businessDateFrom: fromDate || undefined,
        businessDateTo: toDate || undefined,
        sortBy,
        sortOrder: 'desc' as const,
      };
      const allApplications: JobApplication[] = [];
      let exportPage = 1;
      let totalPages = 1;
      do {
        const { data: response } = await apiClient.get<ApiSuccess<JobApplication[]>>('/applications', { params: { ...baseParams, page: exportPage, pageSize: 100 } });
        allApplications.push(...response.data);
        totalPages = response.pagination?.totalPages ?? 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      if (allApplications.length === 0) {
        toast.info('No applications available to export.');
        return;
      }
      const candidateName = profileIdFilter ? allApplications.find((app) => app.profileId === profileIdFilter)?.profile?.candidateName : undefined;
      const filename = generateExportFilename({
        baseName: 'Applications',
        userNameOrCandidate: candidateName,
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      await downloadApplicationsExcel(allApplications, isAdmin, filename);
      toast.success(`Downloaded ${allApplications.length} applications`);
    } catch {
      toast.error('Failed to download applications');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PremiumPageHeader
        icon={ClipboardList}
        title={activeTab === 'interviews' ? 'Scheduled Interviews' : 'Job Applications'}
        description={activeTab === 'interviews' ? 'View and schedule candidate interviews on calendar' : 'Log & track applications with advanced filters'}
        live={true}
        liveLabel={activeTab === 'interviews' ? `${allInterviews.length} interviews` : `${totalApplications} total`}
        pills={[
          { label: 'Business Date', icon: Activity },
          { label: 'ATS Tracker', icon: Sparkles, variant: 'premium' },
        ]}
        actions={
          activeTab === 'interviews' ? (
            <div className="flex flex-wrap items-center gap-2 dark:text-black">
              <Button variant="outline" onClick={fetchAllInterviews} disabled={isLoadingInterviews} className="rounded-full shadow-sm bg-white gap-1.5" title="Refresh interviews">
                <RefreshCw className={`h-4 w-4 ${isLoadingInterviews ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="brand" onClick={() => setScheduleInterviewOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 gap-1.5">
                <Plus className="h-4 w-4" /> Add Interview
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 dark:text-black">
              <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetching} className="rounded-full shadow-sm bg-white gap-1.5" title="Refresh applications">
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportApplications} disabled={isLoading || isExporting || totalApplications === 0} className="rounded-full shadow-sm bg-white">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Excel
              </Button>
              <Button variant="brand" onClick={() => setFormOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 gap-1.5">
                <Plus className="h-4 w-4" /> Log Application
              </Button>
            </div>
          )
        }
        gradient="from-mayzax-blue-600 to-mayzax-green-600"
        bottomGradient="from-mayzax-blue-600 via-mayzax-green-500 to-mayzax-blue-600"
      />

      {(isAdmin || isTeamLeader) && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'applications'
                ? 'border-mayzax-blue-500 text-mayzax-blue-600 dark:text-mayzax-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Applications Tracker
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'interviews'
                ? 'border-mayzax-blue-500 text-mayzax-blue-600 dark:text-mayzax-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Interviews Calendar
          </button>
        </div>
      )}

      {profileIdFilter && activeTab === 'applications' && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 ">
          <span>
            Filtered by Candidate: <span className="font-semibold">{applications.find((a) => a.profileId === profileIdFilter)?.profile?.candidateName || 'Loading...'}</span>
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('profileId');
              setSearchParams(next);
              setPage(1);
            }}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 hover:bg-indigo-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {activeTab === 'applications' && (
        <>
          <AdvancedFilterBar
            searchPlaceholder="Search company, title, candidate, job link..."
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            filters={[
              {
                key: 'status',
                label: 'Status',
                value: status,
                onChange: (v) => {
                  setStatus(v as any);
                  setPage(1);
                },
                placeholder: 'All Statuses',
                options: [{ value: ALL, label: 'All Statuses' }, ...ALL_STATUSES.map((s) => ({ value: s, label: formatEnumLabel(s) }))],
              },
              {
                key: 'portal',
                label: 'Portal',
                value: jobPortal,
                onChange: (v) => {
                  setJobPortal(v as any);
                  setPage(1);
                },
                placeholder: 'All Portals',
                options: [{ value: ALL, label: 'All Portals' }, ...ALL_JOB_PORTALS.map((p) => ({ value: p, label: formatEnumLabel(p) }))],
              },
              {
                key: 'verified',
                label: 'Verification',
                value: verified,
                onChange: (v) => {
                  setVerified(v);
                  setPage(1);
                },
                placeholder: 'Verification',
                icon: ShieldCheck,
                options: [
                  { value: ALL, label: 'All' },
                  { value: 'true', label: 'Verified only' },
                  { value: 'false', label: 'Unverified only' },
                ],
              },
              ...(isManager
                ? [
                    {
                      key: 'recruiter',
                      label: 'Recruiter',
                      value: recruiterId,
                      onChange: (v: string) => {
                        setRecruiterId(v);
                        setPage(1);
                      },
                      placeholder: 'All Recruiters',
                      icon: Users,
                      searchable: true,
                      options: [{ value: ALL, label: 'All Recruiters' }, ...recruiters.map((r) => ({ value: r.id, label: r.name }))],
                    },
                  ]
                : []),
              {
                key: 'sort',
                label: 'Sort by',
                value: sortBy,
                onChange: (v) => {
                  setSortBy(v);
                  setPage(1);
                },
                placeholder: 'Sort',
                options: [
                  { value: 'appliedAt', label: 'Applied Date' },
                  { value: 'businessDate', label: 'Business Date' },
                  { value: 'companyName', label: 'Company' },
                  { value: 'jobTitle', label: 'Job Title' },
                  { value: 'createdAt', label: 'Created' },
                ],
              },
            ]}
            dateRange={{
              from: fromDate,
              to: toDate,
              onFromChange: (v) => handleDateChange(v, toDate),
              onToChange: (v) => handleDateChange(fromDate, v),
              label: 'Business Date',
            }}
            activeFilters={activeFilters}
            onClearFilter={(key) => {
              if (key === 'status') setStatus(ALL);
              if (key === 'portal') setJobPortal(ALL);
              if (key === 'verified') setVerified(ALL);
              if (key === 'recruiter') setRecruiterId(ALL);
              if (key === 'dateRange') {
                setFromDate('');
                setToDate('');
                const next = new URLSearchParams(searchParams);
                next.delete('date');
                next.delete('from');
                next.delete('to');
                setSearchParams(next);
              }
              if (key === 'profile') {
                const next = new URLSearchParams(searchParams);
                next.delete('profileId');
                setSearchParams(next);
              }
              setPage(1);
            }}
            onClearAll={clearAllFilters}
            resultCount={totalApplications}
            resultLabel="applications"
            additionalFilters={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Company Filter</label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      placeholder="Filter by company name..."
                      className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-slate-500 dark:bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 w-full text-black">
                    <span className="font-semibold text-slate-700 dark:text-black">Filters:</span> Search is fuzzy across company, title, candidate, link. Use advanced filters for precise search.
                  </div>
                </div>
              </div>
            }
          />

          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mt-4">
            {isLoading && (
              <div className="p-4">
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && applications.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No applications found"
                  description={fromDate || toDate || status !== ALL || jobPortal !== ALL || verified !== ALL || search ? 'Try adjusting your advanced filters' : 'Log your first job application'}
                  action={<Button variant="brand" size="sm" onClick={() => setFormOpen(true)} className="rounded-full">Log Application</Button>}
                />
              </div>
            )}

            {!isLoading && applications.length > 0 && (
              <>
                <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-200 dark:border-slate-850 px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="font-medium">{totalApplications} applications</span>
                    <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                    <span>Virtualized • Filters active: {activeFilters.length}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Real-time IST grouping
                  </div>
                </div>

                {applications.length <= 20 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-850/50 dark:border-slate-800 ">
                        <TableHead className='dark:text-white'>Candidate</TableHead>
                        <TableHead className='dark:text-white'>Company / Title</TableHead>
                        <TableHead className='dark:text-white'>Portal</TableHead>
                        <TableHead className='dark:text-white'>Applied By</TableHead>
                        <TableHead className='dark:text-white'>Status</TableHead>
                        <TableHead className='dark:text-white'>Verification</TableHead>
                        <TableHead className='dark:text-white'>Business Date</TableHead>
                        <TableHead className="text-right dark:text-white">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
                        <TableRow key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 dark:border-slate-800">
                          <TableCell>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.profile?.candidateName}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{app.profile?.technology}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-slate-850 dark:text-slate-200">{app.companyName || '—'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-450">{app.jobTitle || '—'}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">{formatEnumLabel(app.jobPortal)}</TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">{app.recruiter?.name}</TableCell>
                          <TableCell>
                            <StatusBadge status={app.status} />
                          </TableCell>
                          <TableCell>
                            {app.verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                ● Verified {app.verificationScore !== undefined && app.verificationScore !== null ? `(${app.verificationScore}%)` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-500 dark:text-slate-400">○ Unverified</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">{app.businessDate.slice(0, 10)}</TableCell>
                          <TableCell className="text-right">
                            <a href={app.jobLink} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <VirtualizedTable
                    data={applications}
                    estimateRowHeight={72}
                    maxHeight="600px"
                    header={
                      <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_1fr_0.6fr_0.7fr_0.6fr_0.3fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-850/80">
                        <span>Candidate</span>
                        <span>Company / Title</span>
                        <span>Portal</span>
                        <span>Applied By</span>
                        <span>Status</span>
                        <span>Verification</span>
                        <span>Date</span>
                        <span className="text-right">Link</span>
                      </div>
                    }
                    renderRow={(app: JobApplication) => (
                      <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_1fr_0.6fr_0.7fr_0.6fr_0.3fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{app.profile?.candidateName}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{app.profile?.technology}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-850 dark:text-slate-200 truncate">{app.companyName || '—'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450 truncate">{app.jobTitle || '—'}</p>
                        </div>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{formatEnumLabel(app.jobPortal)}</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 truncate">{app.recruiter?.name}</div>
                        <div>
                          <StatusBadge status={app.status} size="sm" />
                        </div>
                        <div>
                          {app.verified ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              ● Verified {app.verificationScore !== undefined && app.verificationScore !== null ? `(${app.verificationScore}%)` : ''}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">○ Unverified</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300">{app.businessDate.slice(0, 10)}</div>
                        <div className="text-right">
                          <a href={app.jobLink} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}
                  />
                )}

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30">
                  <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'interviews' && (isAdmin || isTeamLeader) && (
        <div className="space-y-6">
          <InterviewsCalendarDashboard
            interviews={allInterviews}
            isLoading={isLoadingInterviews}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>
      )}

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} defaultProfileId={profileIdFilter || undefined} />

      <ScheduleInterviewFormDialog
        open={scheduleInterviewOpen}
        onClose={() => setScheduleInterviewOpen(false)}
        onSuccess={fetchAllInterviews}
      />
    </div>
  );
}

function ScheduleInterviewFormDialog({
  open,
  onClose,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: profilesData, isLoading: isLoadingProfiles } = useProfiles({ pageSize: 100, isActive: true });
  const profiles = profilesData?.data ?? [];

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [roundName, setRoundName] = useState('');
  const [status, setStatus] = useState('Scheduled');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [timezone, setTimezone] = useState('EST');
  const [interviewer, setInterviewer] = useState('');
  const [mode, setMode] = useState('Google Meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId || !roundName || !status || !date || !startTime || !endTime) {
      toast.error('Required fields are missing');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        roundName,
        status,
        date,
        startTime,
        endTime,
        timezone,
        interviewer,
        mode,
        meetingLink,
        notes,
      };
      await apiClient.post(`/profiles/${selectedProfileId}/interviews`, payload);
      toast.success('Interview scheduled successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="rounded-3xl max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
            Schedule Interview
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Select a candidate profile and specify interview options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase">Select Client Profile *</Label>
            {isLoadingProfiles ? (
              <div className="text-xs text-slate-400">Loading candidate profiles...</div>
            ) : (
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:text-black">
                  <SelectValue placeholder="Select Candidate" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.candidateName} {p.technology ? `(${p.technology})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase">Round Name *</Label>
            <Input
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="e.g. Technical Round 1"
              className="rounded-xl border-slate-200 bg-white dark:text-black"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:text-black">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. EST"
                className="rounded-xl border-slate-200 bg-white dark:text-black"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-slate-200 bg-white dark:text-black cursor-pointer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Start Time *</Label>
              <Input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="rounded-xl border-slate-200 bg-white dark:text-black"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">End Time *</Label>
              <Input
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 11:00 AM"
                className="rounded-xl border-slate-200 bg-white dark:text-black"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase">Interviewer Name</Label>
            <Input
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="rounded-xl border-slate-200 bg-white dark:text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="rounded-xl border-slate-200 dark:text-black">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Google Meet">Google Meet</SelectItem>
                  <SelectItem value="Zoom">Zoom</SelectItem>
                  <SelectItem value="Teams">Teams</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                  <SelectItem value="In Person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase">Meeting Link</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="e.g. https://..."
                className="rounded-xl border-slate-200 bg-white dark:text-black"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-500 uppercase">Notes / Call Details</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context or instructions..."
              className="w-full min-h-[70px] p-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 dark:text-black"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
            <Button type="submit" variant="brand" className="rounded-xl bg-indigo-650 text-black hover:bg-indigo-700 hover:text-white font-bold" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CalendarDashboardProps {
  interviews: any[];
  isLoading: boolean;
  selectedDate: Date | null;
  onDateSelect: (d: Date) => void;
}

function InterviewsCalendarDashboard({
  interviews,
  isLoading,
  selectedDate,
  onDateSelect
}: CalendarDashboardProps) {
  const getInterviewsForDate = (date: Date) => {
    const compareStr = date.toISOString().slice(0, 10);
    return interviews.filter((item) => item.date === compareStr);
  };

  const selectedInterviews = selectedDate ? getInterviewsForDate(selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      <div className="w-full">
        <InterviewsCalendar
          interviews={interviews}
          isLoading={isLoading}
          selectedDate={selectedDate}
          onDateSelect={onDateSelect}
          mini={true}
        />
      </div>

      <div className="w-full">
        {selectedDate ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                Scheduled Interviews for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h4>
              <Badge className="bg-indigo-50 text-indigo-750 border-indigo-200 rounded-full font-extrabold text-[11px] px-2.5 py-0.5">
                {selectedInterviews.length} Scheduled
              </Badge>
            </div>

            {selectedInterviews.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-850/50 dark:border-slate-850">
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Candidate</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Round Name</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Status</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Time</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Interviewer</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Mode</TableHead>
                      <TableHead className="font-bold text-xs uppercase dark:text-slate-300">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInterviews.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 dark:border-slate-800 text-xs">
                        <TableCell className="font-semibold text-slate-800 dark:text-white">
                          <div>{item.profile?.candidateName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.profile?.technology}</div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-750 dark:text-slate-300">{item.roundName}</TableCell>
                        <TableCell>
                          <Badge className={`${item.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'
                            : item.status === 'Cancelled'
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-50/10'
                              : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-550/10'
                            } text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-650 dark:text-slate-350">
                          {item.startTime} – {item.endTime} ({item.timezone})
                        </TableCell>
                        <TableCell className="font-semibold text-slate-650 dark:text-slate-350">{item.interviewer || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-650 dark:text-slate-350">{item.mode || 'N/A'}</div>
                          {item.meetingLink && (
                            <a href={item.meetingLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-650 hover:underline">Link</a>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-slate-400" title={item.notes}>{item.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No interviews scheduled on this day.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-400 dark:border-slate-700">
            Please click/select a date on the calendar to view its scheduled interviews.
          </div>
        )}
      </div>
    </div>
  );
}
