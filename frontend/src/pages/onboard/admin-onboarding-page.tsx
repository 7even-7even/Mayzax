import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/utils';
import { useOnboardingList, useApproveOnboarding, useRejectOnboarding, ClientOnboarding } from '@/hooks/use-onboarding';
import {
  Users, CheckCircle2, XCircle, Clock, Eye, FileText, Download, ShieldCheck,
  CreditCard, GraduationCap, MapPin, Briefcase, Award, Loader2, Code2, ShieldAlert,
  ArrowRight, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useEffect } from 'react';

export default function AdminOnboardingPage() {
  const { isAdmin } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<ClientOnboarding | null>(null);

  const [activeView, setActiveView] = useState<'onboardings' | 'change_requests'>('onboardings');
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [isLoadingChanges, setIsLoadingChanges] = useState(false);
  const [changeFilter, setChangeFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [changePage, setChangePage] = useState(1);
  const [changePagination, setChangePagination] = useState<any>(null);
  const [selectedChange, setSelectedChange] = useState<any>(null);

  const { data: onboardingResponse, isLoading } = useOnboardingList({
    status: statusFilter,
    page,
    pageSize: 10
  });

  const fetchChangeRequests = async () => {
    setIsLoadingChanges(true);
    try {
      const { data } = await apiClient.get('/profile-changes', {
        params: { status: changeFilter, page: changePage, pageSize: 10 }
      });
      setChangeRequests(data.data || []);
      setChangePagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load profile change requests');
    } finally {
      setIsLoadingChanges(false);
    }
  };

  useEffect(() => {
    if (activeView === 'change_requests') {
      fetchChangeRequests();
    }
  }, [activeView, changeFilter, changePage]);

  const approveMutation = useApproveOnboarding();
  const rejectMutation = useRejectOnboarding();

  const requests = onboardingResponse?.data ?? [];
  const pagination = onboardingResponse?.pagination;

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this registration? This will automatically create their Client Profile in the CMS.')) return;
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Onboarding request approved and Client Profile generated!');
      setSelectedRequest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve.');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this onboarding application?')) return;
    try {
      await rejectMutation.mutateAsync(id);
      toast.success('Onboarding request rejected.');
      setSelectedRequest(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject.');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-slate-400 text-xs mt-1">Only administrative logins can verify client onboardings.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20 gap-1.5"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case 'PENDING':
      default:
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 gap-1.5"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={ShieldCheck}
        title="Administrative Controls"
        description="Verify public registrations, review payments, and approve client profile changes in Mayzax ATS"
        badge={requests.length > 0 ? `${requests.length} new requests` : undefined}
        gradient="from-slate-900 to-slate-700"
        bottomGradient="from-indigo-650 via-violet-600 to-indigo-800"
      />

      {/* Main Mode Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveView('onboardings')}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${
            activeView === 'onboardings'
              ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Onboarding Applications
        </button>
        <button
          onClick={() => setActiveView('change_requests')}
          className={`pb-3 text-sm font-bold border-b-2 px-1 transition-all ${
            activeView === 'change_requests'
              ? 'border-indigo-500 text-indigo-650 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Profile Change Requests
        </button>
      </div>

      {activeView === 'onboardings' ? (
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fadeIn">
          <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white shadow-md">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Registration Directory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Review status of inbound self-onboarded candidates</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/40 dark:border-slate-700">
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === status
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    status === 'PENDING' ? 'bg-amber-400' : status === 'APPROVED' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4"><TableSkeleton cols={6} rows={5} /></div>
            ) : requests.length === 0 ? (
              <div className="px-5 py-12">
                <EmptyState icon={Users} title="No Registration Requests" description={`There are no onboarding requests with status ${statusFilter} at this moment.`} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead className="font-semibold text-xs">Client Name</TableHead>
                    <TableHead className="font-semibold text-xs">Email / Contact</TableHead>
                    <TableHead className="font-semibold text-xs">Technology Track</TableHead>
                    <TableHead className="font-semibold text-xs">Plan Selected</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Amount Paid</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <TableCell className="font-bold text-slate-850 dark:text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                            {request.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span>{request.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{request.email}</div>
                        <div className="text-[10px] text-slate-400">{request.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{request.technology}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{request.planSelected}</TableCell>
                      <TableCell className="font-mono font-bold text-indigo-650 dark:text-indigo-400 text-center">${request.amountPaid}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" className="rounded-full h-8 gap-1" onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-3.5 w-3.5" /> Review details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fadeIn">
          <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Profile Changes Queue</h3>
                <p className="text-xs text-slate-550 dark:text-slate-400">Approve or reject updates requested by candidates</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200/40 dark:border-slate-700">
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <button
                  key={status}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    changeFilter === status
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  onClick={() => { setChangeFilter(status); setChangePage(1); }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    status === 'PENDING' ? 'bg-amber-400' : status === 'APPROVED' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`} />
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            {isLoadingChanges ? (
              <div className="p-4"><TableSkeleton cols={5} rows={5} /></div>
            ) : changeRequests.length === 0 ? (
              <div className="px-5 py-12">
                <EmptyState icon={FileText} title="No Change Requests" description={`There are no profile change requests with status ${changeFilter} at this moment.`} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead className="font-semibold text-xs">Client Name</TableHead>
                    <TableHead className="font-semibold text-xs">Requested By</TableHead>
                    <TableHead className="font-semibold text-xs">Type of Change</TableHead>
                    <TableHead className="font-semibold text-xs">Submitted Date</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeRequests.map((req) => {
                    const isUpgrade = req.changes?._type === 'PLAN_UPGRADE';
                    return (
                      <TableRow key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                        <TableCell className="font-bold text-slate-850 dark:text-slate-200">
                          {req.profile?.candidateName || 'Unknown Client'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{req.requestedBy?.name}</div>
                          <div className="text-[10px] text-slate-400">{req.requestedBy?.email}</div>
                        </TableCell>
                        <TableCell>
                          {isUpgrade ? (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
                              Plan Upgrade to {req.changes?.targetPlan}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                              Profile Fields Update ({
                                (() => {
                                  if (!req.changes || !req.profile) return 0;
                                  let count = 0;
                                  for (const key of Object.keys(req.changes)) {
                                    if (key === '_type') continue;
                                    const changesVal = req.changes[key];
                                    const profileVal = (req.profile as any)[key];
                                    if (typeof changesVal === 'object' && changesVal !== null && typeof profileVal === 'object' && profileVal !== null) {
                                      if (JSON.stringify(changesVal) !== JSON.stringify(profileVal)) {
                                        count++;
                                      }
                                    } else {
                                      const v1 = changesVal === '' ? null : (changesVal ?? null);
                                      const v2 = profileVal === '' ? null : (profileVal ?? null);
                                      if (v1 !== v2) {
                                        count++;
                                      }
                                    }
                                  }
                                  return count;
                                })()
                              } fields)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-550">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="outline" size="sm" className="rounded-full h-8 gap-1" onClick={() => setSelectedChange(req)}>
                            <Eye className="h-3.5 w-3.5" /> Review details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onboarding Request Review Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] rounded-3xl flex flex-col p-0 overflow-hidden border-slate-200">
          <div className="h-1.5 w-full bg-mayzax-gradient" />
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
              </div>
              Verify Onboarding Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review candidate data, verified resume upload, and mock receipt details.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <>
              <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
                <div className="space-y-6">
                  {/* Step 1: Personal info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><circle cx="8" cy="5" r="3"/><path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6H2z"/></svg>
                      </span>
                      Personal &amp; Contact Info
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Name</span><p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedRequest.fullName}</p></div>
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">DOB</span><p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{selectedRequest.dateOfBirth}</p></div>
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Email</span><p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5 truncate">{selectedRequest.email}</p></div>
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Phone</span><p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{selectedRequest.phone}</p></div>
                    </div>
                  </div>

                  {/* Step 2: Education */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-100 dark:bg-teal-950/40 text-teal-600">
                        <GraduationCap className="h-3 w-3" />
                      </span>
                      Educational Detail
                    </h3>
                    <div className="space-y-2">
                      {selectedRequest.education?.map((edu, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-xs shadow-sm space-y-0.5">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{edu.qualification}</div>
                          <div className="text-slate-500 dark:text-slate-400">Field: <span className="font-semibold text-slate-700 dark:text-slate-300">{edu.fieldOfStudy}</span> — <span className="text-slate-600 dark:text-slate-300">{edu.specialization}</span></div>
                          <div className="text-slate-500 dark:text-slate-400">Institute: <span className="font-semibold text-slate-700 dark:text-slate-300">{edu.instituteName}</span></div>
                          {edu.honors && <div className="text-[10px] text-indigo-500 dark:text-indigo-400">🏅 {edu.honors}</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{edu.startDate} – {edu.currentlyOngoing ? 'Present (Ongoing)' : (edu.endDate || 'N/A')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Technical Details */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-950/40 text-violet-600">
                        <Code2 className="h-3 w-3" />
                      </span>
                      Technical Detail
                    </h3>
                    <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2"><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Technology Track:</span> <Badge variant="outline" className="text-xs border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">{selectedRequest.technology}</Badge></div>
                      <div>
                        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Skills:</span>
                        <p className="mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg font-mono text-[11px] whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedRequest.skills}</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Visa Status details */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-600">
                        <Award className="h-3 w-3" />
                      </span>
                      Visa Status Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Visa</span><p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedRequest.visaStatus}</p></div>
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">US Entry</span><p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{selectedRequest.entryToUS || 'N/A'}</p></div>
                      <div className="col-span-2"><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Current Location</span><p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{selectedRequest.currentLocation}</p></div>
                    </div>
                  </div>

                  {/* Step 5: Address History */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600">
                        <MapPin className="h-3 w-3" />
                      </span>
                      Address History
                    </h3>
                    <div className="space-y-1.5">
                      {selectedRequest.addressHistory?.map((addr, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl text-[11px] flex justify-between shadow-sm">
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{addr.state}</span>, <span className="text-slate-600 dark:text-slate-300">{addr.country}</span>
                          </div>
                          <div className="text-slate-400 text-[10px] font-mono">
                            {addr.fromDate} – {addr.toDate}
                          </div>
                        </div>
                      ))}
                      {(!selectedRequest.addressHistory || selectedRequest.addressHistory.length === 0) && (
                        <div className="text-xs text-slate-400 italic">No address history provided.</div>
                      )}
                    </div>
                  </div>

                  {/* Step 6: Experience */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <Briefcase className="h-3 w-3" />
                      </span>
                      Experience Details
                    </h3>
                    <div className="text-xs space-y-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      <div><span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Genuine Experience:</span> <span className={`font-bold ${selectedRequest.hasExperience ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}`}>{selectedRequest.hasExperience ? 'Yes' : 'No'}</span></div>
                      {selectedRequest.hasExperience && selectedRequest.experienceDetails && (
                        <p className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg whitespace-pre-wrap text-slate-700 dark:text-slate-300 mt-1">{selectedRequest.experienceDetails}</p>
                      )}
                    </div>
                  </div>

                  {/* Step 7: Certifications */}
                  {selectedRequest.certifications && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-600">
                          <Award className="h-3 w-3" />
                        </span>
                        Certifications
                      </h3>
                      <p className="text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedRequest.certifications}</p>
                    </div>
                  )}

                  {/* Step 8: Resume file */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">
                        <FileText className="h-3 w-3" />
                      </span>
                      Resume File
                    </h3>
                    {selectedRequest.resumeUrl ? (
                      <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-3 rounded-xl text-xs shadow-sm">
                        <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold truncate max-w-[220px]">{selectedRequest.resumeFileName || 'Resume'}</p>
                            <p className="text-indigo-400 dark:text-indigo-500 text-[10px] mt-0.5">PDF / Word Document</p>
                          </div>
                        </div>
                        <a href={`${import.meta.env.VITE_API_URL}/${selectedRequest.resumeUrl}`} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30 font-bold shadow-sm">
                            <Download className="h-3.5 w-3.5" /> View & Download
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-2.5 rounded-xl text-xs">
                        <XCircle className="h-4 w-4 shrink-0" /> No resume uploaded.
                      </div>
                    )}
                  </div>

                  {/* Step 10: Payment details */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
                        <CreditCard className="h-3 w-3" />
                      </span>
                      Plan &amp; Payment Details
                    </h3>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl shadow-sm space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="font-semibold text-emerald-700/60 dark:text-emerald-500/60 uppercase tracking-wider text-[9px]">Plan</span><p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selectedRequest.planSelected}</p></div>
                        <div><span className="font-semibold text-emerald-700/60 dark:text-emerald-500/60 uppercase tracking-wider text-[9px]">Amount Paid</span><p className="font-black text-emerald-600 dark:text-emerald-400 text-base mt-0.5">${selectedRequest.amountPaid}</p></div>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700/60 dark:text-emerald-500/60 uppercase tracking-wider text-[9px]">Transaction Reference</span>
                        <p className="font-mono bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1.5 rounded-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5 tracking-wider">{selectedRequest.paymentRef}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 gap-2 shrink-0">
                <Button variant="outline" className="rounded-full text-xs font-bold border-slate-200 dark:border-slate-700" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
                {selectedRequest.status === 'PENDING' && (
                  <>
                    <Button
                      variant="destructive"
                      className="rounded-full text-xs font-bold gap-1.5 shadow-sm"
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                      onClick={() => handleReject(selectedRequest.id)}
                    >
                      {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      <XCircle className="h-3.5 w-3.5" />
                      Reject Request
                    </Button>
                    <Button
                      className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 text-white text-xs font-bold gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      onClick={() => handleApprove(selectedRequest.id)}
                    >
                      {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verify &amp; Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Change Request Review Detail Modal */}
      <Dialog open={!!selectedChange} onOpenChange={(open) => !open && setSelectedChange(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] rounded-3xl flex flex-col p-0 overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-800" />
          {selectedChange && (
            <>
              <DialogHeader className="px-6 pt-5">
                <DialogTitle className="text-lg font-extrabold flex items-center gap-2.5 text-slate-900 dark:text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  Review Profile Changes
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-550 dark:text-slate-400">
                  Verify the updates requested by {selectedChange.profile?.candidateName || 'candidate'} before merging to the live CMS profile.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
                <div className="space-y-6">
                  {/* Client Info Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedChange.profile?.candidateName}</p>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400">{selectedChange.profile?.email}</p>
                    {selectedChange.changes?._type === 'PLAN_UPGRADE' && (
                      <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                        Type: Plan Upgrade Request ({selectedChange.profile?.planSelected || 'Basic'} &rarr; {selectedChange.changes?.targetPlan})
                      </p>
                    )}
                  </div>

                  {/* Comparisons */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-450">Field Comparisons</h4>
                    <div className="space-y-3">
                      {selectedChange.changes?._type === 'PLAN_UPGRADE' ? (
                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3.5 rounded-2xl shadow-sm">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Plan</span>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedChange.profile?.planSelected || 'Basic'}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Requested Plan</span>
                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedChange.changes?.targetPlan}</p>
                          </div>
                        </div>
                      ) : (
                        Object.entries(selectedChange.changes).map(([field, newVal]) => {
                          const oldVal = selectedChange.profile?.[field];
                          // Format JSON values or objects for display
                          const oldDisplay = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || 'N/A');
                          const newDisplay = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || 'N/A');

                          if (field === '_type') return null;

                          return (
                            <div key={field} className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3.5 rounded-2xl shadow-sm">
                              <div className="col-span-2 border-b pb-1.5 flex justify-between">
                                <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                              </div>
                              <div className="border-r border-slate-100 pr-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Value</span>
                                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed break-words">{oldDisplay}</p>
                              </div>
                              <div className="pl-2">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Proposed Value</span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold mt-1 leading-relaxed break-words">{newDisplay}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 gap-2 shrink-0">
                <Button variant="outline" className="rounded-full text-xs font-bold border-slate-200 dark:border-slate-700" onClick={() => setSelectedChange(null)}>
                  Close
                </Button>
                {selectedChange.status === 'PENDING' && (
                  <>
                    <Button
                      variant="destructive"
                      className="rounded-full text-xs font-bold gap-1.5 shadow-sm"
                      onClick={async () => {
                        const note = prompt('Optional rejection reason note:');
                        if (note === null) return;
                        try {
                          await apiClient.post(`/profile-changes/${selectedChange.id}/reject`, { rejectionNote: note });
                          toast.success('Change request rejected successfully.');
                          setSelectedChange(null);
                          fetchChangeRequests();
                        } catch (err) {
                          toast.error('Failed to reject change request.');
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject Changes
                    </Button>
                    <Button
                      className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 text-white text-xs font-bold gap-1.5 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
                      onClick={async () => {
                        if (!confirm('Are you sure you want to approve and merge these changes?')) return;
                        try {
                          await apiClient.post(`/profile-changes/${selectedChange.id}/approve`);
                          toast.success('Changes approved and merged successfully!');
                          setSelectedChange(null);
                          fetchChangeRequests();
                        } catch (err) {
                          toast.error('Failed to approve change request.');
                        }
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve &amp; Merge
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
