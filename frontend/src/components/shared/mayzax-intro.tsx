import { motion } from "framer-motion";
import mayzaxLogo from "@/assets/mayzax-logo.png";

interface MayzaxIntroProps {
  onComplete?: () => void;
}

export function MayzaxIntro({ onComplete }: MayzaxIntroProps) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 flex items-center justify-center bg-white z-50 overflow-hidden"
    >
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
      />

      {/* Logo Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          duration: 1.2,
          type: "spring",
          stiffness: 80,
        }}
        className="flex items-center gap-4"
      >
        {/* Logo Icon */}
        <motion.img
          src={mayzaxLogo}
          alt="Mayzax"
          initial={{
            scale: 0,
            rotate: -20,
          }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            duration: 1.2,
            type: "spring",
          }}
          className="h-20 w-20 rounded-2xl shadow-xl"
        />

        {/* Text */}
        <motion.div
          initial={{
            opacity: 0,
            x: 30,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            delay: 1,
            duration: 1,
          }}
          onAnimationComplete={onComplete}
        >
          <h1 className="text-5xl font-bold text-slate-900">Mayzax</h1>

          <p className="text-slate-500">Recruitment ATS</p>
        </motion.div>
      </motion.div>

      {/* Shine Effect */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{
          delay: 2,
          duration: 2,
        }}
        className="absolute h-32 w-20 rotate-12 bg-white/50 blur-xl"
      />
    </motion.div>
  );
}