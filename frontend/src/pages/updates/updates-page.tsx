import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { getAssetUrl, extractErrorMessage } from '@/lib/api-client';
import { useUpdates, useMarkUpdateAsRead, useCreateUpdate, useDeleteUpdate, SystemUpdateItem } from '@/hooks/use-updates';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { formatDateTime } from '@/lib/utils';
import { Bell, FileText, Download, Plus, Trash2, Eye, ExternalLink, Sparkles, Loader2, Award, Calendar, Zap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';

export default function UpdatesPage() {
  const { isAdmin } = usePermissions();

  const { data: updatesData, isLoading } = useUpdates();
  const markAsReadMutation = useMarkUpdateAsRead();
  const createUpdateMutation = useCreateUpdate();
  const deleteUpdateMutation = useDeleteUpdate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const updates = updatesData?.updates ?? [];
  const unreadCount = updatesData?.unreadCount ?? 0;

  const handleDownloadPdf = async (e: React.MouseEvent, item: SystemUpdateItem) => {
    e.stopPropagation();
    if (!item.pdfUrl) return;
    handleRead(item);
    if (item.pdfUrl.startsWith('http://') || item.pdfUrl.startsWith('https://')) {
      window.open(item.pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const fullUrl = getAssetUrl(item.pdfUrl);
    setDownloadingId(item.id);
    try {
      const { saveAs } = await import('file-saver');
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      saveAs(blob, item.pdfOriginalName || 'Release_Documentation.pdf');
      toast.success('PDF download started.');
    } catch {
      toast.error('Could not download PDF directly. Opening in browser...');
      window.open(fullUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    const formData = new FormData();
    formData.append('title', title.trim());
    if (version.trim()) formData.append('version', version.trim());
    formData.append('description', description.trim());
    if (driveUrl.trim()) formData.append('pdfUrl', driveUrl.trim());
    if (pdfFile) formData.append('pdfFile', pdfFile);

    try {
      await createUpdateMutation.mutateAsync(formData);
      toast.success('System update posted successfully!');
      setDialogOpen(false);
      setTitle('');
      setVersion('');
      setDescription('');
      setDriveUrl('');
      setPdfFile(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to post update. Please try again.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this update release?')) return;
    try {
      await deleteUpdateMutation.mutateAsync(id);
      toast.success('Update deleted.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete update.'));
    }
  };

  const handleRead = (item: SystemUpdateItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
  };

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-white via-indigo-50/10 to-violet-50/20 p-[1px] shadow-sm">
          <div className="rounded-[19px] bg-white">
            <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    Updates & Release Notes
                    {unreadCount > 0 && <Badge className="bg-red-500 text-white border-0 animate-pulse">{unreadCount} new</Badge>}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">System announcements, features & documentation • Premium timeline</p>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1 font-semibold">
                      <BookOpen className="h-3 w-3" />
                      {updates.length} releases
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 font-medium text-violet-700">
                      <Sparkles className="h-3 w-3" />
                      Premium feed
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <Button variant="brand" onClick={() => setDialogOpen(true)} className="gap-2 rounded-full shadow-md shadow-indigo-500/20 px-5">
                  <Plus className="h-4 w-4" /> Post New Release
                </Button>
              )}
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-teal-500" />
          </div>
        </div>
      </Reveal>

      <div className="space-y-4">
        {isLoading && (
          <Card className="p-6 rounded-2xl border-slate-200/60">
            <TableSkeleton rows={4} cols={3} />
          </Card>
        )}

        {!isLoading && updates.length === 0 && (
          <Card className="p-8 rounded-2xl border-slate-200/60 border-dashed">
            <EmptyState icon={Bell} title="No Updates Posted Yet" description="System updates, feature releases & docs will appear here in a premium timeline." />
          </Card>
        )}

        <StaggerContainer className="space-y-4">
          {!isLoading &&
            updates.map((item, idx) => (
              <StaggerItem key={item.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => handleRead(item)}
                  className={`group relative overflow-hidden rounded-2xl border p-[1px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer ${
                    item.isRead ? 'border-slate-200/60 bg-white' : 'border-violet-200 bg-gradient-to-br from-violet-50/50 to-indigo-50/30 shadow-md'
                  }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${item.isRead ? 'bg-slate-200' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`} />
                  <div className="rounded-[15px] bg-white">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${item.isRead ? 'bg-slate-100 text-slate-500' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'}`}>
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-900 truncate">{item.title}</h3>
                              {item.version && (
                                <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-xs font-semibold shadow-sm">{item.version}</span>
                              )}
                              {!item.isRead && (
                                <span className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider animate-pulse">New</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              Posted by <span className="font-semibold text-slate-700">{item.createdBy.name}</span> • {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50/60 border border-slate-100 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.description}
                      </div>

                      {item.pdfUrl && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{item.pdfOriginalName || 'Release Notes Documentation'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              {item.pdfUrl.startsWith('http') ? <><ExternalLink className="h-3 w-3" /> Google Drive / External</> : <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> PDF Attachment • Premium viewer</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {item.pdfUrl.startsWith('http') ? (
                              <Button variant="brand" size="sm" className="h-9 text-xs gap-1.5 rounded-full w-full sm:w-auto shadow-sm" onClick={(e) => { e.stopPropagation(); handleRead(item); window.open(item.pdfUrl!, '_blank', 'noopener,noreferrer'); }}>
                                <ExternalLink className="h-3.5 w-3.5" /> Open Document
                              </Button>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-full bg-white w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); handleRead(item); setPreviewPdfUrl(getAssetUrl(item.pdfUrl)); }}>
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                                <Button variant="brand" size="sm" className="h-9 text-xs gap-1.5 rounded-full shadow-sm w-full sm:w-auto" disabled={downloadingId === item.id} onClick={(e) => handleDownloadPdf(e, item)}>
                                  {downloadingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <Zap className="h-3 w-3 text-violet-500" />
                        {item.isRead ? 'Read • Marked as seen' : 'Unread • Click to mark as read'} • Premium timeline
                      </div>
                    </CardContent>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
        </StaggerContainer>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                <Award className="h-4 w-4" />
              </div>
              Post System Update
            </DialogTitle>
            <DialogDescription>Share features, release notes & docs with all users in premium feed.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePostUpdate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="updateTitle">Title *</Label>
              <Input id="updateTitle" placeholder="e.g. Activity Tracking & Hybrid Verification" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="updateVersion">Version</Label>
              <Input id="updateVersion" placeholder="v2.1.0" value={version} onChange={(e) => setVersion(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="updateDesc">Description *</Label>
              <Textarea id="updateDesc" rows={4} placeholder="Key changes, fixes, features..." value={description} onChange={(e) => setDescription(e.target.value)} required className="rounded-xl resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driveUrl">Drive / Doc Link</Label>
              <Input id="driveUrl" type="url" placeholder="https://drive.google.com/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className="rounded-xl" />
            </div>
            <div className="relative flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or Upload PDF</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdfFile">Attach PDF</Label>
              <Input id="pdfFile" type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="rounded-xl" />
              <p className="text-[11px] text-slate-400">Max 25MB • Premium viewer</p>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={createUpdateMutation.isPending} className="rounded-full gap-1.5 shadow-md">
                {createUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Publish Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPdfUrl} onOpenChange={() => setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF Preview
            </DialogTitle>
            {previewPdfUrl && (
              <a href={previewPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 flex items-center gap-1 hover:underline mr-6">
                Open in new tab <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full border-0" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
