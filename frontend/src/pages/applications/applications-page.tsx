import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Download, ExternalLink, FileText, Loader2, Plus, Search, X } from 'lucide-react';
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
import { formatDateTime, generateExportFilename } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { ApiSuccess, ApplicationStatus, JobApplication } from '@/types';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ALL = '__all__';

function formatBusinessDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

async function downloadApplicationsExcel(applications: JobApplication[], isAdmin: boolean, filename: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mayzax ATS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Applications');

  // Freeze the header row (first row)
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
    'Business Date',
    'Applied At',
    'Job Link',
  ];

  // Add headers and style them professionally
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2A5DA8' }, // Mayzax Blue (#2A5DA8)
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1A3966' } },
      left: { style: 'thin', color: { argb: 'FF1A3966' } },
      bottom: { style: 'medium', color: { argb: 'FF1A3966' } },
      right: { style: 'thin', color: { argb: 'FF1A3966' } },
    };
  });

  // Populate data rows
  applications.forEach((app) => {
    worksheet.addRow([
      app.profile?.candidateName ?? '',
      app.profile?.technology ?? '',
      app.companyName || 'Company not provided',
      app.jobTitle || 'Job title not provided',
      formatEnumLabel(app.jobPortal),
      app.recruiter?.name ?? '',
      app.recruiter?.email ?? '',
      formatEnumLabel(app.status),
      formatBusinessDateLabel(app.businessDate.slice(0, 10)),
      formatDateTime(app.appliedAt),
      app.jobLink,
    ]);
  });

  // Format data cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    row.height = 22;
    const isEven = rowNumber % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alternate row shading using Mayzax Blue 50
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEBF1FA' },
        };
      }

      // Center Status, Business Date, and Applied At columns
      if (colNumber === 8 || colNumber === 9 || colNumber === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }

      // Highlight Job Link column as hyperlink
      if (colNumber === 11) {
        const urlStr = cell.value;
        if (typeof urlStr === 'string' && urlStr.startsWith('http')) {
          cell.value = { text: urlStr, hyperlink: urlStr };
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2A5DA8' }, underline: true };
        }
      }
    });
  });

  // Enable auto filter
  worksheet.autoFilter = 'A1:K1';

  // Compute dynamic column widths
  worksheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.((cell) => {
      let text = '';
      if (cell.value) {
        if (typeof cell.value === 'object' && 'text' in cell.value) {
          text = String(cell.value.text);
        } else {
          text = String(cell.value);
        }
      }
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    col.width = Math.min(maxLen + 4, 50); // limit max width to 50 to avoid overflow
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD, from heatmap click
  const fromFilter = searchParams.get('from');
  const toFilter = searchParams.get('to');
  const profileIdFilter = searchParams.get('profileId');

  const [fromDate, setFromDate] = useState<string>(fromFilter || dateFilter || '');
  const [toDate, setToDate] = useState<string>(toFilter || dateFilter || '');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search);

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

  const { data, isLoading, isError, refetch } = useApplications({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    profileId: profileIdFilter || undefined,
    businessDateFrom: fromDate || undefined,
    businessDateTo: toDate || undefined,
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
        profileId: profileIdFilter || undefined,
        businessDateFrom: fromDate || undefined,
        businessDateTo: toDate || undefined,
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

      const candidateName = profileIdFilter
        ? allApplications.find((app) => app.profileId === profileIdFilter)?.profile?.candidateName
        : undefined;

      const filename = generateExportFilename({
        baseName: 'Applications',
        userNameOrCandidate: candidateName,
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      await downloadApplicationsExcel(allApplications, isAdmin, filename);
      toast.success(`Downloaded ${allApplications.length} application${allApplications.length === 1 ? '' : 's'}.`);
    } catch {
      toast.error('Failed to download applications. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


  const clearDateRange = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
    const next = new URLSearchParams(searchParams);
    next.delete('date');
    next.delete('from');
    next.delete('to');
    setSearchParams(next);
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

      {(fromDate || toDate) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-mayzax-blue/20 bg-mayzax-blue/5 px-3 py-2 text-sm text-slate-700">
          <span>
            Filtered by business date: {' '}
            <span className="font-medium text-slate-900">
              {fromDate === toDate && fromDate
                ? formatBusinessDateLabel(fromDate)
                : `${fromDate ? formatBusinessDateLabel(fromDate) : 'Start'} – ${toDate ? formatBusinessDateLabel(toDate) : 'Present'}`}
            </span>
          </span>
          <button
            onClick={clearDateRange}
            className="ml-1 flex items-center gap-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            aria-label="Clear date range"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {profileIdFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-mayzax-blue/20 bg-mayzax-blue/5 px-3 py-2 text-sm text-slate-700">
          <span>
            Filtered by Candidate Profile: <span className="font-medium text-slate-900">{applications.find(app => app.profileId === profileIdFilter)?.profile?.candidateName || 'Loading...'}</span>
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('profileId');
              setSearchParams(next);
              setPage(1);
            }}
            className="ml-1 flex items-center gap-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
            aria-label="Clear profile filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
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
            <SelectTrigger className="w-full sm:w-48">
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

        {/* Date Range Calendar Filter */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-mayzax-blue shrink-0" />
            <span className="font-medium text-slate-500">From:</span>
            <Input
              type="date"
              className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer"
              value={fromDate}
              onChange={(e) => handleDateChange(e.target.value, toDate)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-500">To:</span>
            <Input
              type="date"
              className="h-7 w-32 border-0 bg-transparent p-0 text-xs focus:ring-0 cursor-pointer"
              value={toDate}
              onChange={(e) => handleDateChange(fromDate, e.target.value)}
            />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={clearDateRange}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading && <TableSkeleton rows={6} cols={7} />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && applications.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No applications found"
            description={
              fromDate || toDate
                ? `No applications were logged in the selected date range.`
                : search || status !== ALL
                  ? 'Try adjusting your search or filters.'
                  : 'Log your first job application to start tracking submissions.'
            }
            action={
              !search &&
              status === ALL &&
              !fromDate &&
              !toDate && (
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
                  <TableHead>Applied By</TableHead>
                  <TableHead>Verification</TableHead>
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
                    <TableCell>
                      <p className="text-sm font-medium text-slate-700">{app.recruiter?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{app.recruiter?.email}</p>
                    </TableCell>
                    <TableCell>
                      {app.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Unverified
                        </span>
                      )}
                    </TableCell>
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

      <ApplicationFormDialog open={formOpen} onOpenChange={setFormOpen} defaultProfileId={profileIdFilter || undefined} />
    </div>
  );
}