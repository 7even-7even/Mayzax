import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useRecruiterBreakdown } from '@/hooks/use-analytics';
import { initials, timeAgo } from '@/lib/utils';
import { DashboardRow } from '@/types';

interface Props {
  row: DashboardRow;
  expanded: boolean;
  onToggle: () => void;
}

export function RecruiterRow({ row, expanded, onToggle }: Props) {
  const { data, isLoading } = useRecruiterBreakdown(expanded ? row.id : null);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">{initials(row.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-slate-900">{row.name}</p>
              <p className="text-xs text-slate-400">{row.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={row.isActive ? 'success' : 'muted'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
        </TableCell>
        <TableCell className="text-sm font-medium text-slate-700">{row.assignedProfiles}</TableCell>
        <TableCell className="text-sm font-medium text-slate-700">{row.totalApplications}</TableCell>
        <TableCell className="text-sm font-medium text-mayzax-blue">{row.currentShiftApplications}</TableCell>
        <TableCell className="text-xs text-slate-500">{timeAgo(row.lastActiveAt)}</TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-slate-50/60">
          <TableCell colSpan={6} className="p-0">
            <div className="px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Profile-wise application counts
              </p>
              {isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}
              {!isLoading && data && data.profileWiseCounts.length === 0 && (
                <EmptyState title="No applications yet" className="py-6" />
              )}
              {!isLoading && data && data.profileWiseCounts.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.profileWiseCounts.map((p) => (
                    <div
                      key={p.profileId}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.candidateName}</p>
                        {p.technology && <p className="text-xs text-slate-400">{p.technology}</p>}
                      </div>
                      <Badge variant="default">{p.applicationCount}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
