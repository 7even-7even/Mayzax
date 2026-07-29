import { useLiveStatus } from '@/hooks/use-activity';
import { STATUS_CONFIG } from '@/components/activity/user-status-selector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, UserCheck, Coffee, AlertCircle, UserX, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Reveal } from '@/components/motion/reveal';
import { VirtualizedTable } from '@/components/shared/virtualized-table';
import { UserStatus } from '@/types';

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
      <Card className="border-slate-200/60 rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <TableSkeleton rows={4} cols={5} />
        </CardContent>
      </Card>
    );
  }

  const members = data?.members ?? [];

  const stats = [
    { label: 'Active', count: data?.totalActiveCount ?? 0, icon: UserCheck, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { label: 'Break', count: data?.totalBreakCount ?? 0, icon: Coffee, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    { label: 'Downtime', count: data?.totalIssueCount ?? 0, icon: AlertCircle, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    { label: 'Offline', count: data?.totalOfflineCount ?? 0, icon: UserX, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  ];

  return (
    <Reveal delay={0.2}>
      <Card className="border-slate-200/60 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-850 dark:to-slate-900 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white shadow-lg shadow-violet-500/20">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 dark:text-black">
                  Live Team Availability
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </CardTitle>
                <CardDescription className="text-xs dark:text-black">Real-time pulse • Shift utilization • {members.length} tracked</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {stats.map((s) => (
                <motion.div key={s.label} whileHover={{ scale: 1.05 }} className={`flex items-center gap-1.5 rounded-full ${s.bg} ${s.text} border ${s.border} px-3 py-1 text-xs font-semibold shadow-sm`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.label === 'Active' ? 'animate-pulse' : ''}`} />
                  <s.icon className="h-3.5 w-3.5" />
                  {s.count} {s.label}
                </motion.div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <Activity className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No team members online</p>
              <p className="text-xs text-slate-400 mt-1">Recruiters will appear here once they start their shift</p>
            </div>
          ) : members.length > 8 ? (
            <VirtualizedTable
              data={members}
              estimateRowHeight={68}
              maxHeight="440px"
              header={
                <div className="grid grid-cols-[1.6fr_0.6fr_1.1fr_0.7fr_0.8fr] gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-white bg-slate-50/80 dark:bg-slate-850/80">
                  <span>Recruiter</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Session</span>
                  <span className="text-right">Productive Today</span>
                </div>
              }
              renderRow={(member: any) => {
                const config = STATUS_CONFIG[member.status as UserStatus];
                return (
                  <div className="grid grid-cols-[1.6fr_0.6fr_1.1fr_0.7fr_0.8fr] gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-white/80 truncate">{member.email}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] font-medium dark:bg-slate-850 dark:text-slate-300 dark:border-slate-700">
                        {member.role === 'TEAM_LEADER' ? 'TL' : 'Rec'}
                      </Badge>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} shadow-sm`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
                        {config.label}
                      </span>
                      {member.optionalNote && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{member.optionalNote}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-white">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatDuration(member.currentDurationSeconds)}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                        <Zap className="h-3 w-3" />
                        {formatDuration(member.todayProductiveSeconds)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/40 dark:bg-slate-850/40 text-xs dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Recruiter</TableHead>
                  <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Role</TableHead>
                  <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Status</TableHead>
                  <TableHead className="font-semibold text-slate-500 dark:text-slate-300">Session</TableHead>
                  <TableHead className="text-right font-semibold text-slate-500 dark:text-slate-300">Today Productive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, idx) => {
                  const config = STATUS_CONFIG[member.status];
                  return (
                    <motion.tr
                      key={member.userId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/70 dark:border-slate-800 transition-colors"
                    >
                      <TableCell>
                        <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] dark:bg-slate-850 dark:text-slate-350 dark:border-slate-700">
                          {member.role === 'TEAM_LEADER' ? 'Team Leader' : 'Recruiter'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} shadow-sm`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
                          {config.label}
                        </span>
                        {member.optionalNote && (
                          <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500 dark:text-slate-400" title={member.optionalNote}>
                            {member.optionalNote}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-slate-650 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(member.currentDurationSeconds)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2.5 py-1 text-xs font-bold shadow-sm">
                          <Zap className="h-3 w-3" />
                          {formatDuration(member.todayProductiveSeconds)}
                        </span>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <div className="border-t border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-850 dark:to-slate-900 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5 dark:text-white">
            <Sparkles className="h-3 w-3 text-violet-500 dark:text-white" />
            Auto-refreshes every 15s
          </span>
          <span className="hidden sm:inline dark:text-white">Presence • Heartbeat tracked</span>
        </div>
      </Card>
    </Reveal>
  );
}