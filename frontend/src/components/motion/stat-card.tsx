import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountUp } from './count-up';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
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
        'group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-lg',
        featured && 'ring-1 ring-mayzax-blue-100',
      )}
    >
      {/* subtle animated background sheen on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <div className="relative flex items-center gap-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-6 w-14" />
          ) : (
            <p className="text-xl font-bold text-slate-900">
              <CountUp value={value} suffix={suffix} />
            </p>
          )}
          <p className="truncate text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}
