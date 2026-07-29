import { Moon, Sun, Sparkles } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleTheme}
        className="relative flex h-8 w-14 items-center rounded-full border border-slate-200 bg-slate-100 p-1 shadow-inner transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
        aria-label="Toggle theme"
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md ${resolvedTheme === 'dark' ? 'bg-slate-900 text-white ml-6' : 'bg-white text-amber-500'}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {resolvedTheme === 'dark' ? (
              <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Moon className="h-3.5 w-3.5" />
              </motion.div>
            ) : (
              <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Sun className="h-3.5 w-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === 'dark' ? (
          <motion.div key="moon" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }}>
            <Moon className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div key="sun" initial={{ rotate: 90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }}>
            <Sun className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}

export function ThemeTogglePremium() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm hover:shadow-md transition-all dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm group-hover:scale-110 transition-transform dark:from-slate-700 dark:to-slate-600">
        <AnimatePresence mode="wait" initial={false}>
          {resolvedTheme === 'dark' ? <Moon key="moon" className="h-3.5 w-3.5" /> : <Sun key="sun" className="h-3.5 w-3.5" />}
        </AnimatePresence>
      </div>
      <div className="text-left hidden sm:block">
        <p className="text-xs font-semibold leading-tight text-slate-800 dark:text-white">{resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
        <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-400">Click to switch</p>
      </div>
      <div className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 group-hover:bg-mayzax-blue-50 dark:group-hover:bg-mayzax-blue-900/20 transition-colors">
        <Sparkles className="h-3 w-3 text-slate-400 group-hover:text-mayzax-blue-600 dark:text-slate-400" />
      </div>
    </button>
  );
}
