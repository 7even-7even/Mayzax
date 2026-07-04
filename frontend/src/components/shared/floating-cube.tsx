import { motion } from "framer-motion";

interface FloatingCubeProps {
  size?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotateX?: number;
  rotateY?: number;
  duration?: number;
  delay?: number;
  variant?: "blue" | "green" | "white";
  opacity?: number;
}

const VARIANT_COLORS: Record<string, { front: string; right: string; top: string }> = {
  blue: {
    front: "rgba(37, 99, 235, 0.18)",
    right: "rgba(37, 99, 235, 0.28)",
    top: "rgba(147, 197, 253, 0.35)",
  },
  green: {
    front: "rgba(16, 185, 129, 0.16)",
    right: "rgba(16, 185, 129, 0.26)",
    top: "rgba(167, 243, 208, 0.32)",
  },
  white: {
    front: "rgba(255, 255, 255, 0.06)",
    right: "rgba(255, 255, 255, 0.1)",
    top: "rgba(255, 255, 255, 0.18)",
  },
};

export function FloatingCube({
  size = 70,
  top,
  left,
  right,
  bottom,
  rotateX = -22,
  rotateY = 35,
  duration = 9,
  delay = 0,
  variant = "blue",
  opacity = 1,
}: FloatingCubeProps) {
  const half = size / 2;
  const colors = VARIANT_COLORS[variant];

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ top, left, right, bottom, perspective: 700, opacity }}
      animate={{ y: [0, -22, 0], rotate: [0, 4, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
      >
        <div
          className="absolute inset-0 rounded-md border border-white/20 backdrop-blur-sm"
          style={{ background: colors.front, transform: `translateZ(${half}px)` }}
        />
        <div
          className="absolute inset-0 rounded-md border border-white/20 backdrop-blur-sm"
          style={{ background: colors.right, transform: `rotateY(90deg) translateZ(${half}px)` }}
        />
        <div
          className="absolute inset-0 rounded-md border border-white/20 backdrop-blur-sm"
          style={{ background: colors.top, transform: `rotateX(90deg) translateZ(${half}px)` }}
        />
      </div>
    </motion.div>
  );
}