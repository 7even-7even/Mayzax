import { useState, useEffect } from 'react';
import { UserStatus } from '@/types';
import { useCurrentStatus, useChangeStatus, useActivityHeartbeat, useTodayActivity } from '@/hooks/use-activity';
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronDown, Check, Loader2, Power, Wifi, Zap, Coffee, Utensils, GraduationCap, Users as UsersIcon, AlertTriangle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; shortLabel: string; dotColor: string; bgColor: string; textColor: string; borderColor: string; icon: any; description: string; gradient: string }
> = {
  ONLINE: {
    label: 'Online',
    shortLabel: 'Online',
    dotColor: 'bg-blue-500 animate-pulse',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: Wifi,
    description: 'Available & online',
    gradient: 'from-blue-500 to-cyan-600',
  },
  ACTIVE: {
    label: 'Active',
    shortLabel: 'Active',
    dotColor: 'bg-emerald-500 animate-pulse',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    icon: Zap,
    description: 'Productive & working',
    gradient: 'from-emerald-500 to-teal-600',
  },
  SHORT_BREAK: {
    label: 'Short Break',
    shortLabel: 'Short Break',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    icon: Coffee,
    description: 'Quick break',
    gradient: 'from-amber-500 to-orange-600',
  },
  DINNER_BREAK: {
    label: 'Dinner Break',
    shortLabel: 'Dinner Break',
    dotColor: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: Utensils,
    description: 'Meal break',
    gradient: 'from-orange-500 to-red-500',
  },
  BRIEFING_TRAINING: {
    label: 'Briefing / Training',
    shortLabel: 'Briefing',
    dotColor: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    icon: GraduationCap,
    description: 'Learning session',
    gradient: 'from-indigo-500 to-violet-600',
  },
  MEETING: {
    label: 'Meeting',
    shortLabel: 'Meeting',
    dotColor: 'bg-sky-500',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200',
    icon: UsersIcon,
    description: 'In a meeting',
    gradient: 'from-sky-500 to-blue-600',
  },
  SYSTEM_ISSUE: {
    label: 'System Issue',
    shortLabel: 'System Issue',
    dotColor: 'bg-rose-500 animate-pulse',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    icon: AlertTriangle,
    description: 'Technical issue',
    gradient: 'from-rose-500 to-red-600',
  },
  OFFLINE: {
    label: 'Offline',
    shortLabel: 'Offline',
    dotColor: 'bg-slate-400',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    icon: Power,
    description: 'End shift / offline',
    gradient: 'from-slate-400 to-slate-600',
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

  const isTracked = ['RECRUITER', 'TEAM_LEADER', 'RESUME_ASSIST', 'SALES_EXEC'].includes(user?.role || '');
  const { data: currentData, isLoading } = useCurrentStatus();
  const { data: todayData } = useTodayActivity();
  const changeStatusMutation = useChangeStatus();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetStatus, setTargetStatus] = useState<UserStatus | null>(null);
  const [optionalNote, setOptionalNote] = useState('');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [offlineConfirmOpen, setOfflineConfirmOpen] = useState(false);

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

  const currentStatus = (currentData?.status ?? 'OFFLINE') as UserStatus;
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.OFFLINE;
  const CurrentIcon = config.icon;

  const shortBreaksCount = todayData?.logs?.filter((l) => l.status === 'SHORT_BREAK').length ?? 0;
  const dinnerBreaksCount = todayData?.logs?.filter((l) => l.status === 'DINNER_BREAK').length ?? 0;

  const isBreakExtended =
    (currentStatus === 'SHORT_BREAK' && elapsedSeconds > 900) ||
    (currentStatus === 'DINNER_BREAK' && elapsedSeconds > 2400);

  const handleSelectStatus = (status: UserStatus) => {
    if (status === currentStatus) return;

    if (status === 'SHORT_BREAK' && shortBreaksCount >= 2) {
      toast.error('You have already taken your 2 short breaks for this shift.');
      return;
    }

    if (status === 'DINNER_BREAK' && dinnerBreaksCount >= 1) {
      toast.error('You have already taken your dinner break for this shift.');
      return;
    }

    if (status === 'OFFLINE') {
      setTargetStatus(status);
      setOfflineConfirmOpen(true);
      return;
    }

    // Prompt optional note dialog for Meeting, Briefing/Training, System Issue, and also for Offline? Already handled.
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
      toast.success(`Status updated to ${STATUS_CONFIG[status].label}`, {
        description: STATUS_CONFIG[status].description,
      });
      setNoteDialogOpen(false);
      setOfflineConfirmOpen(false);
    } catch {
      toast.error('Failed to update status. Please try again.');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Live Timer*/}
        <div className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-mono font-semibold shadow-sm transition-all duration-300",
          isBreakExtended
            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400 animate-pulse"
            : "border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
        )}>
          <div className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-white",
            isBreakExtended ? "bg-rose-600 animate-pulse" : "bg-slate-900 dark:bg-slate-700"
          )}>
            <Clock className="h-3 w-3" />
          </div>
          <span>{isLoading ? '00:00:00' : formatSecondsToTimer(elapsedSeconds)}</span>
          <div className={cn("ml-1 h-1.5 w-1.5 rounded-full", isBreakExtended ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-pulse")} />
        </div>

        {/* Current Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={changeStatusMutation.isPending}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-sm hover:shadow-md ${config.bgColor} ${config.textColor} ${config.borderColor}`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} text-white shadow-sm`}>
                <CurrentIcon className="h-3 w-3" />
              </div>
              <span className="hidden sm:inline">{config.label}</span>
              <span className="sm:hidden">{config.shortLabel}</span>
              {changeStatusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-slate-200">
            <DropdownMenuLabel className="text-xs font-bold tracking-wider uppercase text-slate-500 px-2 py-1.5 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Switch Status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Active - Primary */}
            <div className="space-y-1 p-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">Primary Presence</p>
              {(['ACTIVE'] as UserStatus[]).map((statusKey) => {
                const itemConfig = STATUS_CONFIG[statusKey];
                const isSelected = currentStatus === statusKey;
                const ItemIcon = itemConfig.icon;
                return (
                  <DropdownMenuItem
                    key={statusKey}
                    onClick={() => handleSelectStatus(statusKey)}
                    className={`flex items-center justify-between cursor-pointer rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${isSelected ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? 'bg-white/10 text-white' : `bg-gradient-to-br ${itemConfig.gradient} text-white shadow-sm`}`}>
                        <ItemIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">{itemConfig.label}</p>
                        <p className={`text-[11px] leading-tight ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{itemConfig.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator />

            {/* Breaks & Meetings */}
            <div className="space-y-1 p-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-1">Break & Meetings</p>
              {(Object.keys(STATUS_CONFIG) as UserStatus[]).filter((k) => !['ONLINE', 'ACTIVE', 'OFFLINE'].includes(k)).map((statusKey) => {
                const itemConfig = STATUS_CONFIG[statusKey];
                const isSelected = currentStatus === statusKey;
                const ItemIcon = itemConfig.icon;

                // Determine if break limit is reached
                let isLimitReached = false;
                let limitLabel = '';
                if (statusKey === 'SHORT_BREAK') {
                  isLimitReached = shortBreaksCount >= 2;
                  limitLabel = ` (${shortBreaksCount}/2)`;
                } else if (statusKey === 'DINNER_BREAK') {
                  isLimitReached = dinnerBreaksCount >= 1;
                  limitLabel = ` (${dinnerBreaksCount}/1)`;
                }

                return (
                  <DropdownMenuItem
                    key={statusKey}
                    disabled={isLimitReached && !isSelected}
                    onClick={() => handleSelectStatus(statusKey)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer rounded-xl px-3 py-2 text-xs font-medium transition-all",
                      isSelected
                        ? "bg-slate-900 text-white"
                        : isLimitReached
                        ? "opacity-40 cursor-not-allowed hover:bg-transparent"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-lg",
                        isSelected ? "bg-white/10 text-white" : itemConfig.bgColor + " " + itemConfig.textColor
                      )}>
                        <ItemIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className={cn(isLimitReached && !isSelected && "line-through text-slate-400")}>
                        {itemConfig.label}{limitLabel}
                      </span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator />

            {/* Offline - Destructive */}
            <div className="p-1">
              <DropdownMenuItem
                onClick={() => handleSelectStatus('OFFLINE')}
                className={`flex items-center justify-between cursor-pointer rounded-xl px-3 py-2.5 text-xs font-medium ${currentStatus === 'OFFLINE' ? 'bg-slate-100 text-slate-600' : 'hover:bg-red-50 hover:text-red-600 text-slate-600'}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold">Go Offline</p>
                    <p className="text-[11px] text-slate-400">End shift & go offline</p>
                  </div>
                </div>
                {currentStatus === 'OFFLINE' && <Check className="h-3.5 w-3.5 text-slate-500" />}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Optional Note Modal*/}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {targetStatus && (
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${STATUS_CONFIG[targetStatus].gradient} text-white`}>
                  {(() => {
                    const Icon = targetStatus ? STATUS_CONFIG[targetStatus].icon : Zap;
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
              )}
              Update to {targetStatus ? STATUS_CONFIG[targetStatus].label : ''}
            </DialogTitle>
            <DialogDescription>Add an optional note for this status change</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="statusNote" className="text-xs font-semibold uppercase tracking-wider">
                Optional Note
              </Label>
              <Input id="statusNote" placeholder="e.g. Client call / IT support ticket #123" value={optionalNote} onChange={(e) => setOptionalNote(e.target.value)} className="rounded-xl" />
              <p className="text-[11px] text-slate-400">This note will be visible to Admin & Team Leaders</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setNoteDialogOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button variant="brand" size="sm" disabled={changeStatusMutation.isPending} onClick={() => targetStatus && executeStatusChange(targetStatus, optionalNote.trim() || null)} className="rounded-full gap-1.5">
              {changeStatusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Confirmation */}
      <Dialog open={offlineConfirmOpen} onOpenChange={setOfflineConfirmOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Power className="h-4 w-4" />
              </div>
              Go Offline?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              You’re about to go offline. Your shift timer will pause and Admin/TL will see you as offline. You can come back online anytime by selecting <span className="font-semibold text-slate-900 dark:text-white">Active</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shrink-0 mt-0.5">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800">Current session: {formatSecondsToTimer(elapsedSeconds)}</p>
              <p className="text-[11px] text-amber-700/80 mt-0.5">This time will be logged in your attendance report</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setOfflineConfirmOpen(false)} className="rounded-full">
              Stay Online
            </Button>
            <Button variant="destructive" size="sm" disabled={changeStatusMutation.isPending} onClick={() => targetStatus && executeStatusChange(targetStatus, 'User went offline')} className="rounded-full gap-1.5">
              {changeStatusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Go Offline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
