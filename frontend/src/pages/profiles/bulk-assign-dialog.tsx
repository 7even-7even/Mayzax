import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader2, Search, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecruiters } from '@/hooks/use-recruiters';
import { useBulkAssignProfiles } from '@/hooks/use-profiles';
import { extractErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProfileIds: string[];
  onSuccess: () => void;
}

export function BulkAssignDialog({ open, onOpenChange, selectedProfileIds, onSuccess }: Props) {
  const { user } = useAuth();
  const bulkAssignMutation = useBulkAssignProfiles();
  const { data: recruitersData } = useRecruiters({ isActive: true, pageSize: 100 });

  const recruiters = useMemo(() => {
    const list = [...(recruitersData?.data ?? [])].filter(
      (r) => r.role === 'RECRUITER' || r.role === 'TEAM_LEADER'
    );
    if (user && user.role === 'TEAM_LEADER') {
      const exists = list.some((r) => r.id === user.id);
      if (!exists) {
        list.unshift({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: true,
        } as any);
      }
    }
    return list;
  }, [recruitersData, user]);
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [selectedRecruiterIds, setSelectedRecruiterIds] = useState<string[]>([]);

  const filteredRecruiters = recruiters.filter(
    (r) =>
      r.name.toLowerCase().includes(recruiterSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(recruiterSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecruiterIds.length === 0) {
      toast.error('Please select at least 1 recruiter.');
      return;
    }

    try {
      await bulkAssignMutation.mutateAsync({
        profileIds: selectedProfileIds,
        assignedRecruiterIds: selectedRecruiterIds,
      });
      toast.success(`Successfully reassigned ${selectedProfileIds.length} profiles.`);
      setSelectedRecruiterIds([]);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mayzax-gradient text-white shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            Bulk Assign / Reassign Profiles
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Reassigning <span className="font-semibold text-slate-900 dark:text-white">{selectedProfileIds.length}</span> selected candidate profiles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Select Recruiter(s) (Up to 5)</Label>
              <span className="text-xs text-mayzax-blue-600 dark:text-mayzax-blue-400 font-semibold">{selectedRecruiterIds.length}/5 selected</span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search recruiter by name or email..."
                className="pl-8 h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                value={recruiterSearch}
                onChange={(e) => setRecruiterSearch(e.target.value)}
              />
            </div>

            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 p-2">
              {filteredRecruiters.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {recruiters.length === 0
                    ? user?.role === 'TEAM_LEADER'
                      ? 'No active recruiters found in your team.'
                      : 'No active recruiters available.'
                    : 'No matching recruiters found.'}
                </p>
              ) : (
                filteredRecruiters.map((recruiter) => {
                  const checked = selectedRecruiterIds.includes(recruiter.id);
                  const disabled = !checked && selectedRecruiterIds.length >= 5;
                  return (
                    <label
                      key={recruiter.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition ${
                        disabled
                          ? 'cursor-not-allowed opacity-50'
                          : checked
                          ? 'bg-mayzax-blue-50 dark:bg-mayzax-blue-950/40 border border-mayzax-blue-200 dark:border-mayzax-blue-800'
                          : 'hover:bg-white dark:hover:bg-slate-750 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-mayzax-blue-600 focus:ring-mayzax-blue-500"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedRecruiterIds, recruiter.id]
                            : selectedRecruiterIds.filter((id) => id !== recruiter.id);
                          setSelectedRecruiterIds(next);
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{recruiter.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{recruiter.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-full dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={bulkAssignMutation.isPending || selectedRecruiterIds.length === 0} className="rounded-full bg-mayzax-gradient border-0 text-white shadow-md shadow-mayzax-blue-200/30 hover:opacity-90">
              {bulkAssignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reassign {selectedProfileIds.length} Profiles
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
