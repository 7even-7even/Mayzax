import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileText, Loader2, Plus, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { StatusBadge, ALL_STATUSES, formatEnumLabel } from '@/components/shared/status-badge';
import { ApplicationFormDialog } from './application-form-dialog';
import { useApplications } from '@/hooks/use-applications';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { ApiSuccess, ApplicationStatus, JobApplication } from '@/types';
import { toast } from 'sonner';

const ALL = '__all__';

function formatBusinessDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeExcelCell(value: unknown): string {
  return `<td style="mso-number-format:'\\@';">${escapeHtml(value)}</td>`;
}

function downloadApplicationsExcel(applications: JobApplication[], isAdmin: boolean) {
  const headers = [
    'Candidate',
    'Technology',
    'Company Name',
    'Job Title',
    'Portal',
    ...(isAdmin ? ['Recruiter', 'Recruiter Email'] : []),
    'Status',
    'Business Date',
    'Applied At',
    'Job Link',
  ];

  const rows = applications.map((app) => [
    app.profile?.candidateName ?? '',
    app.profile?.technology ?? '',
    app.companyName || 'Company not provided',
    app.jobTitle || 'Job title not provided',
    formatEnumLabel(app.jobPortal),
    ...(isAdmin ? [app.recruiter?.name ?? '', app.recruiter?.email ?? ''] : []),
    formatEnumLabel(app.status),
    app.businessDate.slice(0, 10),
    formatDateTime(app.appliedAt),
    app.jobLink,
  ]);

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Applications</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map(makeExcelCell).join('')}</tr>`).join('')}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `mayzax-applications-${today}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD, from heatmap click

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError, refetch } = useApplications({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    // Single-day filter expressed as a from/to range on the same date.
    businessDateFrom: dateFilter || undefined,
    businessDateTo: dateFilter || undefined,
    page,
    pageSize: 12,
    sortBy: 'appliedAt',
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
        businessDateFrom: dateFilter || undefined,
        businessDateTo: dateFilter || undefined,
        sortBy: 'appliedAt',
        sortOrder: 'desc' as const,
      };

      const allApplications: JobApplication[] = [];
      let exportPage = 1;
      let totalPages = 1;

      do {
        const { data: response } = await apiClient.get<ApiSuccess<JobApplication[]>>('/applications', {
          params: { ...baseParams, page: exportPage, pageSize: 100 },
        });
        allApplications.push(...response.data);
        totalPages = response.pagination?.totalPages ?? 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      if (allApplications.length === 0) {
        toast.info('No applications available to export.');
        return;
      }

      downloadApplicationsExcel(allApplications, isAdmin);
      toast.success(`Downloaded ${allApplications.length} application${allApplications.length === 1 ? '' : 's'}.`);
    } catch {
      toast.error('Failed to download applications. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    setSearchParams(next);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Job Applications"
        description={
          isAdmin
            ? 'All applications submitted across recruiters, grouped by business date.'
            : 'Log applications for your assigned profiles and track their status.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportApplications} disabled={isLoading || isExporting || totalApplications === 0}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Excel
            </Button>
            <Button variant="brand" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Log Application
            </Button>
          </div>
        }
      />

      {dateFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-mayzax-blue/20 bg-mayzax-blue/5 px-3 py-2 text-sm text-slate-700">
          <span>
            Filtered by business date: <span className="font-medium text-slate-900">{formatBusinessDateLabel(dateFilter)}</span>
          </span>
          <button
            onClick={clearDateFilter}
            className="ml-1 flex items-center gap-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            aria-label="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by company, title, or candidate..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as ApplicationStatus | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {formatEnumLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading && <TableSkeleton rows={6} cols={7} />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && applications.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No applications found"
            description={
              dateFilter
                ? `No applications were logged on ${formatBusinessDateLabel(dateFilter)}.`
                : search || status !== ALL
                  ? 'Try adjusting your search or filters.'
                  : 'Log your first job application to start tracking submissions.'
            }
            action={
              !search &&
              status === ALL &&
              !dateFilter && (
                <Button variant="brand" size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Log Application
                </Button>
              )
            }
          />
        )}

        {!isLoading && !isError && applications.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Company / Title</TableHead>
                  <TableHead>Portal</TableHead>
                  {isAdmin && <TableHead>Recruiter</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Business Date</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{app.profile?.candidateName}</p>
                      <p className="text-xs text-slate-400">{app.profile?.technology}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{app.companyName || 'Company not provided'}</p>
                      <p className="text-xs text-slate-500">{app.jobTitle || 'Job title not provided'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatEnumLabel(app.jobPortal)}</TableCell>
                    {isAdmin && <TableCell className="text-sm text-slate-600">{app.recruiter?.name}</TableCell>}
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{app.businessDate.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(app.appliedAt)}</TableCell>
                    <TableCell className="text-right">
                      <a href={app.jobLink} target="_blank" rel="noreferrer" className="text-mayzax-blue hover:underline">
                        <ExternalLink className="ml-auto h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}