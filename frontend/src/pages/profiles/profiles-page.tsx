import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Plus, Search, MoreVertical, Pencil, Trash2, UserSquare2, Mail, Phone, User2, FileText, Sparkles, Briefcase, Users, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { ProfileFormDialog } from './profile-form-dialog';
import { BulkAssignDialog } from './bulk-assign-dialog';
import { useDeleteProfile, useProfiles, useBulkDeleteProfiles } from '@/hooks/use-profiles';
import { useRecruiters } from '@/hooks/use-recruiters';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionGate } from '@/components/shared/permission-gate';
import { ClientProfile } from '@/types';
import { VirtualizedGrid } from '@/components/shared/virtualized-table';

export default function ProfilesPage() {
  const { isAdmin, isManager, canCreateProfile, canDeleteProfile, canBulkProfile } = usePermissions();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [assignedRecruiterFilter, setAssignedRecruiterFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ClientProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: recruitersData } = useRecruiters({
    isActive: true,
    pageSize: 100,
  });
  const recruiters = recruitersData?.data ?? [];

  const { data, isLoading, isError, refetch } = useProfiles({
    search: debouncedSearch || undefined,
    assignedRecruiterId: assignedRecruiterFilter === 'ALL' ? undefined : assignedRecruiterFilter,
    page,
    pageSize: 24, // increased for virtualization demo, still paginated server-side
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const deleteProfile = useDeleteProfile();
  const bulkDeleteMutation = useBulkDeleteProfiles();
  const profiles = data?.data ?? [];

  const allSelectedOnPage = profiles.length > 0 && profiles.every((p) => selectedProfileIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      const pageIds = new Set(profiles.map((p) => p.id));
      setSelectedProfileIds(selectedProfileIds.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = profiles.map((p) => p.id);
      setSelectedProfileIds(Array.from(new Set([...selectedProfileIds, ...pageIds])));
    }
  };

  const toggleSelectProfile = (id: string) => {
    setSelectedProfileIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProfile.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.candidateName}'s profile removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const useVirtualization = profiles.length > 12;

  const profileCard = useMemo(
    () => (profile: ClientProfile) => {
      const isSelected = selectedProfileIds.includes(profile.id);
      return (
        <Card
          className={`group relative h-full overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm cursor-pointer select-none transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-slate-700/60 dark:bg-slate-900 ${
            isSelected ? 'ring-2 ring-mayzax-blue-500 shadow-lg shadow-mayzax-blue-200/30 dark:ring-mayzax-blue-400' : 'hover:border-mayzax-blue-200 dark:hover:border-mayzax-blue-800'
          }`}
          onDoubleClick={() => navigate(`/applications?profileId=${profile.id}`)}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-mayzax-gradient opacity-80 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <PermissionGate permission="bulk:profile">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded-lg border-slate-300 text-mayzax-blue-600 focus:ring-mayzax-blue-500 cursor-pointer shrink-0" checked={isSelected} onChange={(e) => { e.stopPropagation(); toggleSelectProfile(profile.id); }} />
                </PermissionGate>
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mayzax-gradient text-base font-bold text-white shadow-md shadow-mayzax-blue-200/30">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                  <span className="relative">{profile.candidateName.charAt(0).toUpperCase()}</span>
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[15px] text-slate-900 dark:text-white truncate">{profile.candidateName}</p>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge className="bg-mayzax-blue-50 text-mayzax-blue-700 border border-mayzax-blue-200 text-[11px] rounded-full px-2 py-0">{profile.technology}</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Live</span>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => navigate(`/applications?profileId=${profile.id}`)} className="gap-2"><FileText className="h-4 w-4" /> View Applications</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setEditingProfile(profile); setFormOpen(true); }} className="gap-2"><Pencil className="h-4 w-4" /> {isManager ? 'Edit / Reassign' : 'Edit'}</DropdownMenuItem>
                  {canDeleteProfile && <DropdownMenuItem onClick={() => setDeleteTarget(profile)} className="text-red-600 focus:text-red-600 gap-2"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">Double-click to view applications</p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                <Mail className="h-3 w-3" /> {profile.email}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300">
                <Phone className="h-3 w-3" /> {profile.phone}
              </span>
            </div>

            {profile.notes && <div className="mt-3 rounded-xl bg-amber-50/50 border border-amber-100 p-2.5 dark:bg-amber-950/20 dark:border-amber-900/30"><p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{profile.notes}</p></div>}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex -space-x-1.5 shrink-0">
                  {(profile.assignedRecruiterAssignments?.length ? profile.assignedRecruiterAssignments : profile.assignedRecruiter ? [profile.assignedRecruiter] : []).map((a: any, idx: number) => (
                    <div key={idx} title={a.recruiter?.name || a.name || '?'} className="flex h-6 w-6 items-center justify-center rounded-full bg-mayzax-gradient text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{(a.recruiter?.name || a.name || '?').charAt(0)}</div>
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={profile.assignedRecruiterAssignments?.length ? profile.assignedRecruiterAssignments.map((a: any) => a.recruiter?.name || a.name || '?').join(', ') : profile.assignedRecruiter?.name || 'Unassigned'}>
                  {profile.assignedRecruiterAssignments?.length 
                    ? profile.assignedRecruiterAssignments.map((a: any) => a.recruiter?.name || a.name || '?').join(', ') 
                    : profile.assignedRecruiter?.name 
                      ? profile.assignedRecruiter.name 
                      : 'Unassigned'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0"><Briefcase className="h-3 w-3" /> View apps</span>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-mayzax-blue-600 via-mayzax-green-500 to-mayzax-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </Card>
      );
    },
    [selectedProfileIds, isManager, canDeleteProfile]
  );


  return (
    <div className="space-y-5">
      <PremiumPageHeader
        icon={isManager ? Briefcase : User2}
        title={isManager ? 'Clients Vault' : 'My Assigned Profiles'}
        description={isManager ? 'Vault of candidate profiles • Assignment up to 5 recruiters' : 'Candidate profiles currently assigned to you'}
        live={true}
        liveLabel={`${data?.pagination?.total ?? profiles.length} profiles`}
        pills={[
          { label: 'Updated ', icon: Activity },
          ...(isManager ? [{ label: `${recruiters.length} recruiters`, icon: Users } as const] : []),
        ]}  
        actions={
          canCreateProfile ? (
            <Button variant="brand" onClick={() => { setEditingProfile(null); setFormOpen(true); }} className="gap-2 shadow-md shadow-mayzax-blue-200/30 bg-mayzax-gradient border-0 text-white hover:opacity-90 rounded-full px-5">
              <Plus className="h-4 w-4" /> New Profile
            </Button>
          ) : undefined
        }
        gradient="from-mayzax-blue-600 to-mayzax-green-600"
        bottomGradient="from-mayzax-blue-600 via-mayzax-green-500 to-mayzax-blue-600"
      />

      <Reveal delay={0.05}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone, or tech..."
              className="pl-9 bg-white shadow-sm rounded-full border-slate-200"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isManager && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Assigned To:</span>
              <select
                className="h-7 rounded-full border-0 bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                value={assignedRecruiterFilter}
                onChange={(e) => {
                  setAssignedRecruiterFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Recruiters</option>
                <option value="unassigned">Unassigned</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role === 'TEAM_LEADER' ? 'TL' : 'Recruiter'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-sm hidden sm:inline">
              {data?.pagination?.total ?? profiles.length} profiles
            </span>
            {useVirtualization && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-3 py-1 shadow-sm">
                <Sparkles className="h-3 w-3" />
                Virtualized
              </div>
            )}
          </div>
        </div>

        {/* Enhanced filtering chips */}
        {(search || assignedRecruiterFilter !== 'ALL') && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {search && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-medium">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
                  <span className="text-[10px]">✕</span>
                </button>
              </span>
            )}
            {assignedRecruiterFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 text-xs font-medium">
                Assigned: {assignedRecruiterFilter === 'unassigned' ? 'Unassigned' : recruiters.find((r) => r.id === assignedRecruiterFilter)?.name || assignedRecruiterFilter}
                <button onClick={() => setAssignedRecruiterFilter('ALL')} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200 hover:bg-indigo-300">
                  <span className="text-[10px]">✕</span>
                </button>
              </span>
            )}
            <button onClick={() => { setSearch(''); setAssignedRecruiterFilter('ALL'); }} className="text-xs text-slate-500 hover:text-red-600">Clear all filters</button>
          </div>
        )}
      </Reveal>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <TableSkeleton rows={3} cols={1} />
            </Card>
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && profiles.length === 0 && (
        <EmptyState
          icon={UserSquare2}
          title="No client profiles found"
          description={
            search ? 'Try adjusting your search terms.' : isManager ? 'Create your first candidate profile to get started.' : 'No profiles have been assigned to you yet.'
          }
          action={
            !search && canCreateProfile && (
              <Button variant="brand" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New Profile
              </Button>
            )
          }
        />
      )}

      {!isLoading && !isError && profiles.length > 0 && (
        <>
          {canBulkProfile && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-mayzax-blue focus:ring-mayzax-blue cursor-pointer"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAll}
                />
                <span>Select All ({profiles.length})</span>
              </label>

              {selectedProfileIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-mayzax-blue-50 px-2.5 py-0.5 text-xs font-bold text-mayzax-blue border border-mayzax-blue-200">
                    {selectedProfileIds.length} Selected
                  </span>

                  <Button variant="brand" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkAssignOpen(true)}>
                    <User2 className="h-3.5 w-3.5" /> Reassign ({selectedProfileIds.length})
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedProfileIds.length})
                    </Button>
                  )}

                  <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-slate-700" onClick={() => setSelectedProfileIds([])}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          {useVirtualization ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <VirtualizedGrid data={profiles} columns={3} estimateRowHeight={200} gap={16} renderItem={(p) => profileCard(p as ClientProfile)} />
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <StaggerItem key={profile.id}>{profileCard(profile)}</StaggerItem>
              ))}
            </StaggerContainer>
          )}

          <div className="mt-4">
            <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
          </div>
        </>
      )}

      <ProfileFormDialog open={formOpen} onOpenChange={setFormOpen} profile={editingProfile} />

      <BulkAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} selectedProfileIds={selectedProfileIds} onSuccess={() => setSelectedProfileIds([])} />

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Profiles</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-slate-900">{selectedProfileIds.length}</span> client profiles? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={async () => {
                try {
                  await bulkDeleteMutation.mutateAsync(selectedProfileIds);
                  toast.success(`Successfully deleted ${selectedProfileIds.length} profiles.`);
                  setSelectedProfileIds([]);
                  setBulkDeleteOpen(false);
                } catch (err) {
                  toast.error(extractErrorMessage(err));
                }
              }}
            >
              {bulkDeleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete {selectedProfileIds.length} Profiles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.candidateName}</span>'s profile? This will not delete their past applications, but the profile will no longer be visible or assignable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProfile.isPending}>
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
