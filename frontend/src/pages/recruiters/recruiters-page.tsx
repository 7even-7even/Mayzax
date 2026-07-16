import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, BarChart3, Pencil, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/context/auth-context';

const ALL_ROLES = '__all__';

export default function RecruitersPage() {
  const { user } = useAuth();
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
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const toggleStatus = useToggleRecruiterStatus();
  const deleteRecruiter = useDeleteRecruiter();

  const recruiters = data?.data ?? [];

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

  return (
    <div>
      <Reveal>
        <PageHeader
          title={
            user?.role === 'ADMIN'
              ? 'User Management'
              : user?.role === 'TEAM_LEADER'
              ? 'My Team'
              : 'Recruiter Management'
          }
          description={
            user?.role === 'ADMIN'
              ? 'Manage admin, team leader, and recruiter accounts.'
              : user?.role === 'TEAM_LEADER'
              ? "Manage your team's recruiters and monitor stats."
              : 'Create, manage, and monitor recruiter accounts across Mayzax ATS.'
          }
          actions={
            <Button
              variant="brand"
              onClick={() => {
                setEditingRecruiter(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />{' '}
              {user?.role === 'ADMIN' ? 'New User' : 'New Recruiter'}
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {user?.role === 'ADMIN' && (
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as typeof roleFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
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
        </div>
      </Reveal>

      <Reveal delay={0.1} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading && <TableSkeleton rows={6} cols={6} />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && recruiters.length === 0 && (
          <EmptyState
            icon={Users}
            title="No recruiters found"
            description={search ? 'Try adjusting your search terms.' : 'Create your first recruiter account to get started.'}
            action={
              !search && (
                <Button variant="brand" size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> New Recruiter
                </Button>
              )
            }
          />
        )}

        {!isLoading && !isError && recruiters.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-[80px]">Name</TableHead>
                  <TableHead className="pl-[40px]">Role</TableHead>
                  <TableHead className="pl-[40px]">Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right pr-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruiters.map((recruiter, i) => (
                  <motion.tr
                    key={recruiter.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                    className="border-b transition-colors last:border-0 hover:bg-mayzax-blue-50/40"
                  >
                    <TableCell>
                      <div className="group flex items-center gap-3">
                        <motion.div whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                          <Avatar className="ring-2 ring-white transition-shadow group-hover:ring-mayzax-blue-100">
                            <AvatarFallback>{initials(recruiter.name)}</AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{recruiter.name}</p>
                          <p className="text-xs text-slate-500">{recruiter.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          recruiter.role === 'ADMIN'
                            ? 'default'
                            : recruiter.role === 'TEAM_LEADER'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {recruiter.role === 'TEAM_LEADER' ? 'Team Leader' : recruiter.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={recruiter.isActive}
                          onCheckedChange={(checked) => handleToggle(recruiter, checked)}
                          disabled={toggleStatus.isPending}
                        />
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          {recruiter.isActive && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                          )}
                          {recruiter.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 pl-[30px]">{timeAgo(recruiter.lastActiveAt)}</TableCell>
                    <TableCell className="text-right pr-[80px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setStatsRecruiterId(recruiter.id)}>
                            <BarChart3 className="h-4 w-4 mr-2" /> View Stats
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingRecruiter(recruiter);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(recruiter)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
            <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
          </>
        )}
      </Reveal>

      <RecruiterFormDialog open={formOpen} onOpenChange={setFormOpen} recruiter={editingRecruiter} />
      <RecruiterStatsDialog recruiterId={statsRecruiterId} onOpenChange={(open) => !open && setStatsRecruiterId(null)} />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recruiter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>? Their
              assigned profiles will be unassigned. This action can be reversed only by an administrator with
              database access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRecruiter.isPending}>
              Delete Recruiter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
