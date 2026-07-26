import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  premium?: boolean;
  badge?: string;
}

export function PageHeader({ title, description, actions, className, premium = false, badge }: PageHeaderProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">{title}</h1>
            {premium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider">
              </span>
            )}
            {badge && (
              <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-200 text-violet-700 px-2.5 py-0.5 text-xs font-semibold">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-500 max-w-2xl">{description}</p>}
          <div className="mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600" />
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </motion.div>
  );
}
