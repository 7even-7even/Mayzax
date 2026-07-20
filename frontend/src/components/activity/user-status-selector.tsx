import { useState, useEffect } from 'react';
import { UserStatus } from '@/types';
import { useCurrentStatus, useChangeStatus, useActivityHeartbeat } from '@/hooks/use-activity';
import { useAuth } from '@/context/auth-context';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, ChevronDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; dotColor: string; bgColor: string; textColor: string; borderColor: string }
> = {
  ACTIVE: {
    label: 'Active',
    dotColor: 'bg-emerald-500 animate-pulse',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  SHORT_BREAK: {
    label: 'Short Break',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  DINNER_BREAK: {
    label: 'Dinner Break',
    dotColor: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  BRIEFING_TRAINING: {
    label: 'Briefing / Training',
    dotColor: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  MEETING: {
    label: 'Meeting',
    dotColor: 'bg-sky-500',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
  },
  SYSTEM_ISSUE: {
    label: 'System Issue',
    dotColor: 'bg-rose-500 animate-pulse',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  OFFLINE: {
    label: 'Offline',
    dotColor: 'bg-slate-400',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
  },
};

function formatSecondsToTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function UserStatusSelector() {
  const { user } = useAuth();
  useActivityHeartbeat();

  const isTracked = user?.role === 'RECRUITER' || user?.role === 'TEAM_LEADER';
  const { data: currentData, isLoading } = useCurrentStatus();
  const changeStatusMutation = useChangeStatus();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetStatus, setTargetStatus] = useState<UserStatus | null>(null);
  const [optionalNote, setOptionalNote] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  // Client-side live timer driven by startedAt
  useEffect(() => {
    if (!currentData?.startedAt) return;

    const startedTime = new Date(currentData.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const secs = Math.max(0, Math.floor((now - startedTime) / 1000));
      setElapsedSeconds(secs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentData?.startedAt]);

  if (!isTracked) return null;

  const currentStatus = currentData?.status ?? 'OFFLINE';
  const config = STATUS_CONFIG[currentStatus];

  const handleSelectStatus = (status: UserStatus) => {
    if (status === currentStatus) return;

    // Prompt optional note dialog only for Meeting, Briefing/Training, or System Issue
    if (status === 'MEETING' || status === 'BRIEFING_TRAINING' || status === 'SYSTEM_ISSUE') {
      setTargetStatus(status);
      setOptionalNote('');
      setNoteDialogOpen(true);
    } else {
      executeStatusChange(status, null);
    }
  };

  const executeStatusChange = async (status: UserStatus, note: string | null) => {
    try {
      await changeStatusMutation.mutateAsync({ status, optionalNote: note });
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
      setNoteDialogOpen(false);
    } catch {
      toast.error('Failed to update status. Please try again.');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Live Client-Side Timer */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-700 shadow-sm">
          <Clock className="h-3.5 w-3.5 text-mayzax-blue shrink-0" />
          <span>{isLoading ? '00:00:00' : formatSecondsToTimer(elapsedSeconds)}</span>
        </div>

        {/* Current Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={changeStatusMutation.isPending}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium transition shadow-sm ${config.bgColor} ${config.textColor} ${config.borderColor} hover:opacity-90`}
            >
              <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
              <span>{config.label}</span>
              {changeStatusMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 p-1">
            {(Object.keys(STATUS_CONFIG) as UserStatus[]).map((statusKey) => {
              if (statusKey === 'OFFLINE') return null; // Offline is handled via logout/heartbeat
              const itemConfig = STATUS_CONFIG[statusKey];
              const isSelected = currentStatus === statusKey;

              return (
                <DropdownMenuItem
                  key={statusKey}
                  onClick={() => handleSelectStatus(statusKey)}
                  className="flex items-center justify-between cursor-pointer text-xs font-medium py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${itemConfig.dotColor}`} />
                    <span>{itemConfig.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-mayzax-blue" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Optional Note Modal */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status to {targetStatus ? STATUS_CONFIG[targetStatus].label : ''}</DialogTitle>
            <DialogDescription>
              Add an optional note (e.g. meeting title, ticket number, or break context).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="statusNote">Optional Note</Label>
              <Input
                id="statusNote"
                placeholder="e.g. Sync call with client / IT reboot"
                value={optionalNote}
                onChange={(e) => setOptionalNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={changeStatusMutation.isPending}
              onClick={() => targetStatus && executeStatusChange(targetStatus, optionalNote.trim() || null)}
            >
              {changeStatusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
