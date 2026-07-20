import { useLiveStatus } from '@/hooks/use-activity';
import { STATUS_CONFIG } from '@/components/activity/user-status-selector';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Activity, Clock, UserCheck, Coffee, AlertCircle, UserX } from 'lucide-react';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function LiveStatusCard() {
  const { data, isLoading } = useLiveStatus();

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <TableSkeleton rows={4} cols={5} />
        </CardContent>
      </Card>
    );
  }

  const members = data?.members ?? [];

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mayzax-blue/10 text-mayzax-blue">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Live Team Availability</h3>
              <p className="text-xs text-slate-500">Real-time working status and shift utilization</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 border border-emerald-200">
              <UserCheck className="h-3.5 w-3.5" /> {data?.totalActiveCount ?? 0} Active
            </span>
            <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 font-medium text-amber-700 border border-amber-200">
              <Coffee className="h-3.5 w-3.5" /> {data?.totalBreakCount ?? 0} Break
            </span>
            <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5" /> {data?.totalIssueCount ?? 0} Downtime
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-600 border border-slate-200">
              <UserX className="h-3.5 w-3.5" /> {data?.totalOfflineCount ?? 0} Offline
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No team members found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/30 text-xs">
                <TableHead>Recruiter</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Session</TableHead>
                <TableHead className="text-right">Today Productive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const config = STATUS_CONFIG[member.status];
                return (
                  <TableRow key={member.userId} className="text-xs">
                    <TableCell>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-[11px] text-slate-400">{member.email}</p>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {member.role === 'TEAM_LEADER' ? 'Team Leader' : 'Recruiter'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </span>
                      {member.optionalNote && (
                        <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-400" title={member.optionalNote}>
                          Note: {member.optionalNote}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{formatDuration(member.currentDurationSeconds)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {formatDuration(member.todayProductiveSeconds)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
