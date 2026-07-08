import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useRecruiterBreakdown } from '@/hooks/use-analytics';
import { initials, timeAgo } from '@/lib/utils';
import { DashboardRow } from '@/types';

const MotionRow = motion(TableRow);

interface Props {
  row: DashboardRow;
  expanded: boolean;
  onToggle: () => void;
  index?: number;
}

export function RecruiterRow({ row, expanded, onToggle, index = 0 }: Props) {
  const { data, isLoading } = useRecruiterBreakdown(expanded ? row.id : null);

  return (
    <>
      <MotionRow
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
        className="cursor-pointer transition-colors hover:bg-mayzax-blue-50/40"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </motion.span>
            <Avatar className="h-7 w-7 ring-2 ring-white transition-shadow group-hover:ring-mayzax-blue-100">
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
      </MotionRow>

      <AnimatePresence initial={false}>
        {expanded && (
          <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
            <TableCell colSpan={6} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned profile application counts · Total vs current shift
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
                      {data.profileWiseCounts.map((p, i) => (
                        <motion.div
                          key={p.profileId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.04 }}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-mayzax-green-200 hover:bg-mayzax-green-50/40"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">{p.candidateName}</p>
                            {p.technology && <p className="text-xs text-slate-400">{p.technology}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" title="Total applications">
                              Total {p.applicationCount}
                            </Badge>
                            <Badge variant={p.currentShiftApplicationCount > 0 ? 'default' : 'muted'} title="Current shift applications">
                              Today {p.currentShiftApplicationCount}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}
