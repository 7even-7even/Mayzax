import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useRecruiterStats } from '@/hooks/use-recruiters';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { BarChart3, Briefcase, Clock, Users } from 'lucide-react';

export function RecruiterStatsDialog({
  recruiterId,
  onOpenChange,
}: {
  recruiterId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError, refetch } = useRecruiterStats(recruiterId);

  return (
    <Dialog open={!!recruiterId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Recruiter Performance</DialogTitle>
          <DialogDescription>
            {data ? `${data.recruiter.name} · ${data.recruiter.email}` : 'Loading recruiter stats...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {data && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <StatBox icon={Users} label="Assigned Profiles" value={data.assignedProfilesCount} />
              <StatBox icon={Briefcase} label="Total Applications" value={data.totalApplications} />
              <StatBox icon={BarChart3} label="Current Shift" value={data.currentShiftApplications} />
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5" />
              Last active: <span className="font-medium text-slate-800">{timeAgo(data.lastActiveAt)}</span>
              {data.lastActiveAt && <span className="text-slate-400">({formatDateTime(data.lastActiveAt)})</span>}
              <Badge variant="muted" className="ml-auto">
                Business date: {data.currentBusinessDate}
              </Badge>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Profile-wise Application Counts</p>
              {data.profileWiseCounts.length === 0 ? (
                <EmptyState
                  title="No applications yet"
                  description="This recruiter hasn't submitted any applications for their assigned profiles."
                  className="py-8"
                />
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin pr-1">
                  {data.profileWiseCounts.map((row) => (
                    <div
                      key={row.profileId}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.candidateName}</p>
                        {row.technology && <p className="text-xs text-slate-400">{row.technology}</p>}
                      </div>
                      <Badge variant="default">{row.applicationCount} applications</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm">
      <Icon className="mx-auto mb-1 h-4 w-4 text-mayzax-blue" />
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}
