import { useEffect, useRef, memo, useCallback } from 'react';
import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/**
 * - Optimized CountUp
 * - Respects prefers-reduced-motion
 * - Memoized to avoid re-renders
 * - Uses RAF-friendly spring with unsubscription
 * - GPU-accelerated via will-change
 * - Once animation, no repeated triggers
 */
export const CountUp = memo(function CountUp({
  value,
  duration = 1.2,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const motionValue = useMotionValue(0);
  
  // Reduced motion: instant, no spring.
  // Normal: spring with tuned physics.
  const springValue = useSpring(motionValue, {
    duration: shouldReduceMotion ? 0 : duration * 1000,
    bounce: shouldReduceMotion ? 0 : 0.12,
  });

  const format = useCallback(
    (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`,
    [prefix, suffix, decimals]
  );

  useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }

    motionValue.set(value);
  }, [isInView, value, motionValue, shouldReduceMotion, format]);

  useEffect(() => {
    if (shouldReduceMotion) return;

    // Subscribe to spring changes via on("change") but throttle via RAF
    let rafId: number | null = null;
    let latest = 0;
    
    const unsubscribe = springValue.on('change', (v) => {
      latest = v;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.textContent = format(latest);
        }
        rafId = null;
      });
    });

    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [springValue, format, shouldReduceMotion]);

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ willChange: 'contents', transform: 'translateZ(0)' }}
    >
      {format(0)}
    </motion.span>
  );
});
