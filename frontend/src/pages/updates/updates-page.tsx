import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { getAssetUrl, extractErrorMessage } from '@/lib/api-client';
import { useUpdates, useMarkUpdateAsRead, useCreateUpdate, useDeleteUpdate, SystemUpdateItem } from '@/hooks/use-updates';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
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
import { Bell, FileText, Download, Plus, Trash2, Eye, ExternalLink, Sparkles, Loader2, Award, Calendar, Zap, BookOpen, Link2 } from 'lucide-react';
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
    if (item.isRead) return;
    markAsReadMutation.mutate(item.id);
  };

  return (
    <div className="space-y-5">
      <PremiumPageHeader
        icon={Bell}
        title="Updates & Releases"
        description="Stay up to date with new features, improvements & documentation"
        badge={unreadCount > 0 ? `${unreadCount} new` : undefined}
        actions={
          isAdmin ? (
            <Button variant="brand" onClick={() => setDialogOpen(true)} className="rounded-full shadow-md shadow-indigo-500/20 gap-1.5">
              <Plus className="h-4 w-4" /> Post Update
            </Button>
          ) : undefined
        }
        gradient="from-indigo-500 to-indigo-700"
        bottomGradient="from-indigo-650 via-violet-600 to-indigo-800"
      />

      <div className="space-y-4 ">
        {!isLoading && updates.length === 0 && (
          <Card className="p-8 rounded-2xl border-slate-200/60 border-dashed">
            <EmptyState icon={Bell} title="No Updates Posted Yet" description="System updates, feature releases & docs will appear here." />
          </Card>
        )}

        <StaggerContainer className="grid grid-cols-1 gap-6">
          {!isLoading &&
            updates.map((item) => (
              <StaggerItem key={item.id}>
                <motion.div layout onClick={() => handleRead(item)} className="cursor-pointer">
                  <div className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md ${item.isRead ? 'border-slate-200' : 'border-indigo-200 bg-indigo-50/10'}`}>
                    {!item.isRead && (
                      <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden">
                        <div className="absolute right-[-18px] top-[14px] rotate-45 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-0.5 text-[8px] font-bold text-white shadow-sm uppercase tracking-wider">
                          New
                        </div>
                      </div>
                    )}
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${item.isRead ? 'from-slate-500 to-slate-600' : 'from-indigo-600 to-violet-600'}`}>
                            {item.version ? <Zap className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {item.version && (
                            <Badge variant="secondary" className="rounded-full font-mono text-xs px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600">
                              {item.version}
                            </Badge>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</div>
                      {item.pdfUrl && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100">
                            <FileText className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{item.pdfOriginalName || 'Release Document'}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">PDF Attachment</p>
                          </div>
                          {item.pdfUrl.startsWith('http') ? (
                            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1.5" onClick={(e) => { e.stopPropagation(); window.open(item.pdfUrl!, '_blank'); }}>
                              <ExternalLink className="h-3 w-3" /> View
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1.5" onClick={(e) => handleDownloadPdf(e, item)}>
                              {downloadingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
        </StaggerContainer>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200/60 p-0 overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-mayzax-gradient" />
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md">
                  <Award className="h-4 w-4" />
                </div>
                Post System Update
              </DialogTitle>
              <DialogDescription className="text-xs">
                Share features, release notes & docs with all users in feed.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePostUpdate} className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="updateTitle" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Title *
                </Label>
                <Input id="updateTitle" placeholder="e.g. Activity Tracking & Hybrid Verification" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateVersion" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Version
                </Label>
                <Input id="updateVersion" placeholder="v1.1.0" value={version} onChange={(e) => setVersion(e.target.value)} className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateDesc" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Description *
                </Label>
                <Textarea id="updateDesc" rows={4} placeholder="Key changes, fixes, features..." value={description} onChange={(e) => setDescription(e.target.value)} required className="rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 resize-none" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driveUrl" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Drive / Doc Link
                </Label>
                <Input id="driveUrl" type="url" placeholder="https://drive.google.com/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50" />
              </div>

              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-250" />
                </div>
                <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or Upload PDF</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdfFile" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-mayzax-blue-500" />
                  Attach PDF
                </Label>
                <Input id="pdfFile" type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-mayzax-blue-300 focus:ring-4 focus:ring-mayzax-blue-50 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-mayzax-blue-50 file:text-mayzax-blue-700 hover:file:bg-mayzax-blue-100 cursor-pointer" />
                <p className="text-[11px] text-slate-400">Max 25MB</p>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={createUpdateMutation.isPending} className="rounded-full gap-1.5 shadow-md shadow-mayzax-blue-200/30 bg-mayzax-gradient border-0 text-white hover:opacity-90">
                  {createUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Sparkles className="h-3.5 w-3.5" />
                  Publish Update
                </Button>
              </DialogFooter>
            </form>
          </div>
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
