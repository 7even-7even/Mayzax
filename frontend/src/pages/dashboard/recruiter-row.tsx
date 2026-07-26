import { ChevronRight } from 'lucide-react';
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
        transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
        className="group cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-all hover:bg-gradient-to-r hover:from-indigo-50/40 hover:to-violet-50/40 dark:hover:from-slate-850 dark:hover:to-slate-800 hover:shadow-sm"
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-900 dark:group-hover:bg-slate-200 dark:group-hover:text-slate-900 group-hover:text-white transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.span>
            <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-900 shadow-sm group-hover:ring-violet-100 transition-all">
              <AvatarFallback className="bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-500 text-white font-bold text-[11px]">{initials(row.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{row.name}</p>
              <p className="text-xs text-slate-400 dark:text-white/80">{row.email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={`${row.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'} border rounded-full px-2.5 py-1 text-xs font-medium`}>
            <span className={`mr-1 h-1.5 w-1.5 rounded-full inline-block ${row.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell className="text-sm font-semibold text-slate-700 dark:text-white">
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold dark:text-white">{row.assignedProfiles}</span>
        </TableCell>
        <TableCell className="text-sm font-bold text-slate-900 dark:text-white">{row.totalApplications}</TableCell>
        <TableCell>
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-mayzax-blue-600 to-mayzax-green-600 text-white px-2.5 py-1 text-xs font-bold shadow-sm">{row.currentShiftApplications}</span>
        </TableCell>
        <TableCell className="text-xs text-slate-500 dark:text-white flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          {timeAgo(row.lastActiveAt)}
        </TableCell>
      </MotionRow>

      <AnimatePresence initial={false}>
        {expanded && (
          <TableRow className="bg-gradient-to-br from-slate-50/80 to-indigo-50/20 dark:from-slate-900 dark:to-slate-950 hover:from-slate-50/80 hover:to-indigo-50/20 dark:hover:from-slate-900 dark:hover:to-slate-950">
            <TableCell colSpan={6} className="p-0">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }} className="overflow-hidden">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-8 rounded-full bg-gradient-to-r from-mayzax-blue-600 to-mayzax-green-600" />
                    <p className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-white">Assigned profile breakdown • Total vs today</p>
                  </div>
                  {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  )}
                  {!isLoading && data && data.profileWiseCounts.length === 0 && <EmptyState title="No applications yet" className="py-8" />}
                  {!isLoading && data && data.profileWiseCounts.length > 0 && (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {data.profileWiseCounts.map((p, i) => (
                        <motion.div
                          key={p.profileId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.03 }}
                          className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all"
                        >
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.candidateName}</p>
                              {p.technology && <p className="text-[11px] text-slate-400 dark:text-white/80 mt-0.5">{p.technology}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 border-0 text-[11px] rounded-full">Total {p.applicationCount}</Badge>
                              <Badge className={`${p.currentShiftApplicationCount > 0 ? 'bg-gradient-to-r from-mayzax-blue-600 to-mayzax-green-600 text-white border-0' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'} rounded-full text-[11px]`}>
                                Today {p.currentShiftApplicationCount}
                              </Badge>
                            </div>
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
