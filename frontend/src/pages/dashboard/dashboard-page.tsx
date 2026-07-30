import { useState } from 'react';
import { Check, Pencil, Search, Target, Users, X, Sparkles, Zap, Trophy, Activity } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/motion/reveal';
import { SummaryCards } from './summary-cards';
import { RecruiterRow } from './recruiter-row';
import { LiveStatusCard } from './live-status-card';
import { useDashboardOverview, useGlobalSummary } from '@/hooks/use-analytics';
import { useDebounce } from '@/hooks/use-debounce';
import { useMyRecruiterStats, useUpdateMyTeamName } from '@/hooks/use-recruiters';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { PremiumPageHeader } from '@/components/shared/premium-page-header';

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
    try { await updateTeamName.mutateAsync(draft.trim() || null); toast.success('Team name updated'); setEditing(false); } catch { toast.error('Failed to update team name'); }
  };
  const handleCancel = () => setEditing(false);
  const handleGoalEdit = () => { setGoalDraft(String(shiftGoal)); setEditingGoal(true); };
  const handleGoalSave = () => {
    const val = parseInt(goalDraft, 10);
    if (!isNaN(val) && val > 0) { setShiftGoal(val); localStorage.setItem(SHIFT_GOAL_KEY, String(val)); }
    setEditingGoal(false);
  };

  return (
    <Card className="h-full flex flex-col border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-mayzax-blue-600 to-mayzax-green-600" />
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold dark:text-black">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white shadow-md">
              <Users className="h-4 w-4" />
            </div>
            My Team
          </CardTitle>
          {!editing && (
            <button onClick={handleEdit} className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        <CardDescription className="text-xs dark:text-black/80">Team identity • Shift goals • Performance</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 p-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-xl" />
          </div>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }} placeholder="Enter team name..." className="h-9 text-sm rounded-xl" />
            <button onClick={handleSave} disabled={updateTeamName.isPending} className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"><Check className="h-4 w-4" /></button>
            <button onClick={handleCancel} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2 dark:text-white">
              {currentTeamName || <span className="italic text-slate-400 dark:text-white">No team name set</span>}
              {currentTeamName && <Sparkles className="h-3.5 w-3.5 text-violet-500 dark:text-white" />}
            </p>
            <p className="text-xs text-slate-500 mt-1 dark:text-white/60"><span className="font-semibold text-slate-700 dark:text-white">{stats?.membersCount ?? 0}</span> team member{stats?.membersCount !== 1 ? 's' : ''} • Live roster</p>
          </div>
        )}

        <div className="mt-auto rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-slate-600">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white">
                <Target className="h-3.5 w-3.5" />
              </div>
              Shift Goal
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-1 dark:text-black">
                <input autoFocus type="number" min={1} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleGoalSave(); if (e.key === 'Escape') setEditingGoal(false); }} className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-right text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-200" />
                <button onClick={handleGoalSave} className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setEditingGoal(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button onClick={handleGoalEdit} className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
                {isLoading ? '—' : `${currentApps} / ${shiftGoal}`}
              </button>
            )}
          </div>

          {isLoading ? <Skeleton className="h-2.5 w-full rounded-full" /> : (
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full rounded-full ${goalMet ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-mayzax-blue-600 to-mayzax-green-600'}`} />
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          )}

          <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            {goalMet ? <><Trophy className="h-3 w-3 text-amber-500" /> Goal reached! {currentApps - shiftGoal > 0 ? `+${currentApps - shiftGoal} over` : ''}</> : <><Zap className="h-3 w-3 text-violet-500" />{shiftGoal - currentApps} more to hit target</>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isTeamLeader } = usePermissions();
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
    <div className="space-y-6">
      <PremiumPageHeader
        icon={Activity}
        title={isTeamLeader ? 'Team Command Center' : 'Admin Command Center'}
        description={isTeamLeader ? "Real-time pulse of your team's performance • Shift goals • Live availability" : 'Organization-wide recruiter performance • Premium analytics • Live team monitoring'}
        live={true}
        liveLabel="Live"
        gradient="from-slate-900 to-slate-700"
        bottomGradient="from-slate-900 via-violet-600 to-indigo-600"
      />

      <div className="space-y-6">
        {user?.role === 'TEAM_LEADER' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch">
            <div className="lg:col-span-2 h-full">
              <SummaryCards />
            </div>
            <div className="h-full">
              <TlTeamCard />
            </div>
          </div>
        ) : (
          <SummaryCards />
        )}
        <LiveStatusCard />
      </div>

      <Reveal delay={0.15}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recruiter Leaderboard</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Search, sort & expand for breakdown</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search recruiters..." className="pl-9 w-full sm:w-64 bg-white dark:bg-slate-800 dark:text-white rounded-full shadow-sm border-slate-200 dark:border-slate-700" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-52 bg-white dark:bg-slate-800 dark:text-white rounded-full shadow-sm border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      Sort by {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-0">
            {isLoading && <div className="p-4"><TableSkeleton rows={6} cols={6} /></div>}
            {isError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}

            {!isLoading && !isError && rows.length === 0 && (
              <div className="p-8">
                <EmptyState icon={Users} title="No recruiters found" description="Try adjusting your search." />
              </div>
            )}

            {!isLoading && !isError && rows.length > 0 && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 dark:bg-slate-850/60 dark:border-slate-800">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Recruiter</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Status</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Profiles</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Total Apps</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Current Shift</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider dark:text-slate-300">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <RecruiterRow key={row.id} row={row} index={i} expanded={expandedId === row.id} onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)} />
                    ))}
                  </TableBody>
                </Table>
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30">
                  <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
