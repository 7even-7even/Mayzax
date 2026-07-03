import { useState } from 'react';
import { ExternalLink, FileText, Plus, Search } from 'lucide-react';
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
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { ApplicationStatus } from '@/types';

const ALL = '__all__';

export default function ApplicationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError, refetch } = useApplications({
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    page,
    pageSize: 12,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
  });

  const applications = data?.data ?? [];

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
          <Button variant="brand" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Log Application
          </Button>
        }
      />

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
              search || status !== ALL
                ? 'Try adjusting your search or filters.'
                : 'Log your first job application to start tracking submissions.'
            }
            action={
              !search &&
              status === ALL && (
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
                      <p className="text-sm font-medium text-slate-900">{app.companyName}</p>
                      <p className="text-xs text-slate-500">{app.jobTitle}</p>
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
