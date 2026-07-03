import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Pencil, Trash2, UserSquare2, Mail, Phone, User2 } from 'lucide-react';
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
import { useDeleteProfile, useProfiles } from '@/hooks/use-profiles';
import { useDebounce } from '@/hooks/use-debounce';
import { extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { ClientProfile } from '@/types';

export default function ProfilesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ClientProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);

  const { data, isLoading, isError, refetch } = useProfiles({
    search: debouncedSearch || undefined,
    page,
    pageSize: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const deleteProfile = useDeleteProfile();
  const profiles = data?.data ?? [];

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
          title={isAdmin ? 'Client Profiles' : 'My Assigned Profiles'}
          description={
            isAdmin
              ? 'Manage candidate profiles and recruiter assignments.'
              : 'Candidate profiles currently assigned to you.'
          }
          actions={
            <Button
              variant="brand"
              onClick={() => {
                setEditingProfile(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New Profile
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative w-full max-w-sm">
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
              : isAdmin
                ? 'Create your first candidate profile to get started.'
                : 'No profiles have been assigned to you yet.'
          }
          action={
            !search && (
              <Button variant="brand" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New Profile
              </Button>
            )
          }
        />
      )}

      {!isLoading && !isError && profiles.length > 0 && (
        <>
          <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <StaggerItem key={profile.id}>
                <Card className="hover-lift group h-full overflow-hidden border-slate-200">
                  <div className="h-1 w-full bg-mayzax-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
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
                            onClick={() => {
                              setEditingProfile(profile);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(profile)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
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
                          {profile.assignedRecruiter?.name ?? 'Unassigned'}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <PaginationControls pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <ProfileFormDialog open={formOpen} onOpenChange={setFormOpen} profile={editingProfile} />

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
