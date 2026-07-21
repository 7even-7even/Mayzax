import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Plus, Search, MoreVertical, Pencil, Trash2, UserSquare2, Mail, Phone, User2, FileText, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
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
import { useAuth } from '@/context/auth-context';
import { ClientProfile } from '@/types';

export default function ProfilesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';

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
    pageSize: 12,
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
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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

  return (
    <div>
      <Reveal>
        <PageHeader
          title={isManager ? 'Client Profiles' : 'My Assigned Profiles'}
          description={
            isManager
              ? 'Manage candidate profiles and recruiter assignments.'
              : 'Candidate profiles currently assigned to you.'
          }
          actions={
            isManager ? (
              <Button
                variant="brand"
                onClick={() => {
                  setEditingProfile(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> New Profile
              </Button>
            ) : undefined
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone, or tech..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isManager && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Assigned To:</span>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium shadow-sm focus:border-mayzax-blue focus:outline-none focus:ring-1 focus:ring-mayzax-blue cursor-pointer"
                value={assignedRecruiterFilter}
                onChange={(e) => {
                  setAssignedRecruiterFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Recruiters</option>
                <option value="unassigned">Unassigned Profiles</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role === 'TEAM_LEADER' ? 'TL' : 'Recruiter'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
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
            search
              ? 'Try adjusting your search terms.'
              : isManager
                ? 'Create your first candidate profile to get started.'
                : 'No profiles have been assigned to you yet.'
          }
          action={
            !search && isManager && (
              <Button variant="brand" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New Profile
              </Button>
            )
          }
        />
      )}

      {!isLoading && !isError && profiles.length > 0 && (
        <>
          {isManager && (
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

                  <Button
                    variant="brand"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setBulkAssignOpen(true)}
                  >
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

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-400 hover:text-slate-700"
                    onClick={() => setSelectedProfileIds([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => {
              const isSelected = selectedProfileIds.includes(profile.id);
              return (
                <StaggerItem key={profile.id}>
                  <Card
                    className={`hover-lift group h-full overflow-hidden border-slate-200 cursor-pointer select-none transition ${
                      isSelected ? 'ring-2 ring-mayzax-blue bg-mayzax-blue-50/10' : ''
                    }`}
                    onDoubleClick={() => navigate(`/applications?profileId=${profile.id}`)}
                  >
                    <div className="h-1 w-full bg-mayzax-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {isManager && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-mayzax-blue focus:ring-mayzax-blue cursor-pointer shrink-0 mt-0.5"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectProfile(profile.id);
                              }}
                            />
                          )}
                          <motion.div
                            whileHover={{ rotate: 6, scale: 1.05 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mayzax-gradient text-sm font-bold text-white shadow-sm"
                          >
                            {profile.candidateName.charAt(0)}
                          </motion.div>
                          <div>
                            <p className="font-semibold text-slate-900">{profile.candidateName}</p>
                            <Badge variant="secondary" className="mt-1">
                              {profile.technology}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/applications?profileId=${profile.id}`)}
                            >
                              <FileText className="h-4 w-4 mr-2" /> View Applications
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingProfile(profile);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> {isManager ? 'Edit / Reassign' : 'Edit'}
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(profile)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-1.5 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> {profile.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" /> {profile.phone}
                        </div>
                      </div>

                      {profile.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-400">{profile.notes}</p>}

                      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                        <User2 className="h-3 w-3 text-slate-300" />
                        <p className="text-xs text-slate-400">
                          Assigned to{' '}
                          <span className="font-medium text-slate-600">
                            {profile.assignedRecruiterAssignments?.length
                              ? profile.assignedRecruiterAssignments.map((assignment) => assignment.recruiter.name).join(', ')
                              : profile.assignedRecruiter?.name ?? 'Unassigned'}
                          </span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      {/* Profile Create / Edit Dialog */}
      <ProfileFormDialog open={formOpen} onOpenChange={setFormOpen} profile={editingProfile} />

      {/* Bulk Assign / Reassign Dialog */}
      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        selectedProfileIds={selectedProfileIds}
        onSuccess={() => setSelectedProfileIds([])}
      />

      {/* Bulk Delete Confirm Dialog (Admin only) */}
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

      {/* Single Profile Delete Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.candidateName}</span>'s
              profile? This will not delete their past applications, but the profile will no longer be visible or
              assignable.
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
