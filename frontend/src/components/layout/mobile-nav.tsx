import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, FileText, BarChart3, X, UserCircle, Activity, Bell, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { motion, AnimatePresence } from 'framer-motion';

const adminNav = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard, desc: 'Real-time overview' },
  { to: '/analytics', label: 'Analytics Hub', icon: BarChart3, desc: 'Trends & insights' },
  { to: '/recruiters', label: 'Management', icon: Users, desc: 'Team & users' },
  { to: '/profiles', label: 'Client Vault', icon: UserSquare2, desc: 'Candidates' },
  { to: '/applications', label: 'Applications', icon: FileText, desc: 'Submissions' },
  { to: '/activity', label: 'Live Monitoring', icon: Activity, desc: 'Shift tracking' },
  { to: '/updates', label: 'Updates', icon: Bell, desc: 'Release notes' },
  { to: '/profile', label: 'Profile', icon: UserCircle, desc: 'Account' },
];
const recruiterNav = [
  { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Your stats' },
  { to: '/profiles', label: 'My Clients', icon: UserSquare2, desc: 'Assigned' },
  { to: '/applications', label: 'Applications', icon: FileText, desc: 'Submissions' },
  { to: '/activity', label: 'Shift Tracking', icon: Activity, desc: 'Time tracking' },
  { to: '/updates', label: 'Updates', icon: Bell, desc: 'Announcements' },
  { to: '/profile', label: 'Profile', icon: UserCircle, desc: 'Account' },
];

const companionNav = [
  { to: '/companion-dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Your status & timeline' },
  { to: '/updates', label: 'Updates', icon: Bell, desc: 'Announcements' },
  { to: '/profile', label: 'Profile', icon: UserCircle, desc: 'Account' },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  let rawNav = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' ? [...adminNav] : [...recruiterNav];
  if (user?.role === 'RESUME_ASSIST' || user?.role === 'SALES_EXEC') {
    rawNav = [
      { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Your stats' },
      { to: '/updates', label: 'Updates', icon: Bell, desc: 'Announcements' },
      { to: '/profile', label: 'Profile', icon: UserCircle, desc: 'Account' },
    ];
  }
// Admin Page: Onboarding Tab Uncommented.
  if (user?.role === 'ADMIN') {
    rawNav.splice(3, 0, {
      to: '/admin/onboarding',
      label: 'Onboarding',
      icon: ShieldCheck,
      desc: 'Verify registrations'
    });
  }

  const nav = rawNav.map((item) => {
    if (user?.role === 'TEAM_LEADER') {
      if (item.to === '/dashboard') return { ...item, label: 'Team Command' };
      if (item.to === '/recruiters') return { ...item, label: 'My Team' };
      if (item.to === '/activity') return { ...item, label: 'Team Pulse' };
    }
    if (user?.role === 'ADMIN') {
      if (item.to === '/recruiters') return { ...item, label: 'User Management' };
      if (item.to === '/activity') return { ...item, label: 'Live Monitoring' };
    }
    return item;
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute left-0 top-0 h-full w-[300px] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="relative h-[72px] flex items-center justify-between border-b border-slate-200/60 px-5 bg-gradient-to-r from-white to-slate-50/80">
              <div className="flex items-center gap-3">
                <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-xl bg-white p-1 shadow-md ring-1 ring-slate-200" />
                <div>
                  <p className="text-sm font-bold tracking-tight">
                    <span className="text-mayzax-blue-500">MAY</span>
                    <span className="text-mayzax-green-500">ZAX</span>
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    ATS/CRM
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 py-2 text-[11px] font-bold tracking-widest uppercase text-slate-400">Navigation</p>
              {nav.map((item, idx) => (
                <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white')}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-tight">{item.label}</p>
                          <p className={cn('text-[11px] leading-tight', isActive ? 'text-white/60' : 'text-slate-400')}>{item.desc}</p>
                        </div>
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </div>

            <div className="border-t border-slate-200/60 p-4 bg-gradient-to-b from-white to-slate-50/50">
              <div className="rounded-xl bg-slate-900 text-white p-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-300" />
                <div>
                  <p className="text-xs font-semibold">ATS/CRM</p>
                  <p className="text-[11px] text-white/60">Active</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
