import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, BarChart3, Pencil, Trash2, Users, Sparkles, Shield, Award, Zap, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { RecruiterFormDialog } from './recruiter-form-dialog';
import { RecruiterStatsDialog } from './recruiter-stats-dialog';
import { useDeleteRecruiter, useRecruiters, useToggleRecruiterStatus } from '@/hooks/use-recruiters';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { initials, timeAgo } from '@/lib/utils';
import { Recruiter } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { CountUp } from '@/components/motion/count-up';

const ALL_ROLES = '__all__';

export default function RecruitersPage() {
  const { isAdmin, isTeamLeader } = usePermissions();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'RECRUITER' | 'TEAM_LEADER' | 'ADMIN' | typeof ALL_ROLES>('RECRUITER');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState<Recruiter | null>(null);
  const [statsRecruiterId, setStatsRecruiterId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recruiter | null>(null);

  const { data, isLoading, isError, refetch } = useRecruiters({
    search: debouncedSearch || undefined,
    role: roleFilter === ALL_ROLES ? undefined : roleFilter,
    page,
    pageSize: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const toggleStatus = useToggleRecruiterStatus();
  const deleteRecruiter = useDeleteRecruiter();

  const recruiters = data?.data ?? [];
  const totalRecruiters = data?.pagination?.total ?? 0;

  const handleToggle = async (recruiter: Recruiter, isActive: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id: recruiter.id, isActive });
      toast.success(`${recruiter.name} ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecruiter.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const useVirtualization = recruiters.length > 10;

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-white via-indigo-50/10 to-violet-50/20 p-[1px] shadow-sm">
          <div className="rounded-[19px] bg-white">
            <div className="p-6 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                      {isAdmin ? 'User Management' : isTeamLeader ? 'My Team' : 'Recruiter Management'}
                      <Badge className="bg-slate-900 text-white border-0 text-xs">
                        <CountUp value={totalRecruiters} /> users
                      </Badge>
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                      {isAdmin ? 'Manage admins, team leaders & recruiters • Premium roster with avatars & live status' : isTeamLeader ? "Manage your team's recruiters • Track performance & status" : 'Create & manage recruiter accounts'}
                    </p>
                  </div>
                </div>
                {!isTeamLeader && (
                  <Button
                    variant="brand"
                    onClick={() => {
                      setEditingRecruiter(null);
                      setFormOpen(true);
                    }}
                    className="gap-2 shadow-md shadow-indigo-500/20 rounded-full px-5"
                  >
                    <Plus className="h-4 w-4" /> {isAdmin ? 'New User' : 'New Recruiter'}
                  </Button>
                )}
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-teal-500" />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-100 px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search by name or email..." className="pl-9 bg-white shadow-sm rounded-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            {isAdmin && (
              <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value as typeof roleFilter); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48 bg-white rounded-full shadow-sm">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECRUITER">Recruiters</SelectItem>
                  <SelectItem value="TEAM_LEADER">Team Leaders</SelectItem>
                  <SelectItem value="ADMIN">Admins</SelectItem>
                  <SelectItem value={ALL_ROLES}>All Roles</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
              <Sparkles className="h-3 w-3 text-violet-500" />
              {totalRecruiters} roster • Virtualized
            </div>
          </div>

          {isLoading && <div className="p-4"><TableSkeleton rows={6} cols={6} /></div>}
          {isError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}

          {!isLoading && !isError && recruiters.length === 0 && (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No recruiters found"
                description={search ? 'Try adjusting search terms.' : 'Create your first recruiter account.'}
                action={
                  !search && !isTeamLeader && (
                    <Button variant="brand" size="sm" onClick={() => setFormOpen(true)} className="rounded-full">
                      <Plus className="h-4 w-4" /> New Recruiter
                    </Button>
                  )
                }
              />
            </div>
          )}

          {!isLoading && !isError && recruiters.length > 0 && (
            <>
              {useVirtualization ? (
                <VirtualizedTable
                  data={recruiters}
                  estimateRowHeight={72}
                  maxHeight="560px"
                  header={
                    <div className="grid grid-cols-[1.8fr_0.6fr_1fr_0.7fr_0.8fr_0.5fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                      <span>Name</span>
                      <span>Role</span>
                      {isAdmin && roleFilter === 'RECRUITER' ? <span>Team Leader</span> : <span>Status</span>}
                      {isAdmin && roleFilter === 'RECRUITER' ? <span>Status</span> : <span>Last Active</span>}
                      <span>Last Active</span>
                      <span className="text-right">Actions</span>
                    </div>
                  }
                  renderRow={(recruiter: Recruiter) => (
                    <div className="grid grid-cols-[1.8fr_0.6fr_1fr_0.7fr_0.8fr_0.5fr] gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/60 transition-colors items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs">{initials(recruiter.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{recruiter.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{recruiter.email}</p>
                        </div>
                      </div>
                      <div>
                        <Badge variant={recruiter.role === 'ADMIN' ? 'default' : recruiter.role === 'TEAM_LEADER' ? 'outline' : 'secondary'} className="text-[11px]">
                          {recruiter.role === 'TEAM_LEADER' ? 'TL' : recruiter.role}
                        </Badge>
                      </div>
                      {isAdmin && roleFilter === 'RECRUITER' ? (
                        recruiter.createdBy ? (
                          <div className="text-xs">
                            <p className="font-medium text-slate-800 truncate">{recruiter.createdBy.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{recruiter.createdBy.teamName || ''}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} className="scale-90" />
                          <span className="flex items-center gap-1 text-xs">
                            {recruiter.isActive ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-slate-400" />}
                            {recruiter.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                      {isAdmin && roleFilter === 'RECRUITER' ? (
                        <div className="flex items-center gap-2">
                          <Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} className="scale-90" />
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">{timeAgo(recruiter.lastActiveAt)}</div>
                      )}
                      <div className="text-xs text-slate-500 hidden xl:block">{timeAgo(recruiter.lastActiveAt)}</div>
                      <div className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => setStatsRecruiterId(recruiter.id)} className="gap-2">
                              <BarChart3 className="h-4 w-4" /> View Stats
                            </DropdownMenuItem>
                            {!isTeamLeader && (
                              <>
                                <DropdownMenuItem onClick={() => { setEditingRecruiter(recruiter); setFormOpen(true); }} className="gap-2">
                                  <Pencil className="h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(recruiter)} className="text-red-600 focus:text-red-600 gap-2">
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/40">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      {isAdmin && roleFilter === 'RECRUITER' && <TableHead className="font-semibold">Team Leader</TableHead>}
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Active</TableHead>
                      <TableHead className="text-right font-semibold pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiters.map((recruiter, i) => (
                      <motion.tr key={recruiter.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }} className="border-b last:border-0 hover:bg-indigo-50/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="ring-2 ring-white shadow-sm">
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold">{initials(recruiter.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{recruiter.name}</p>
                              <p className="text-xs text-slate-500">{recruiter.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={recruiter.role === 'ADMIN' ? 'default' : recruiter.role === 'TEAM_LEADER' ? 'outline' : 'secondary'} className="rounded-full">
                            {recruiter.role === 'TEAM_LEADER' ? 'Team Leader' : recruiter.role}
                          </Badge>
                        </TableCell>
                        {isAdmin && roleFilter === 'RECRUITER' && (
                          <TableCell>
                            {recruiter.createdBy ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">{recruiter.createdBy.name}</span>
                                {recruiter.createdBy.teamName && <span className="text-xs text-slate-500">{recruiter.createdBy.teamName}</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">None</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} />
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              {recruiter.isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                              {recruiter.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{timeAgo(recruiter.lastActiveAt)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem onClick={() => setStatsRecruiterId(recruiter.id)}><BarChart3 className="h-4 w-4 mr-2" /> View Stats</DropdownMenuItem>
                              {!isTeamLeader && (
                                <>
                                  <DropdownMenuItem onClick={() => { setEditingRecruiter(recruiter); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDeleteTarget(recruiter)} className="text-red-600 focus:text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="p-3 border-t border-slate-100">
                <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
              </div>
            </>
          )}
        </Card>
      </Reveal>

      <RecruiterFormDialog open={formOpen} onOpenChange={setFormOpen} recruiter={editingRecruiter} />
      <RecruiterStatsDialog recruiterId={statsRecruiterId} onOpenChange={(open) => !open && setStatsRecruiterId(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 className="h-4 w-4" />
              </div>
              Delete Recruiter
            </DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>? Assigned profiles will be unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRecruiter.isPending} className="rounded-full">
              Delete Recruiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
