import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientBorderCardProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * A card wrapped in an animated, slowly-shifting gradient border
 * (Mayzax blue <-> green). Used to draw attention to featured/highlighted
 * content such as top-performing recruiters or key summary metrics.
 */
export function GradientBorderCard({ children, className, contentClassName }: GradientBorderCardProps) {
  return (
    <div className={cn('gradient-border-wrap', className)}>
      <div className={cn('rounded-[calc(1rem-1.5px)] bg-white h-full w-full', contentClassName)}>{children}</div>
    </div>
  );
}
