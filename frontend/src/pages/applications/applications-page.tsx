import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileText, Loader2, Plus, X, Sparkles, Building2, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
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
import { ApiSuccess, ApplicationStatus, JobApplication, JobPortal } from '@/types';
import { toast } from 'sonner';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { AdvancedFilterBar } from '@/components/shared/advanced-filter-bar';
import { useRecruiters } from '@/hooks/use-recruiters';

const ALL = '__all__';

function formatBusinessDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function downloadApplicationsExcel(applications: JobApplication[], isAdmin: boolean, filename: string) {
  const ExcelJS = await import('exceljs').then((m) => m.default ?? m);
  const { saveAs } = await import('file-saver');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mayzax ATS';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Applications');
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  const headers = ['Candidate', 'Technology', 'Company Name', 'Job Title', 'Portal', 'Applied By', 'Recruiter Email', 'Status', 'Verified', 'Business Date', 'Applied At', 'Job Link'];
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
      formatBusinessDateLabel(app.businessDate.slice(0, 10)),
      formatDateTime(app.appliedAt),
      app.jobLink,
    ]);
  });
  worksheet.autoFilter = 'A1:L1';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}

export default function ApplicationsPage() {
  const { isAdmin, isManager } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('date');
  const fromFilter = searchParams.get('from');
  const toFilter = searchParams.get('to');
  const profileIdFilter = searchParams.get('profileId');

  const [fromDate, setFromDate] = useState<string>(fromFilter || dateFilter || '');
  const [toDate, setToDate] = useState<string>(toFilter || dateFilter || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL>(ALL);
  const [jobPortal, setJobPortal] = useState<JobPortal | typeof ALL>(ALL);
  const [verified, setVerified] = useState<string>(ALL);
  const [recruiterId, setRecruiterId] = useState<string>(ALL);
  const [companyName, setCompanyName] = useState('');
  const [sortBy, setSortBy] = useState('appliedAt');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search);
  const debouncedCompany = useDebounce(companyName);

  const { data: recruitersData } = useRecruiters({ pageSize: 100, isActive: true });
  const recruiters = recruitersData?.data ?? [];

  useEffect(() => {
    if (fromFilter || toFilter) {
      setFromDate(fromFilter || '');
      setToDate(toFilter || '');
    } else if (dateFilter) {
      setFromDate(dateFilter);
      setToDate(dateFilter);
    }
  }, [dateFilter, fromFilter, toFilter]);

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

  const { data, isLoading, isError, refetch } = useApplications({
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
      <PageHeader
        title="Job Applications"
        description={isAdmin ? 'Premium filtering • Virtualized • Business-date grouped' : 'Log & track applications with advanced filters'}
        premium
        badge={`${totalApplications} total`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportApplications} disabled={isLoading || isExporting || totalApplications === 0} className="rounded-full shadow-sm bg-white">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </Button>
            <Button variant="brand" onClick={() => setFormOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 gap-1.5">
              <Plus className="h-4 w-4" /> Log Application
            </Button>
          </div>
        }
      />

      {profileIdFilter && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
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

      {/* Premium Advanced Filter Bar */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full">
                <span className="font-semibold text-slate-700">Smart filters:</span> Search is fuzzy across company, title, candidate, link. Use advanced for precise company filter.
              </div>
            </div>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
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
            <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span className="font-medium">{totalApplications} applications</span>
                <span className="h-3 w-px bg-slate-200" />
                <span>Virtualized • Smart filters active: {activeFilters.length}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-time IST grouping
              </div>
            </div>

            {applications.length <= 20 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Company / Title</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Applied By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Business Date</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-slate-50/70">
                      <TableCell>
                        <p className="text-sm font-semibold">{app.profile?.candidateName}</p>
                        <p className="text-xs text-slate-400">{app.profile?.technology}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{app.companyName || '—'}</p>
                        <p className="text-xs text-slate-500">{app.jobTitle || '—'}</p>
                      </TableCell>
                      <TableCell className="text-xs">{formatEnumLabel(app.jobPortal)}</TableCell>
                      <TableCell className="text-xs">{app.recruiter?.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell>
                        {app.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">● Verified</span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">○ Unverified</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{app.businessDate.slice(0, 10)}</TableCell>
                      <TableCell className="text-right">
                        <a href={app.jobLink} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
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
                  <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_1fr_0.6fr_0.7fr_0.6fr_0.3fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/80">
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
                  <div className="grid grid-cols-[1.2fr_1.4fr_0.6fr_1fr_0.6fr_0.7fr_0.6fr_0.3fr] gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/60 items-center">
                    <div>
                      <p className="text-sm font-medium truncate">{app.profile?.candidateName}</p>
                      <p className="text-xs text-slate-400 truncate">{app.profile?.technology}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate">{app.companyName || '—'}</p>
                      <p className="text-xs text-slate-500 truncate">{app.jobTitle || '—'}</p>
                    </div>
                    <div className="text-xs font-medium">{formatEnumLabel(app.jobPortal)}</div>
                    <div className="text-xs truncate">{app.recruiter?.name}</div>
                    <div>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                    <div>{app.verified ? <span className="text-[11px] text-emerald-600 font-semibold">● Verified</span> : <span className="text-[11px] text-slate-400">○ Unverified</span>}</div>
                    <div className="text-xs">{app.businessDate.slice(0, 10)}</div>
                    <div className="text-right">
                      <a href={app.jobLink} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 hover:bg-indigo-50">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              />
            )}

            <div className="p-3 border-t border-slate-100 bg-slate-50/30">
              <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} defaultProfileId={profileIdFilter || undefined} />
    </div>
  );
}
