import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PremiumPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  live?: boolean;
  liveLabel?: string;
  pills?: Array<{ icon?: LucideIcon; label: string; variant?: 'default' | 'premium' }>;
  actions?: ReactNode;
  gradient?: string; // tailwind gradient for icon bg
  bottomGradient?: string;
  stats?: ReactNode;
}

export function PremiumPageHeader({
  icon: Icon,
  title,
  description,
  live = false,
  liveLabel = 'Live',
  pills = [],
  actions,
  gradient = 'from-mayzax-blue to-mayzax-green',
  bottomGradient = 'from-mayzax-blue via-mayzax-green to-mayzax-blue',
  stats,
}: PremiumPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md shadow-mayzax-blue-200/30`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
                {live && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {liveLabel}
                  </span>
                )}
              </div>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">{description}</p>}
              {pills.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {pills.map((pill, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                        pill.variant === 'premium'
                          ? 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300'
                          : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pill.icon && <pill.icon className="h-3 w-3" />}
                      {pill.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            {stats && <div className="text-xs text-slate-500">{stats}</div>}
          </div>
        </div>
      </div>
      <div className={`h-1 w-full bg-gradient-to-r ${bottomGradient}`} />
    </motion.div>
  );
}
