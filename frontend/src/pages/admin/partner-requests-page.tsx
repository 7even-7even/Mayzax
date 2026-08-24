import { useState, useEffect } from 'react';
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
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatDateTime } from '@/lib/utils';
import { Handshake, Mail, Phone, Calendar, Eye, Search, XCircle, Building2, Briefcase, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export default function AdminPartnerRequestsPage() {
  const { isAdmin } = usePermissions();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/hiring-partner-requests', {
        params: {
          page,
          pageSize: 10,
          search: debouncedSearch || undefined,
        },
      });
      setRequests(data.data || []);
      setPagination(data.pagination);
    } catch (err: any) {
      toast.error('Failed to load hiring partner requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, debouncedSearch, page]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-slate-400 text-xs mt-1">Only administrative logins can view hiring partner requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={Handshake}
        title="Partner Requests"
        description="Review staffing requests, talent requirements, and partnership requests submitted by companies"
        badge={pagination?.total ? `${pagination.total} submissions` : undefined}
        gradient="from-slate-900 to-slate-700"
        bottomGradient="from-teal-650 via-emerald-600 to-teal-800"
      />

      <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fadeIn">
        <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md">
              <Handshake className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Partner Directory</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">View companies interested in hiring from Mayzax talent pool</p>
            </div>
          </div>
          <div className="relative max-w-xs w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, contact, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton cols={6} rows={5} /></div>
          ) : requests.length === 0 ? (
            <div className="px-5 py-12">
              <EmptyState icon={Handshake} title="No Partner Requests" description={debouncedSearch ? "No submissions match your search query." : "No partner requests have been submitted yet."} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead className="font-semibold text-xs">Company</TableHead>
                    <TableHead className="font-semibold text-xs">Contact Person</TableHead>
                    <TableHead className="font-semibold text-xs">Email / Contact</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Role Type</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Hires Needed</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <TableCell className="font-bold text-slate-850 dark:text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                            {req.company?.charAt(0)?.toUpperCase()}
                          </div>
                          <span>{req.company}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 dark:text-slate-350">
                        {req.contactName}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{req.workEmail}</div>
                        <div className="text-[10px] text-slate-400">{req.phone || 'No phone'}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-400">{req.roleType}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                        {req.hiresNeeded}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" className="rounded-full h-8 gap-1 hover:border-teal-300 hover:text-teal-600" onClick={() => setSelectedRequest(req)}>
                          <Eye className="h-3.5 w-3.5" /> View request
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-850 flex justify-end">
              <PaginationControls pagination={pagination} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-xl rounded-3xl flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 to-emerald-600" />
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
                <Building2 className="h-4 w-4" />
              </div>
              Hiring Partner Request Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review staffing specifications, role types, and hire volumes requested.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <>
              <ScrollArea className="flex-1 px-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Company & Contact Profile */}
                  <div className="bg-slate-50 dark:bg-slate-955 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                      {selectedRequest.company?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{selectedRequest.company}</h4>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Contact: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedRequest.contactName}</span></p>
                    </div>
                  </div>

                  {/* Requirements Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-750 dark:text-slate-300">
                      <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Role Type: <strong>{selectedRequest.roleType}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-750 dark:text-slate-300">
                      <Users className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Hires Needed: <strong>{selectedRequest.hiresNeeded}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-750 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-850">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedRequest.workEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-750 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-850">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{selectedRequest.phone || 'No phone provided'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-350 pt-2.5 border-t border-slate-100 dark:border-slate-850">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Submitted on {formatDateTime(selectedRequest.createdAt)}</span>
                    </div>
                  </div>

                  {/* Details Message */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider">Hiring Details &amp; Stack</span>
                    <div className="bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedRequest.details || 'No additional hiring details provided.'}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Button variant="brand" className="rounded-full text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white border-0 px-6 shadow-md shadow-emerald-500/20" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
