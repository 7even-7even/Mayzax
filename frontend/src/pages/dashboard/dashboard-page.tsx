import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Reveal } from '@/components/motion/reveal';
import { SummaryCards } from './summary-cards';
import { RecruiterRow } from './recruiter-row';
import { useDashboardOverview } from '@/hooks/use-analytics';
import { useDebounce } from '@/hooks/use-debounce';

const sortOptions = [
  { value: 'totalApplications', label: 'Total Applications' },
  { value: 'assignedProfiles', label: 'Assigned Profiles' },
  { value: 'name', label: 'Name' },
  { value: 'lastActiveAt', label: 'Last Active' },
];

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('totalApplications');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isError, refetch } = useDashboardOverview({
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder: 'desc',
    page,
    pageSize: 10,
  });

  const rows = data?.data ?? [];

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Admin Dashboard"
          description="Real-time overview of recruiter performance across Mayzax ATS."
        />
      </Reveal>

      <div className="mb-6">
        <SummaryCards />
      </div>

      <Reveal delay={0.15}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search recruiters..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={0.2} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading && <TableSkeleton rows={6} cols={6} />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState icon={Users} title="No recruiters found" description="Try adjusting your search." />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recruiter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Profiles</TableHead>
                  <TableHead>Total Applications</TableHead>
                  <TableHead>Current Shift</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <RecruiterRow
                    key={row.id}
                    row={row}
                    index={i}
                    expanded={expandedId === row.id}
                    onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  />
                ))}
              </TableBody>
            </Table>
            <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
          </>
        )}
      </Reveal>
    </div>
  );
}
