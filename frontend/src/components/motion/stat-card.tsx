import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountUp } from './count-up';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  isLoading?: boolean;
  colorClass?: string; // tailwind text+bg color pair, e.g. "text-mayzax-blue bg-mayzax-blue-50"
  suffix?: string;
  featured?: boolean;
  index?: number;
}

export function StatCard({ icon: Icon, label, value, isLoading, colorClass = 'text-mayzax-blue bg-mayzax-blue-50', suffix = '', featured = false, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-lg h-full flex flex-col justify-between',
        featured && 'ring-1 ring-mayzax-blue-100',
      )}
    >
      {/* subtle animated background sheen on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <div className="relative flex flex-col justify-between h-full gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-500 leading-normal line-clamp-2" title={label}>{label}</p>
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110', colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 leading-none">
              {typeof value === 'number' ? (
                <CountUp value={value} suffix={suffix} />
              ) : (
                <span className="text-base font-semibold block truncate" title={value}>{value}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
