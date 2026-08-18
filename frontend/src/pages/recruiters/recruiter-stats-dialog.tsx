import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useRecruiterStats } from '@/hooks/use-recruiters';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { BarChart3, Briefcase, Clock, Users, Sparkles, Award, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth } from '@/context/auth-context';

export function RecruiterStatsDialog({ recruiterId, onOpenChange }: { recruiterId: string | null; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useRecruiterStats(recruiterId);

  const showRaw = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER';
  const totalAppsVal = showRaw ? (data?.rawTotalApplications ?? data?.totalApplications ?? 0) : (data?.totalApplications ?? 0);
  const todayAppsVal = showRaw ? (data?.rawCurrentShiftApplications ?? data?.currentShiftApplications ?? 0) : (data?.currentShiftApplications ?? 0);

  return (
    <Dialog open={!!recruiterId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl border-slate-200/60 p-0 overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        <div className="h-1 w-full bg-mayzax-gradient" />
        <div className="p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md">
                <BarChart3 className="h-4 w-4" />
              </div>
              Recruiter Performance
            </DialogTitle>
            <DialogDescription className="text-xs">{data ? `${data.recruiter.name} • ${data.recruiter.email}` : 'Loading stats...'}</DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          )}

          {isError && <div className="mt-6"><ErrorState onRetry={() => refetch()} /></div>}

          {data && (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <StatBox icon={Users} label="Profiles" value={data.assignedProfilesCount} gradient="from-mayzax-blue-500 to-mayzax-blue-700" />
                <StatBox icon={Briefcase} label="Total Links Submitted" value={totalAppsVal} gradient="from-mayzax-green-500 to-emerald-600" />
                <StatBox icon={TrendingUp} label="Links Submitted Today" value={todayAppsVal} gradient="from-amber-500 to-orange-600" />
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-mayzax-blue-50 to-mayzax-green-50/50 border border-mayzax-blue-100 px-3 py-2.5 text-xs">
                <Clock className="h-4 w-4 text-mayzax-blue-600" />
                <span className="text-slate-600">Last active: <span className="font-semibold text-slate-800">{timeAgo(data.lastActiveAt)}</span></span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500 animate-pulse" />
                  <Badge variant="outline" className="bg-white text-[11px]">BD: {data.currentBusinessDate}</Badge>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1 w-6 rounded-full bg-mayzax-gradient" />
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-500">Profile-wise Counts • Total vs Today</p>
                  <Sparkles className="h-3 w-3 text-mayzax-blue-400" />
                </div>
                {data.profileWiseCounts.length === 0 ? (
                  <EmptyState title="No applications yet" description="This recruiter hasn't submitted applications." className="py-10 rounded-xl border-dashed" />
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin pr-1">
                    {data.profileWiseCounts.map((row, idx) => {
                      const rowTotalVal = showRaw ? (row.rawApplicationCount ?? row.applicationCount) : row.applicationCount;
                      const rowShiftVal = showRaw ? (row.rawCurrentShiftApplicationCount ?? row.currentShiftApplicationCount) : row.currentShiftApplicationCount;
                      return (
                        <motion.div key={row.profileId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-mayzax-blue-200 hover:shadow-sm transition-all">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{row.candidateName}</p>
                            {row.technology && <p className="text-[11px] text-slate-400">{row.technology}</p>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-slate-900 text-white border-0 text-[11px] rounded-full">Total {rowTotalVal}</Badge>
                            <Badge className={`${rowShiftVal > 0 ? 'bg-mayzax-gradient text-white border-0' : 'bg-slate-100 text-slate-500'} text-[11px] rounded-full`}>Today {rowShiftVal}</Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-gradient-to-br from-mayzax-blue-50 to-mayzax-green-50/30 border border-mayzax-blue-100 p-3 flex gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mayzax-gradient text-white shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="font-semibold text-mayzax-blue-700">Insights:</span> Total apps include verification status • Current shift uses business-date IST
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: number; gradient: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-[1px] shadow-sm hover:shadow-md transition-shadow">
      <div className="rounded-[11px] bg-white p-3 text-center">
        <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
