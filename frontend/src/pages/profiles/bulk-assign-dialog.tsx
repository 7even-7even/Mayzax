import { useState } from 'react';
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

  const recruiters = recruitersData?.data ?? [];
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-mayzax-blue" />
            Bulk Assign / Reassign Profiles
          </DialogTitle>
          <DialogDescription>
            Reassigning <span className="font-semibold text-slate-900">{selectedProfileIds.length}</span> selected candidate profiles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Recruiter(s) (Up to 5)</Label>
              <span className="text-xs text-slate-400 font-medium">{selectedRecruiterIds.length}/5 selected</span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search recruiter by name or email..."
                className="pl-8 h-8 text-xs"
                value={recruiterSearch}
                onChange={(e) => setRecruiterSearch(e.target.value)}
              />
            </div>

            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2.5">
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
                      className={`flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 transition ${
                        disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-mayzax-blue focus:ring-mayzax-blue"
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
                        <p className="text-xs font-medium text-slate-900">{recruiter.name}</p>
                        <p className="text-[11px] text-slate-400">{recruiter.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={bulkAssignMutation.isPending || selectedRecruiterIds.length === 0}>
              {bulkAssignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reassign {selectedProfileIds.length} Profiles
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
