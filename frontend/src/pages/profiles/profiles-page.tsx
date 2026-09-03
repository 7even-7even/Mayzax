import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Plus, Search, MoreVertical, Pencil, Trash2, UserSquare2, Mail, Phone, User2, FileText, Sparkles, Briefcase, Users, Activity, Eye, Calendar, UserCheck, MapPin, Award, CheckCircle, ShieldCheck, Upload, Key, CreditCard } from 'lucide-react';
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
import { useDeleteProfile, useProfiles, useBulkDeleteProfiles, useResetClientPassword, useArchiveProfile, useUnarchiveProfile, useMergeProfiles, useBulkArchiveProfiles } from '@/hooks/use-profiles';
import { useRecruiters } from '@/hooks/use-recruiters';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient, extractErrorMessage } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';
import { PermissionGate } from '@/components/shared/permission-gate';
import { ClientProfile } from '@/types';
import { VirtualizedGrid } from '@/components/shared/virtualized-table';

export default function ProfilesPage() {
  const { user } = useAuth();
  const { isAdmin, isManager, isTeamLeader, canCreateProfile, canDeleteProfile, canBulkProfile } = usePermissions();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [assignedRecruiterFilter, setAssignedRecruiterFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const debouncedSearch = useDebounce(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ClientProfile | null>(null);
  const [viewingProfile, setViewingProfile] = useState<ClientProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProfileForPayment, setSelectedProfileForPayment] = useState<ClientProfile | null>(null);
  const [selectedProfileForInterview, setSelectedProfileForInterview] = useState<ClientProfile | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);

  const mergeMutation = useMergeProfiles();
  const bulkArchiveMutation = useBulkArchiveProfiles();

  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false);
  const [interviewFormOpen, setInterviewFormOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any | null>(null);

  const [interviewCalls, setInterviewCalls] = useState<any[]>([]);
  const [isLoadingInterviewCalls, setIsLoadingInterviewCalls] = useState(false);
  const [interviewCallFormOpen, setInterviewCallFormOpen] = useState(false);

  const fetchInterviews = async (profileId: string) => {
    setIsLoadingInterviews(true);
    try {
      const { data } = await apiClient.get(`/profiles/${profileId}/interviews`);
      setInterviews(data.data || []);
    } catch (err) {
      console.error('Failed to load interviews', err);
    } finally {
      setIsLoadingInterviews(false);
    }
  };

  const fetchInterviewCalls = async (profileId: string) => {
    setIsLoadingInterviewCalls(true);
    try {
      const { data } = await apiClient.get(`/profiles/${profileId}/interview-calls`);
      setInterviewCalls(data.data || []);
    } catch (err) {
      console.error('Failed to load interview calls', err);
    } finally {
      setIsLoadingInterviewCalls(false);
    }
  };

  useEffect(() => {
    if (viewingProfile?.id) {
      fetchInterviews(viewingProfile.id);
      fetchInterviewCalls(viewingProfile.id);
    } else {
      setInterviews([]);
      setInterviewCalls([]);
    }
  }, [viewingProfile?.id]);

  const { data: recruitersData } = useRecruiters({
    isActive: true,
    pageSize: 100,
  });
  const rawRecruiters = useMemo(() => {
    return (recruitersData?.data ?? []).filter(
      (r) => r.role === 'RECRUITER' || r.role === 'TEAM_LEADER'
    );
  }, [recruitersData]);
  const recruiters = useMemo(() => {
    if (isTeamLeader && user) {
      const exists = rawRecruiters.some((r) => r.id === user.id);
      if (!exists) {
        return [
          {
            id: user.id,
            name: `${user.name} (Me)`,
            email: user.email,
            role: 'TEAM_LEADER',
            isActive: true,
            createdAt: user.createdAt,
          } as any,
          ...rawRecruiters,
        ];
      }
    }
    return rawRecruiters;
  }, [rawRecruiters, isTeamLeader, user]);

  const { data, isLoading, isError, refetch } = useProfiles({
    search: debouncedSearch || undefined,
    assignedRecruiterId: assignedRecruiterFilter === 'ALL' ? undefined : assignedRecruiterFilter,
    isArchived: activeTab === 'archived',
    page,
    pageSize: 24, // increased for virtualization demo, still paginated server-side
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const archiveMutation = useArchiveProfile();
  const unarchiveMutation = useUnarchiveProfile();
  const resetPasswordMutation = useResetClientPassword();

  const handleArchiveProfile = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to archive this client profile?")) return;
    const loadToast = toast.loading('Archiving client profile...');
    try {
      await archiveMutation.mutateAsync(profileId);
      toast.dismiss(loadToast);
      toast.success('Profile archived successfully!');
      refetch();
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Archiving failed.');
    }
  };

  const handleRestoreProfile = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to restore/unarchive this client profile?")) return;
    const loadToast = toast.loading('Restoring client profile...');
    try {
      await unarchiveMutation.mutateAsync(profileId);
      toast.dismiss(loadToast);
      toast.success('Profile restored successfully!');
      refetch();
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Restore failed.');
    }
  };

  const handleResetPassword = async (profileId: string) => {
    const confirmReset = window.confirm("Are you sure you want to reset this client's password to 'Pass@123'?");
    if (!confirmReset) return;

    const loadToast = toast.loading('Resetting password...');
    try {
      await resetPasswordMutation.mutateAsync(profileId);
      toast.dismiss(loadToast);
      toast.success('Password reset successfully to Pass@123');
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Password reset failed.');
    }
  };

  const handleReactivateAccount = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to reactivate this payment-blocked account?")) return;
    const loadToast = toast.loading('Reactivating account...');
    try {
      await apiClient.post(`/profiles/${profileId}/unblock-payment`);
      toast.dismiss(loadToast);
      toast.success('Account reactivated successfully!');
      refetch();
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Failed to reactivate account.');
    }
  };

  const handleMergeProfiles = async () => {
    if (!mergeTargetId) {
      toast.error('Please select a primary target profile.');
      return;
    }
    const sourceIds = selectedProfileIds.filter((id) => id !== mergeTargetId);
    if (sourceIds.length === 0) {
      toast.error('Please select at least 2 profiles to merge.');
      return;
    }

    const loadToast = toast.loading('Merging profiles...');
    try {
      await mergeMutation.mutateAsync({
        targetProfileId: mergeTargetId,
        sourceProfileIds: sourceIds,
      });
      toast.dismiss(loadToast);
      toast.success('Profiles merged successfully!');
      setSelectedProfileIds([]);
      setMergeDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Merging profiles failed.');
    }
  };


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
          className={`group relative h-full overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm cursor-pointer select-none transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:border-slate-700/60 dark:bg-slate-900 ${isSelected ? 'ring-2 ring-mayzax-blue-500 shadow-lg shadow-mayzax-blue-200/30 dark:ring-mayzax-blue-400' : 'hover:border-mayzax-blue-200 dark:hover:border-mayzax-blue-800'
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
                    {profile.isArchived ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700">Archived</span>
                    ) : profile.paymentBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-medium text-rose-700">Payment Blocked</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Live</span>
                    )}
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
                  <DropdownMenuItem onClick={() => setViewingProfile(profile)} className="gap-2"><Eye className="h-4 w-4" /> View Details</DropdownMenuItem>
                  {user?.role !== 'RESUME_ASSIST' && (
                    <DropdownMenuItem onClick={() => navigate(`/applications?profileId=${profile.id}`)} className="gap-2"><FileText className="h-4 w-4" /> View Applications</DropdownMenuItem>
                  )}
                  {user?.role !== 'RESUME_ASSIST' && (
                    <DropdownMenuItem onClick={() => { setEditingProfile(profile); setFormOpen(true); }} className="gap-2"><Pencil className="h-4 w-4" /> {isManager ? 'Edit / Reassign' : 'Edit'}</DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleResetPassword(profile.id)} className="gap-2 text-amber-600 focus:text-amber-600">
                      <Key className="h-4 w-4" /> Reset Password
                    </DropdownMenuItem>
                  )}
                  {user?.role === 'RECRUITER' && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedProfileForInterview(profile);
                        setInterviewCallFormOpen(true);
                      }}
                      className="gap-2 text-indigo-650 focus:text-indigo-700 font-medium"
                    >
                      <Phone className="h-4 w-4" /> Add Interview Calls
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || user?.role === 'TEAM_LEADER') && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedProfileForInterview(profile);
                        setEditingInterview(null);
                        setInterviewFormOpen(true);
                      }}
                      className="gap-2 text-indigo-700 focus:text-indigo-700"
                    >
                      <Calendar className="h-4 w-4" /> Schedule Interview
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => { setSelectedProfileForPayment(profile); setPaymentDialogOpen(true); }} className="gap-2 text-emerald-700 focus:text-indigo-705">
                      <CreditCard className="h-4 w-4" /> Record Payment
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || user?.role === 'TEAM_LEADER') && profile.paymentBlocked && (
                    <DropdownMenuItem onClick={() => handleReactivateAccount(profile.id)} className="gap-2 text-emerald-600 focus:text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Reactivate Account
                    </DropdownMenuItem>
                  )}
                  {(isAdmin || user?.role === 'TEAM_LEADER') && (
                    profile.isArchived ? (
                      <DropdownMenuItem onClick={() => handleRestoreProfile(profile.id)} className="gap-2 text-emerald-600 focus:text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Restore Profile
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleArchiveProfile(profile.id)} className="gap-2 text-amber-600 focus:text-amber-600">
                        <ShieldCheck className="h-4 w-4" /> Archive Profile
                      </DropdownMenuItem>
                    )
                  )}
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
                {(() => {
                  const rawList = profile.assignedRecruiterAssignments?.length
                    ? profile.assignedRecruiterAssignments
                    : profile.assignedRecruiter ? [profile.assignedRecruiter] : [];
                  const activeList = rawList.filter((a: any) => {
                    const r = a.recruiter || a;
                    return r && r.isActive !== false && !r.deletedAt;
                  });
                  const displayNames = activeList.map((a: any) => a.recruiter?.name || a.name || '?').join(', ');

                  return (
                    <>
                      <div className="flex -space-x-1.5 shrink-0">
                        {activeList.map((a: any, idx: number) => (
                          <div key={idx} title={a.recruiter?.name || a.name || '?'} className="flex h-6 w-6 items-center justify-center rounded-full bg-mayzax-gradient text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{(a.recruiter?.name || a.name || '?').charAt(0)}</div>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={displayNames || 'Unassigned'}>
                        {displayNames || 'Unassigned'}
                      </span>
                    </>
                  );
                })()}
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
        {/* Tab Selection */}
        <div className="mb-4 flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => { setActiveTab('active'); setPage(1); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'active'
                ? 'border-mayzax-blue-500 text-mayzax-blue-600 dark:text-mayzax-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Active Profiles
          </button>
          <button
            onClick={() => { setActiveTab('archived'); setPage(1); }}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'archived'
                ? 'border-mayzax-blue-500 text-mayzax-blue-600 dark:text-mayzax-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Archived Vault
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone, or tech..."
              className="pl-9 bg-white dark:bg-slate-900 shadow-sm rounded-full border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {isManager && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned To:</span>
              <select
                className="h-7 rounded-full border-0 bg-transparent text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
                value={assignedRecruiterFilter}
                onChange={(e) => {
                  setAssignedRecruiterFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL" className="dark:bg-slate-900 dark:text-white">All Recruiters</option>
                <option value="unassigned" className="dark:bg-slate-900 dark:text-white">Unassigned</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id} className="dark:bg-slate-900 dark:text-white">
                    {r.name} ({r.role === 'TEAM_LEADER' ? 'TL' : 'Recruiter'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 shadow-sm hidden sm:inline">
              {data?.pagination?.total ?? profiles.length} profiles
            </span>
            {useVirtualization && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-full px-3 py-1 shadow-sm">
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 dark:bg-slate-800 border border-transparent dark:border-slate-700 text-white px-3 py-1 text-xs font-medium">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 hover:bg-white/30">
                  <span className="text-[10px]">✕</span>
                </button>
              </span>
            )}
            {assignedRecruiterFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-medium">
                Assigned: {assignedRecruiterFilter === 'unassigned' ? 'Unassigned' : recruiters.find((r) => r.id === assignedRecruiterFilter)?.name || assignedRecruiterFilter}
                <button onClick={() => setAssignedRecruiterFilter('ALL')} className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200 dark:bg-indigo-800 hover:bg-indigo-300">
                  <span className="text-[10px]">✕</span>
                </button>
              </span>
            )}
            <button onClick={() => { setSearch(''); setAssignedRecruiterFilter('ALL'); }} className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">Clear all filters</button>
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-mayzax-blue focus:ring-mayzax-blue cursor-pointer"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAll}
                />
                <span>Select All ({profiles.length})</span>
              </label>

              {selectedProfileIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-mayzax-blue-50 dark:bg-mayzax-blue-950/30 px-2.5 py-0.5 text-xs font-bold text-mayzax-blue dark:text-mayzax-blue-400 border border-mayzax-blue-200 dark:border-mayzax-blue-800">
                    {selectedProfileIds.length} Selected
                  </span>

                  <Button variant="brand" size="sm" className="h-7 text-xs gap-1" onClick={() => setBulkAssignOpen(true)}>
                    <User2 className="h-3.5 w-3.5" /> Reassign ({selectedProfileIds.length})
                  </Button>

                  {isAdmin && selectedProfileIds.length >= 2 && (
                    <Button
                      variant="brand"
                      size="sm"
                      className="h-7 text-xs gap-1 shadow-sm bg-gradient-to-r from-amber-500 to-orange-600 border-0 hover:opacity-90 rounded-md px-3 text-white"
                      onClick={() => {
                        setMergeTargetId(selectedProfileIds[0]);
                        setMergeDialogOpen(true);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Merge ({selectedProfileIds.length})
                    </Button>
                  )}

                  {(isAdmin || isTeamLeader) && activeTab === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() => setBulkArchiveOpen(true)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Archive ({selectedProfileIds.length})
                    </Button>
                  )}
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
            <div className="w-full">
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

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Merge Client Profiles
            </DialogTitle>
            <DialogDescription className="text-sm">
              Consolidate multiple client profiles into one target primary profile. All application histories will transfer. Source profiles will be deactivated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30">
              <p className="font-semibold mb-1">⚠️ Warning:</p>
              <p>This action cannot be undone. Source profiles will be deleted, and their credentials will be deactivated.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Select Target Primary Profile</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm dark:bg-slate-950 dark:border-slate-800"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              >
                {profiles
                  .filter((p) => selectedProfileIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.candidateName} ({p.email}) - Keep details of this profile
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Source Profiles to be Merged & Deleted</label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800">
                {profiles
                  .filter((p) => selectedProfileIds.includes(p.id) && p.id !== mergeTargetId)
                  .map((p) => (
                    <div key={p.id} className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                      {p.candidateName} ({p.email})
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="brand"
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 border-0 text-white font-bold hover:opacity-95"
              disabled={mergeMutation.isPending}
              onClick={handleMergeProfiles}
            >
              {mergeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={bulkArchiveOpen} onOpenChange={setBulkArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Archive Selected Profiles
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to archive <span className="font-semibold text-slate-900">{selectedProfileIds.length}</span> client profiles? This will suspend their login credentials but keep application records intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkArchiveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              disabled={bulkArchiveMutation.isPending}
              onClick={async () => {
                try {
                  await bulkArchiveMutation.mutateAsync(selectedProfileIds);
                  toast.success(`Successfully archived ${selectedProfileIds.length} profiles.`);
                  setSelectedProfileIds([]);
                  setBulkArchiveOpen(false);
                  refetch();
                } catch (err) {
                  toast.error(extractErrorMessage(err));
                }
              }}
            >
              {bulkArchiveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Archive Profiles
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

      <Dialog open={!!viewingProfile} onOpenChange={(open) => !open && setViewingProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <User2 className="h-5 w-5 text-mayzax-blue-600" />
              {viewingProfile?.candidateName}'s Full Details
            </DialogTitle>
            <DialogDescription>
              Structured profile information collected during candidate onboarding.
            </DialogDescription>
          </DialogHeader>

          {viewingProfile && (
            <div className="space-y-6">
              {/* Profile Overview (Row 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <UserSquare2 className="h-4 w-4 text-violet-600" /> Personal Info
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.email}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.phone}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Date of Birth:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.dateOfBirth || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Gender:</span> <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{viewingProfile.gender || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Current Location:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.currentLocation || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <Award className="h-4 w-4 text-emerald-600" /> Professional Track
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Technology:</span> <span className="font-semibold text-mayzax-blue-700 dark:text-mayzax-blue-400">{viewingProfile.technology}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Visa Status:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.visaStatus || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">US Entry Date:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.entryToUS || 'N/A'}</span></div>
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-slate-500">Skills:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {viewingProfile.skills ? (
                          viewingProfile.skills.split(',').map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0">{skill.trim()}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Education (Timeline/List) */}
              <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                  <Calendar className="h-4 w-4 text-mayzax-blue-600" /> Education History
                </h3>
                {Array.isArray(viewingProfile.education) && viewingProfile.education.length > 0 ? (
                  <div className="space-y-3.5 mt-2">
                    {viewingProfile.education.map((edu: any, idx: number) => (
                      <div key={idx} className="relative pl-4 border-l-2 border-mayzax-blue-500 text-sm">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{edu.qualification} in {edu.fieldOfStudy}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{edu.instituteName} {edu.specialization ? `(${edu.specialization})` : ''}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {edu.startDate} to {edu.currentlyOngoing ? 'Present' : (edu.endDate || 'N/A')}
                          {edu.honors ? <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">[Honors: {edu.honors}]</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No systematic education details available.</p>
                )}
              </div>

              {/* Experience & Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <CheckCircle className="h-4 w-4 text-indigo-600" /> Experience Info
                  </h3>
                  {viewingProfile.hasExperience ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {viewingProfile.experienceDetails || 'Yes (Details not specified)'}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No prior experience declared.</p>
                  )}
                </div>

                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <ShieldCheck className="h-4 w-4 text-orange-600" /> Certifications
                  </h3>
                  {viewingProfile.certifications ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {viewingProfile.certifications}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No certifications declared.</p>
                  )}
                </div>
              </div>

              {/* Address History */}
              <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                  <MapPin className="h-4 w-4 text-rose-600" /> Address History
                </h3>
                {Array.isArray(viewingProfile.addressHistory) && viewingProfile.addressHistory.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {viewingProfile.addressHistory.map((addr: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded-lg bg-white dark:bg-slate-800">
                        <div className="font-medium text-slate-800 dark:text-slate-200">State: {addr.state}, Country: {addr.country}</div>
                        <div className="text-xs text-slate-400">{addr.fromDate} - {addr.toDate}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No systematic address history available.</p>
                )}
              </div>

              {/* Payment Details & Resume Attachment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" /> Enrollment / Payment Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Plan Selected:</span> <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{viewingProfile.planSelected || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Amount Paid:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.amountPaid ? `$${viewingProfile.amountPaid}` : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Transaction Reference:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{viewingProfile.paymentRef || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                      <FileText className="h-4 w-4 text-amber-600" /> Resume Attachment
                    </h3>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {viewingProfile.resumeFileName ? (
                        <div>
                          <p className="font-medium">{viewingProfile.resumeFileName}</p>
                          <p className="text-xs text-slate-400 mt-1">Uploaded Resume File</p>
                        </div>
                      ) : (
                        <p className="text-slate-500">No resume attached.</p>
                      )}
                    </div>
                  </div>
                  {viewingProfile.resumeUrl && (
                    <a
                      href={viewingProfile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center justify-center rounded-xl bg-mayzax-blue-50 border border-mayzax-blue-200 hover:bg-mayzax-blue-100 text-mayzax-blue-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold transition"
                    >
                      Download Resume
                    </a>
                  )}
                </div>
              </div>

              {/* Interviews & Rounds */}
              <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-indigo-650" /> Interviews & Rounds
                  </h3>
                  {(isAdmin || isTeamLeader) && (
                    <Button
                      onClick={() => {
                        setEditingInterview(null);
                        setInterviewFormOpen(true);
                      }}
                      size="sm"
                      className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Interview
                    </Button>
                  )}
                </div>

                {isLoadingInterviews ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading interviews...</div>
                ) : interviews.length > 0 ? (
                  <div className="space-y-3.5 mt-2">
                    {interviews.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-xl bg-white dark:bg-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{item.roundName}</div>
                          <Badge className={`${item.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'
                            : item.status === 'Cancelled'
                              ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/10'
                              : 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10'
                            } text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full`}>
                            {item.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-slate-400">Schedule:</span>
                            <p className="font-bold text-slate-700 dark:text-slate-350">{item.date}</p>
                            <p className="text-[10px] text-slate-400">{item.startTime} – {item.endTime} ({item.timezone})</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Interviewer:</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{item.interviewer || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Mode:</span>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{item.mode || 'N/A'}</p>
                            {item.meetingLink && (
                              <a href={item.meetingLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-650 hover:underline truncate block max-w-full">Link</a>
                            )}
                          </div>
                        </div>

                        {item.notes && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg text-xs text-slate-550 dark:text-slate-400 whitespace-pre-wrap mt-1">
                            {item.notes}
                          </div>
                        )}

                        {(isAdmin || isTeamLeader) && (
                          <div className="flex gap-2 justify-end pt-1 border-t dark:border-slate-700 mt-2">
                            <Button
                              onClick={() => {
                                setEditingInterview(item);
                                setInterviewFormOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] font-bold text-slate-650"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to delete this interview round?")) {
                                  try {
                                    await apiClient.delete(`/profiles/${viewingProfile.id}/interviews/${item.id}`);
                                    toast.success('Interview round deleted');
                                    fetchInterviews(viewingProfile.id);
                                  } catch (e) {
                                    toast.error('Failed to delete interview');
                                  }
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 space-y-2">
                    <p>No interviews scheduled yet.</p>
                  </div>
                )}
              </div>

              {/* Interview Received Calls Section */}
              <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-indigo-600" /> Logged Interview Calls
                  </h3>
                </div>

                {isLoadingInterviewCalls ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading interview calls...</div>
                ) : interviewCalls.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {interviewCalls.map((call: any, idx: number) => (
                      <div key={idx} className="p-3.5 border rounded-xl bg-white dark:bg-slate-800 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {call.companyName} • {call.position}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(call.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-650 dark:text-slate-350">
                          <div>
                            <span className="text-slate-400">Caller Number:</span> <span className="font-medium">{call.number}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Caller/Interviewer:</span> <span className="font-medium">{call.callerName || 'N/A'}</span>
                          </div>
                        </div>
                        {call.notes && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                            {call.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No interview calls logged yet.
                  </div>
                )}
              </div>

              {/* Merge History Log */}
              {Array.isArray(viewingProfile.mergeHistory) && viewingProfile.mergeHistory.length > 0 && (
                <div className="rounded-xl border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-3 flex items-center gap-1.5 border-b pb-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Merged Profiles History
                  </h3>
                  <div className="space-y-2 mt-2">
                    {viewingProfile.mergeHistory.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-xl bg-white dark:bg-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.sourceCandidateName}</p>
                          <p className="text-slate-500">{item.sourceEmail} • {item.sourcePhone}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-mayzax-blue-50 text-mayzax-blue-700 border border-mayzax-blue-200 font-bold px-2 py-0.5 rounded-full">
                            {item.applicationCount} Applications
                          </Badge>
                          <p className="text-[10px] text-slate-400 mt-1">Merged on {new Date(item.mergedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy Notes (Fallback) */}
              {viewingProfile.notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
                  <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-400 mb-2">Legacy Profile Notes</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingProfile.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4 flex justify-end">
            <Button onClick={() => setViewingProfile(null)} className="rounded-xl px-5">
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {(viewingProfile || selectedProfileForInterview) && (
        <InterviewFormDialog
          open={interviewFormOpen}
          onClose={() => {
            setInterviewFormOpen(false);
            setSelectedProfileForInterview(null);
          }}
          profileId={viewingProfile?.id || selectedProfileForInterview?.id || ''}
          interview={editingInterview}
          onSuccess={() => {
            if (viewingProfile?.id) {
              fetchInterviews(viewingProfile.id);
            }
          }}
        />
      )}

      {/* RECORD PAYMENT DIALOG */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setSelectedProfileForPayment(null); }}>
        <DialogContent className="rounded-3xl max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
          <DialogHeader className="space-y-1.5 pb-2">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-650" /> Record Client Payment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record a payment history entry for <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedProfileForPayment?.candidateName}</span>. This will overwrite previous history.
            </DialogDescription>
          </DialogHeader>

          {selectedProfileForPayment && (
            <PaymentRecordForm
              profile={selectedProfileForPayment}
              onClose={() => { setPaymentDialogOpen(false); setSelectedProfileForPayment(null); refetch(); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {interviewCallFormOpen && selectedProfileForInterview && (
        <InterviewCallFormDialog
          open={interviewCallFormOpen}
          onClose={() => {
            setInterviewCallFormOpen(false);
            setSelectedProfileForInterview(null);
          }}
          profileId={selectedProfileForInterview.id}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function PaymentRecordForm({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [plan, setPlan] = useState(profile.planSelected || 'Basic');
  const [isFull, setIsFull] = useState(true);
  const [amount, setAmount] = useState(1500);
  const [ref, setRef] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const prices: Record<string, number> = { Basic: 1500, Gold: 2500, Premium: 3500 };
    if (isFull) {
      setAmount(prices[plan] || 1500);
    } else {
      setAmount(500);
    }
  }, [plan, isFull]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim()) {
      toast.error('Payment Reference code is required');
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading('Posting payment details...');

    try {
      const prices: Record<string, number> = { Basic: 1500, Gold: 2500, Premium: 3500 };
      const fullPrice = prices[plan] || 1500;

      const paymentsPayload = [];
      if (isFull) {
        paymentsPayload.push({
          amount: amount,
          status: 'PAID',
          dueDate: paidAt,
          paidAt: paidAt,
          paymentRef: ref,
          installmentNo: 1,
        });
      } else {
        paymentsPayload.push({
          amount: amount,
          status: 'PAID',
          dueDate: paidAt,
          paidAt: paidAt,
          paymentRef: ref,
          installmentNo: 1,
        });
        paymentsPayload.push({
          amount: fullPrice - amount,
          status: 'PENDING',
          dueDate: dueDate,
          installmentNo: 2,
        });
      }

      await apiClient.post(`/profiles/${profile.id}/post-payment`, { planSelected: plan, payments: paymentsPayload });
      toast.dismiss(loadToast);
      toast.success('Payment details recorded successfully!');
      onClose();
    } catch (err: any) {
      toast.dismiss(loadToast);
      toast.error(err?.response?.data?.error?.message || 'Failed to record payment details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Plan Selected</Label>
          <Select value={plan} onValueChange={(val) => setPlan(val)}>
            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <SelectValue placeholder="Select Plan" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Basic">Basic ($1,500)</SelectItem>
              <SelectItem value="Gold">Gold ($2,500)</SelectItem>
              <SelectItem value="Premium">Premium ($3,500)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Payment Option</Label>
          <Select value={isFull ? 'full' : 'partial'} onValueChange={(val) => setIsFull(val === 'full')}>
            <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="full">Full Payment</SelectItem>
              <SelectItem value="partial">Partial Payment / Installment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Amount Paid ($)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-xl border-slate-200 dark:border-slate-800"
            min={500}
            readOnly={isFull}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Payment Date</Label>
          <Input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Payment Reference Code</Label>
          <Input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. CHQ-9382 or TXN-8372"
            className="rounded-xl border-slate-200 dark:border-slate-800 font-mono"
          />
        </div>

        {!isFull && (
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">Remaining Balance Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
        <Button type="submit" variant="brand" className="rounded-xl bg-indigo-650 text-black hover:bg-indigo-700 hover:text-white font-bold" disabled={isSubmitting}>
          {isSubmitting ? 'Recording...' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}

function InterviewFormDialog({
  open,
  onClose,
  profileId,
  interview,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  interview: any | null;
  onSuccess: () => void;
}) {
  const [roundName, setRoundName] = useState('');
  const [status, setStatus] = useState('Scheduled');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timezone, setTimezone] = useState('EST');
  const [interviewer, setInterviewer] = useState('');
  const [mode, setMode] = useState('Google Meet');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (interview) {
      setRoundName(interview.roundName || '');
      setStatus(interview.status || 'Scheduled');
      setDate(interview.date || '');
      setStartTime(interview.startTime || '');
      setEndTime(interview.endTime || '');
      setTimezone(interview.timezone || 'EST');
      setInterviewer(interview.interviewer || '');
      setMode(interview.mode || 'Google Meet');
      setMeetingLink(interview.meetingLink || '');
      setNotes(interview.notes || '');
    } else {
      setRoundName('');
      setStatus('Scheduled');
      setDate(new Date().toISOString().slice(0, 10));
      setStartTime('10:00 AM');
      setEndTime('11:00 AM');
      setTimezone('EST');
      setInterviewer('');
      setMode('Google Meet');
      setMeetingLink('');
      setNotes('');
    }
  }, [interview, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName || !status || !date || !startTime || !endTime) {
      toast.error('Required fields are missing');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        roundName,
        status,
        date,
        startTime,
        endTime,
        timezone,
        interviewer,
        mode,
        meetingLink,
        notes,
      };

      if (interview) {
        await apiClient.put(`/profiles/${profileId}/interviews/${interview.id}`, payload);
        toast.success('Interview updated successfully');
      } else {
        await apiClient.post(`/profiles/${profileId}/interviews`, payload);
        toast.success('Interview added successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="rounded-3xl max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {interview ? 'Edit Interview Round' : 'Add Interview Round'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Schedule or update interview details for this candidate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Round Name *</Label>
            <Input
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="e.g. Technical Round 1"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Timezone</Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. EST"
                className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Start Time *</Label>
              <Input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">End Time *</Label>
              <Input
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Interviewer Name</Label>
            <Input
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="e.g. John Doe"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700">
                  <SelectItem value="Google Meet">Google Meet</SelectItem>
                  <SelectItem value="Zoom">Zoom</SelectItem>
                  <SelectItem value="Teams">Teams</SelectItem>
                  <SelectItem value="In Person">In Person</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meeting Link</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="e.g. https://meet.google.com/..."
                className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide interview agenda or panel instructions..."
              rows={2}
              className="flex min-h-[60px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mayzax-blue-500/40 resize-none focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
              {isSubmitting ? 'Saving...' : 'Save Round'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InterviewCallFormDialog({
  open,
  onClose,
  profileId,
  onSuccess
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  onSuccess: () => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [number, setNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !position.trim() || !number.trim()) {
      toast.error('Company Name, Position, and Number are required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        position: position.trim(),
        number: number.trim(),
        callerName: callerName.trim() || null,
        notes: notes.trim() || null,
      };

      await apiClient.post(`/profiles/${profileId}/interview-calls`, payload);
      toast.success('Interview call added successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save interview call details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="rounded-3xl max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Add Interview Call Details
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Log details of interview calls received by your assigned client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Company Name *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Position *</Label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Frontend Engineer"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Caller Number *</Label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. +1 234 567 890"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Caller / Interviewer Name</Label>
            <Input
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="rounded-xl h-10 bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter details like next steps, scheduled dates, etc."
              rows={3}
              className="flex min-h-[80px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mayzax-blue-500/40 resize-none focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
              {isSubmitting ? 'Logging...' : 'Save Call Details'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


