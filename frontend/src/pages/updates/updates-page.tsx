import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getAssetUrl, extractErrorMessage } from '@/lib/api-client';
import {
  useUpdates,
  useMarkUpdateAsRead,
  useCreateUpdate,
  useDeleteUpdate,
  SystemUpdateItem,
} from '@/hooks/use-updates';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { formatDateTime } from '@/lib/utils';
import { Bell, FileText, Download, Plus, Trash2, Eye, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export default function UpdatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: updatesData, isLoading } = useUpdates();
  const markAsReadMutation = useMarkUpdateAsRead();
  const createUpdateMutation = useCreateUpdate();
  const deleteUpdateMutation = useDeleteUpdate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const updates = updatesData?.updates ?? [];

  const handleDownloadPdf = async (e: React.MouseEvent, item: SystemUpdateItem) => {
    e.stopPropagation();
    if (!item.pdfUrl) return;
    handleRead(item);
    const fullUrl = getAssetUrl(item.pdfUrl);
    setDownloadingId(item.id);
    try {
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
    if (pdfFile) formData.append('pdfFile', pdfFile);

    try {
      await createUpdateMutation.mutateAsync(formData);
      toast.success('System update posted successfully!');
      setDialogOpen(false);
      setTitle('');
      setVersion('');
      setDescription('');
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
    <div>
      <PageHeader
        title="Updates & Release Notes"
        description="System announcements, new features, and downloadable documentation PDFs."
        actions={
          isAdmin ? (
            <Button variant="brand" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Post New Release Update
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {isLoading && (
          <Card className="p-6">
            <TableSkeleton rows={4} cols={3} />
          </Card>
        )}

        {!isLoading && updates.length === 0 && (
          <Card className="p-8">
            <EmptyState
              icon={Bell}
              title="No Updates Posted Yet"
              description="System updates, feature releases, and PDF documentation will appear here."
            />
          </Card>
        )}

        {!isLoading &&
          updates.map((item) => (
            <Card
              key={item.id}
              onClick={() => handleRead(item)}
              className={`border transition shadow-sm ${
                item.isRead ? 'border-slate-200 bg-white' : 'border-mayzax-blue/30 bg-mayzax-blue/5'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mayzax-blue/10 text-mayzax-blue">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                        {item.version && (
                          <span className="rounded-full bg-mayzax-blue/10 px-2.5 py-0.5 text-xs font-semibold text-mayzax-blue">
                            {item.version}
                          </span>
                        )}
                        {!item.isRead && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Posted by <span className="font-medium text-slate-600">{item.createdBy.name}</span> on{' '}
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 self-end sm:self-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </div>

                {item.pdfUrl && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <FileText className="h-5 w-5 text-mayzax-blue shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {item.pdfOriginalName || 'Release_Notes_Documentation.pdf'}
                      </p>
                      <p className="text-[11px] text-slate-400">PDF Document Attachment</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRead(item);
                          setPreviewPdfUrl(getAssetUrl(item.pdfUrl));
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" /> View PDF
                      </Button>
                      <Button
                        variant="brand"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled={downloadingId === item.id}
                        onClick={(e) => handleDownloadPdf(e, item)}
                      >
                        {downloadingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Admin Post New Update Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post System Update & Announcement</DialogTitle>
            <DialogDescription>
              Share new feature updates, release notes, and PDF documentation with all users.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePostUpdate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="updateTitle">Title *</Label>
              <Input
                id="updateTitle"
                placeholder="e.g. Activity Tracking & Hybrid Verification Engine"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="updateVersion">Version (Optional)</Label>
              <Input
                id="updateVersion"
                placeholder="e.g. v2.1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="updateDesc">Description / Release Notes *</Label>
              <Textarea
                id="updateDesc"
                rows={4}
                placeholder="Detail the key changes, bug fixes, or new features added..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pdfFile">Attach PDF Documentation (Optional)</Label>
              <Input
                id="pdfFile"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-slate-400">Upload user manual or feature release notes PDF (max 15MB).</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="brand" disabled={createUpdateMutation.isPending}>
                {createUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Publish Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!previewPdfUrl} onOpenChange={() => setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base">PDF Document Preview</DialogTitle>
            {previewPdfUrl && (
              <a href={previewPdfUrl} target="_blank" rel="noreferrer" className="text-xs text-mayzax-blue flex items-center gap-1 hover:underline mr-6">
                Open in new tab <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {previewPdfUrl && (
              <iframe src={previewPdfUrl} className="w-full h-full border-0" title="PDF Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
