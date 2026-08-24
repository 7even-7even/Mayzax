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
import { MessageSquareCode, Mail, Phone, Calendar, Eye, Search, XCircle, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export default function AdminEnquiriesPage() {
  const { isAdmin } = usePermissions();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchEnquiries = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/inquiries', {
        params: {
          page,
          pageSize: 10,
          search: debouncedSearch || undefined,
        },
      });
      setEnquiries(data.data || []);
      setPagination(data.pagination);
    } catch (err: any) {
      toast.error('Failed to load candidate enquiries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchEnquiries();
    }
  }, [isAdmin, debouncedSearch, page]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold">Unauthorized Access</h2>
        <p className="text-slate-400 text-xs mt-1">Only administrative logins can view candidate enquiries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        icon={MessageSquareCode}
        title="Candidate Enquiries"
        description="Review questions, requests, and placement enquiries submitted by website visitors"
        badge={pagination?.total ? `${pagination.total} total submissions` : undefined}
        gradient="from-slate-900 to-slate-700"
        bottomGradient="from-pink-600 via-rose-500 to-rose-700"
      />

      <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-fadeIn">
        <div className="bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md">
              <MessageSquareCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Submission Directory</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400">View detailed messages sent from the landing page</p>
            </div>
          </div>
          <div className="relative max-w-xs w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton cols={5} rows={5} /></div>
          ) : enquiries.length === 0 ? (
            <div className="px-5 py-12">
              <EmptyState icon={MessageSquareCode} title="No Enquiries Found" description={debouncedSearch ? "No submissions match your search query." : "No enquiries have been submitted yet."} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40">
                    <TableHead className="font-semibold text-xs">Sender Name</TableHead>
                    <TableHead className="font-semibold text-xs">Email / Contact</TableHead>
                    <TableHead className="font-semibold text-xs">Service Interested</TableHead>
                    <TableHead className="font-semibold text-xs">Submitted Date</TableHead>
                    <TableHead className="text-right font-semibold text-xs pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enquiries.map((enquiry) => (
                    <TableRow key={enquiry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <TableCell className="font-bold text-slate-850 dark:text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                            {enquiry.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span>{enquiry.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{enquiry.email}</div>
                        <div className="text-[10px] text-slate-400">{enquiry.phone || 'No phone'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-pink-200 text-pink-700 dark:border-pink-800 dark:text-pink-400">{enquiry.serviceInterested}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDateTime(enquiry.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="outline" size="sm" className="rounded-full h-8 gap-1 hover:border-pink-300 hover:text-pink-600" onClick={() => setSelectedEnquiry(enquiry)}>
                          <Eye className="h-3.5 w-3.5" /> Read enquiry
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

      {/* Enquiry Detail Modal */}
      <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
        <DialogContent className="max-w-xl rounded-3xl flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-1.5 w-full bg-gradient-to-r from-pink-500 to-rose-600" />
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-sm">
                <FileQuestion className="h-4 w-4" />
              </div>
              Enquiry Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review message submitted from website.
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <>
              <ScrollArea className="flex-1 px-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Sender Profile */}
                  <div className="bg-slate-50 dark:bg-slate-955 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-base font-extrabold shadow-sm">
                      {selectedEnquiry.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-850 dark:text-slate-100">{selectedEnquiry.fullName}</h4>
                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Interested in {selectedEnquiry.serviceInterested}</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedEnquiry.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedEnquiry.phone || 'No phone number provided'}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-slate-700 dark:text-slate-350 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Submitted on {formatDateTime(selectedEnquiry.createdAt)}</span>
                    </div>
                  </div>

                  {/* Details Message */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider">Submission Message / Details</span>
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedEnquiry.details || 'No additional message details provided.'}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Button variant="brand" className="rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white border-0 px-6 shadow-md shadow-rose-500/20" onClick={() => setSelectedEnquiry(null)}>
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
