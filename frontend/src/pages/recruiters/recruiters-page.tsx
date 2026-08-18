import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, BarChart3, Pencil, Trash2, Users, Sparkles, Shield, Award, Building2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { RecruiterFormDialog } from './recruiter-form-dialog';
import { RecruiterStatsDialog } from './recruiter-stats-dialog';
import { useDeleteRecruiter, useRecruiters, useToggleRecruiterStatus, useResetRecruiterPassword } from '@/hooks/use-recruiters';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { initials, timeAgo } from '@/lib/utils';
import { Role, Recruiter } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { CountUp } from '@/components/motion/count-up';

import { useSearchParams } from 'react-router-dom';

const ALL_ROLES = '__all__';

export default function RecruitersPage() {
  const { isAdmin, isTeamLeader } = usePermissions();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | typeof ALL_ROLES>(() => {
    if (roleParam) {
      if (roleParam === 'ALL') return ALL_ROLES;
      return roleParam as Role;
    }
    return ALL_ROLES;
  });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState<Recruiter | null>(null);
  const [statsRecruiterId, setStatsRecruiterId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recruiter | null>(null);
  const [resetTarget, setResetTarget] = useState<Recruiter | null>(null);

  useEffect(() => {
    if (roleParam) {
      if (roleParam === 'ALL') {
        setRoleFilter(ALL_ROLES);
      } else {
        setRoleFilter(roleParam as Role);
      }
    } else if (isAdmin) {
      setRoleFilter(ALL_ROLES);
    }
  }, [roleParam, isAdmin]);

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
  const resetPasswordMutation = useResetRecruiterPassword();

  const recruiters = data?.data ?? [];
  const totalRecruiters = data?.pagination?.total ?? 0;

  const handleToggle = async (recruiter: Recruiter, isActive: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id: recruiter.id, isActive });
      toast.success(`${recruiter.name} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecruiter.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      await resetPasswordMutation.mutateAsync(resetTarget.id);
      toast.success(`Password for ${resetTarget.name} has been reset to default Pass@123`);
      setResetTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const useVirtualization = recruiters.length > 10;

  return (
    <div className="space-y-5">
      <PremiumPageHeader
        icon={Users}
        title={isAdmin ? 'User Management' : isTeamLeader ? 'My Team' : 'Recruiter Management'}
        description={isAdmin ? 'Roster with avatars, live status, team allocation' : isTeamLeader ? "Manage your team's recruiters • Track performance & live status" : 'Create & manage recruiter accounts'}
        live={true}
        liveLabel={`${totalRecruiters} total users`}
        pills={[
          { label: 'Updated', icon: Activity },
          { label: `${recruiters.filter((r) => r.isActive).length} active`, icon: CheckCircle2 },
        ]}
        actions={
          !isTeamLeader ? (
            <Button variant="brand" onClick={() => { setEditingRecruiter(null); setFormOpen(true); }} className="gap-2 shadow-md shadow-mayzax-blue-200/30 bg-mayzax-gradient border-0 text-white hover:opacity-90 rounded-full px-5">
              <Plus className="h-4 w-4" /> {isAdmin ? 'New User' : 'New Recruiter'}
            </Button>
          ) : undefined
        }
        gradient="from-mayzax-blue-600 to-mayzax-green-600"
        bottomGradient="from-mayzax-blue-600 via-mayzax-green-500 to-mayzax-blue-600"
      />

      <Card className="border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900">
        <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input placeholder="Search by name or email..." className="pl-9 bg-white dark:bg-slate-800 shadow-sm rounded-full border-slate-200 dark:border-slate-700 dark:text-white" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {isAdmin && (
            <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value as typeof roleFilter); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-800 rounded-full shadow-sm border-slate-200 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="RECRUITER">Recruiters</SelectItem>
                <SelectItem value="TEAM_LEADER">Team Leaders</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
                <SelectItem value="RESUME_ASSIST">Resume Assistants</SelectItem>
                <SelectItem value="SALES_EXEC">Sales Executives</SelectItem>
                <SelectItem value={ALL_ROLES}>All Roles</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 shadow-sm hidden sm:inline">{totalRecruiters} roster</span>
            <div className="flex items-center gap-1.5 text-[11px] text-mayzax-blue-700 dark:text-mayzax-blue-400 bg-mayzax-blue-50 dark:bg-mayzax-blue-950/20 border border-mayzax-blue-200 dark:border-mayzax-blue-900/30 rounded-full px-3 py-1 shadow-sm">
              <Sparkles className="h-3 w-3" />
              Virtualized
            </div>
          </div>
        </div>

        {isLoading && <div className="p-4"><TableSkeleton rows={6} cols={6} /></div>}
        {isError && <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>}

        {!isLoading && !isError && recruiters.length === 0 && (
          <div className="p-6">
            <EmptyState icon={Users} title="No recruiters found" description={search ? 'Try adjusting search' : 'Create your first recruiter account.'} action={!search && !isTeamLeader && <Button variant="brand" size="sm" onClick={() => setFormOpen(true)} className="rounded-full">New Recruiter</Button>} />
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
                  <div className="grid grid-cols-[1.8fr_0.6fr_1fr_0.7fr_0.8fr_0.5fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-850/80">
                    <span>Name</span>
                    <span>Role</span>
                    {isAdmin && roleFilter === 'RECRUITER' ? <span>Team Leader</span> : <span>Status</span>}
                    {isAdmin && roleFilter === 'RECRUITER' ? <span>Status</span> : <span>Last Active</span>}
                    <span>Last Active</span>
                    <span className="text-right">Actions</span>
                  </div>
                }
                renderRow={(recruiter: Recruiter) => (
                  <div className="grid grid-cols-[1.8fr_0.6fr_1fr_0.7fr_0.8fr_0.5fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-mayzax-blue-50/30 dark:hover:bg-slate-800/40 transition-colors items-center group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-mayzax-gradient rounded-full blur-[2px] opacity-0 group-hover:opacity-30 transition-opacity" />
                        <Avatar className="relative h-9 w-9 ring-2 ring-white dark:ring-slate-800 shadow-sm group-hover:ring-mayzax-blue-100">
                          <AvatarFallback className="bg-mayzax-gradient text-white font-bold text-xs">{initials(recruiter.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-mayzax-blue-750 dark:group-hover:text-mayzax-blue-400">{recruiter.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{recruiter.email}</p>
                      </div>
                    </div>
                    <div>
                      <Badge className={`${recruiter.role === 'ADMIN' ? 'bg-mayzax-blue-600 text-white border-0' : recruiter.role === 'TEAM_LEADER' ? 'bg-amber-500 text-white border-0' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'} text-[11px] rounded-full`}>{recruiter.role === 'TEAM_LEADER' ? 'TL' : recruiter.role}</Badge>
                    </div>
                    {isAdmin && roleFilter === 'RECRUITER' ? (
                      recruiter.createdBy ? (
                        <div className="text-xs"><p className="font-medium text-slate-800 dark:text-slate-200 truncate">{recruiter.createdBy.name}</p><p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{recruiter.createdBy.teamName || ''}</p></div>
                      ) : <span className="text-xs text-slate-400">None</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} className="scale-90 data-[state=checked]:bg-mayzax-green-600" />
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">{recruiter.isActive ? <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500 animate-pulse" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />}{recruiter.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    )}
                    {isAdmin && roleFilter === 'RECRUITER' ? (
                      <div className="flex items-center gap-2"><Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} className="scale-90" /></div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(recruiter.lastActiveAt)}</div>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block">{timeAgo(recruiter.lastActiveAt)}</div>
                    <div className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          {recruiter.role !== 'CLIENT' && (
                            <DropdownMenuItem onClick={() => setStatsRecruiterId(recruiter.id)} className="gap-2">
                              <BarChart3 className="h-4 w-4" /> View Stats
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              {recruiter.role !== 'CLIENT' && (
                                <DropdownMenuItem onClick={() => { setEditingRecruiter(recruiter); setFormOpen(true); }} className="gap-2">
                                  <Pencil className="h-4 w-4" /> Edit User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setResetTarget(recruiter)} className="gap-2">
                                <Shield className="h-4 w-4 text-amber-500" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteTarget(recruiter)} className="text-red-600 focus:text-red-600 gap-2">
                                <Trash2 className="h-4 w-4" /> Delete User
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
                  <TableRow className="bg-slate-50/40 dark:bg-slate-850/40 dark:border-slate-800">
                    <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Name</TableHead>
                    <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Role</TableHead>
                    {isAdmin && roleFilter === 'RECRUITER' && <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Team Leader</TableHead>}
                    <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Last Active</TableHead>
                    <TableHead className="text-right font-semibold pr-6 text-slate-500 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruiters.map((recruiter, i) => (
                    <motion.tr key={recruiter.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }} className="border-b dark:border-slate-800 last:border-0 hover:bg-mayzax-blue-50/20 dark:hover:bg-slate-800/40 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="ring-2 ring-white dark:ring-slate-800 shadow-sm group-hover:ring-mayzax-blue-100"><AvatarFallback className="bg-mayzax-gradient text-white font-bold">{initials(recruiter.name)}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{recruiter.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{recruiter.email}</p></div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${recruiter.role === 'ADMIN' ? 'bg-mayzax-blue-600 text-white' : recruiter.role === 'TEAM_LEADER' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} rounded-full border-0`}>{recruiter.role === 'TEAM_LEADER' ? 'Team Leader' : recruiter.role}</Badge>
                      </TableCell>
                      {isAdmin && roleFilter === 'RECRUITER' && (
                        <TableCell>{recruiter.createdBy ? <div><span className="text-sm font-medium text-slate-850 dark:text-slate-200">{recruiter.createdBy.name}</span>{recruiter.createdBy.teamName && <span className="block text-xs text-slate-500 dark:text-slate-450">{recruiter.createdBy.teamName}</span>}</div> : <span className="text-xs text-slate-400">None</span>}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2"><Switch checked={recruiter.isActive} onCheckedChange={(checked) => handleToggle(recruiter, checked)} disabled={toggleStatus.isPending || isTeamLeader} /><span className="text-xs text-slate-700 dark:text-slate-350">{recruiter.isActive ? 'Active' : 'Inactive'}</span></div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">{timeAgo(recruiter.lastActiveAt)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent align="end" className="rounded-xl">
                            {recruiter.role !== 'CLIENT' && (
                              <DropdownMenuItem onClick={() => setStatsRecruiterId(recruiter.id)} className="gap-2">
                                <BarChart3 className="h-4 w-4" /> View Stats
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <>
                                {recruiter.role !== 'CLIENT' && (
                                  <DropdownMenuItem onClick={() => { setEditingRecruiter(recruiter); setFormOpen(true); }} className="gap-2">
                                    <Pencil className="h-4 w-4" /> Edit User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setResetTarget(recruiter)} className="gap-2">
                                  <Shield className="h-4 w-4 text-amber-500" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(recruiter)} className="text-red-600 focus:text-red-600 gap-2">
                                  <Trash2 className="h-4 w-4" /> Delete User
                                </DropdownMenuItem>
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
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-850/30">
              <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

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
            <DialogDescription>Delete <span className="font-semibold">{deleteTarget?.name}</span>? Assigned profiles will be unassigned.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRecruiter.isPending} className="rounded-full">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Shield className="h-4 w-4" />
              </div>
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset <span className="font-semibold">{resetTarget?.name}</span>'s password to default <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-700 dark:text-amber-400">Pass@123</span>? This will also clear their security question data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)} className="rounded-full">Cancel</Button>
            <Button variant="brand" onClick={handleResetPassword} disabled={resetPasswordMutation.isPending} className="rounded-full bg-amber-600 hover:bg-amber-700 text-white border-0">Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
