import { useState } from 'react';
import { Check, Pencil, Search, Target, Users, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { useAuth } from '@/context/auth-context';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Reveal } from '@/components/motion/reveal';
import { SummaryCards } from './summary-cards';
import { RecruiterRow } from './recruiter-row';
import { LiveStatusCard } from './live-status-card';
import { useDashboardOverview, useGlobalSummary } from '@/hooks/use-analytics';
import { useDebounce } from '@/hooks/use-debounce';
import { useMyRecruiterStats, useUpdateMyTeamName } from '@/hooks/use-recruiters';
import { toast } from 'sonner';

const sortOptions = [
  { value: 'totalApplications', label: 'Total Applications' },
  { value: 'assignedProfiles', label: 'Assigned Profiles' },
  { value: 'name', label: 'Name' },
  { value: 'lastActiveAt', label: 'Last Active' },
];

const SHIFT_GOAL_KEY = 'mayzax_tl_shift_goal';
const DEFAULT_GOAL = 20;

function TlTeamCard() {
  const { data: stats, isLoading: statsLoading } = useMyRecruiterStats();
  const { data: summary, isLoading: summaryLoading } = useGlobalSummary();
  const updateTeamName = useUpdateMyTeamName();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [shiftGoal, setShiftGoal] = useState(() => {
    const saved = localStorage.getItem(SHIFT_GOAL_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_GOAL;
  });

  const isLoading = statsLoading || summaryLoading;
  const currentTeamName = stats?.recruiter?.teamName ?? '';
  const currentApps = summary?.currentShiftApplications ?? 0;
  const pct = shiftGoal > 0 ? Math.min(100, Math.round((currentApps / shiftGoal) * 100)) : 0;
  const goalMet = currentApps >= shiftGoal && shiftGoal > 0;

  const handleEdit = () => { setDraft(currentTeamName); setEditing(true); };
  const handleSave = async () => {
    try {
      await updateTeamName.mutateAsync(draft.trim() || null);
      toast.success('Team name updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update team name');
    }
  };
  const handleCancel = () => setEditing(false);

  const handleGoalEdit = () => { setGoalDraft(String(shiftGoal)); setEditingGoal(true); };
  const handleGoalSave = () => {
    const val = parseInt(goalDraft, 10);
    if (!isNaN(val) && val > 0) {
      setShiftGoal(val);
      localStorage.setItem(SHIFT_GOAL_KEY, String(val));
    }
    setEditingGoal(false);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-purple-500" /> My Team
          </CardTitle>
          {!editing && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Edit team name"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
        <CardDescription>Your team name and member count.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Team name / edit row */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
              placeholder="Enter team name..."
              className="h-8 text-sm"
            />
            <button onClick={handleSave} disabled={updateTeamName.isPending} className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 transition-colors">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={handleCancel} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">
              {currentTeamName || <span className="italic text-slate-400">No team name set yet</span>}
            </p>
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{stats?.membersCount ?? 0}</span>{' '}
              team member{stats?.membersCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Shift Goal */}
        <div className="mt-auto rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Target className="h-3.5 w-3.5 text-purple-500" />
              Shift Goal
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); if (e.key === 'Escape') setEditingGoal(false); }}
                  className="w-16 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <button onClick={handleGoalSave} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingGoal(false)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoalEdit}
                className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
              >
                {isLoading ? '…' : `${currentApps} / ${shiftGoal} apps`}
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading ? (
            <Skeleton className="h-2 w-full rounded-full" />
          ) : (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  goalMet ? 'bg-emerald-500' : 'bg-purple-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            {isLoading ? '' : goalMet
              ? `🎉 Goal reached! ${currentApps - shiftGoal > 0 ? `+${currentApps - shiftGoal} over target` : ''}`
              : `${shiftGoal - currentApps} more to hit today's target`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
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
          title={user?.role === 'TEAM_LEADER' ? 'TL Dashboard' : 'Admin Dashboard'}
          description={
            user?.role === 'TEAM_LEADER'
              ? "Real-time overview of your team's recruiter performance."
              : 'Real-time overview of recruiter performance across Mayzax ATS.'
          }
        />
      </Reveal>

      <div className="mb-6 space-y-6">
        {user?.role === 'TEAM_LEADER' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            <div className="lg:col-span-2 h-full">
              <SummaryCards />
            </div>
            <div className="h-full">
              <TlTeamCard />
            </div>
          </div>
        )}
        {user?.role !== 'TEAM_LEADER' && <SummaryCards />}
        <LiveStatusCard />
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
