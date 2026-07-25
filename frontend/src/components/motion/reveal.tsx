import { motion, Variants, useReducedMotion } from 'framer-motion';
import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}

/**
 * Optimized scroll-triggered reveal
 * - Respects reduced motion
 * - Memoized
 * - GPU layer promotion
 * - Reduced stagger for better perf
 */
export const Reveal = memo(function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
  duration = 0.45,
  once = true,
  amount = 0.15,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    // No animation for reduced-motion users
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
    >
      {children}
    </motion.div>
  );
});

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05, // reduced from 0.07 for snappier feel
      delayChildren: 0.03,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
}

export const StaggerContainer = memo(function StaggerContainer({
  children,
  className,
  once = true,
  amount = 0.1,
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
});

export const StaggerItem = memo(function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItemVariants} style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  );
});
