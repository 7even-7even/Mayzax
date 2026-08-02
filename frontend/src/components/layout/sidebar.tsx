import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, FileText, BarChart3, UserCircle, Activity, Bell, Sparkles, Zap, ChevronLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { useUpdates } from '@/hooks/use-updates';
import { cn } from '@/lib/utils';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const adminNav = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard, gradient: 'from-mayzax-blue to-mayzax-blue-700', desc: 'Real-time overview' },
  { to: '/analytics', label: 'Analytics Hub', icon: BarChart3, gradient: 'from-mayzax-blue-500 to-mayzax-green-500', desc: 'Trends & heatmaps' },
  { to: '/recruiters', label: 'Team Management', icon: Users, gradient: 'from-mayzax-blue-600 to-mayzax-blue-800', desc: 'Users & roles' },
  { to: '/profiles', label: 'Client Vault', icon: UserSquare2, gradient: 'from-amber-500 to-orange-600', desc: 'Candidate profiles' },
  { to: '/applications', label: 'Applications', icon: FileText, gradient: 'from-mayzax-green-500 to-mayzax-green-700', desc: 'Job submissions' },
  { to: '/activity', label: 'Live Monitoring', icon: Activity, gradient: 'from-mayzax-green-600 to-emerald-700', desc: 'Shift tracking' },
  { to: '/profile', label: 'Profile', icon: UserCircle, gradient: 'from-slate-600 to-slate-800', desc: 'Account settings' },
];

const recruiterNav = [
  { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-mayzax-blue to-mayzax-blue-700', desc: 'Your stats' },
  { to: '/profiles', label: 'My Clients', icon: UserSquare2, gradient: 'from-amber-500 to-orange-600', desc: 'Assigned profiles' },
  { to: '/applications', label: 'Applications', icon: FileText, gradient: 'from-mayzax-green-500 to-mayzax-green-700', desc: 'Submissions' },
  { to: '/activity', label: 'Shift Tracking', icon: Activity, gradient: 'from-mayzax-green-600 to-emerald-750', desc: 'Time tracking' },
  { to: '/profile', label: 'Profile', icon: UserCircle, gradient: 'from-slate-600 to-slate-800', desc: 'Settings' },
];

const companionNav = [
  { to: '/companion-dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-mayzax-blue to-mayzax-blue-700', desc: 'Your status & timeline' },
  { to: '/profile', label: 'Profile', icon: UserCircle, gradient: 'from-slate-600 to-slate-800', desc: 'Settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const { isAdmin, isTeamLeader } = usePermissions();
  const { data: summary } = useGlobalSummary();
  const { data: updatesData } = useUpdates();
  const unreadCount = updatesData?.unreadCount ?? 0;

  let rawNav = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' ? [...adminNav] : [...recruiterNav];
  if (user?.role === 'RESUME_ASSIST' || user?.role === 'SALES_EXEC') {
    rawNav = [
      { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-mayzax-blue to-mayzax-blue-700', desc: 'Your stats' },
      { to: '/profile', label: 'Profile', icon: UserCircle, gradient: 'from-slate-600 to-slate-800', desc: 'Settings' },
    ];
  }
//Onboarding Page Tab: Uncomment when needed
  if (user?.role === 'ADMIN') {
    // Insert Onboarding Requests right after Team Management (index 3)
    rawNav.splice(3, 0, {
      to: '/admin/onboarding',
      label: 'Onboarding',
      icon: ShieldCheck,
      gradient: 'from-indigo-500 to-indigo-700',
      desc: 'Verify registrations',
    });
  }

  const nav = rawNav.map((item) => {
    if (isTeamLeader) {
      if (item.to === '/dashboard') return { ...item, label: 'Team Command' };
      if (item.to === '/recruiters') return { ...item, label: 'My Team' };
      if (item.to === '/activity') return { ...item, label: 'Team Pulse' };
    }
    if (isAdmin) {
      if (item.to === '/recruiters') return { ...item, label: 'User Management' };
      if (item.to === '/profiles') return { ...item, label: 'Client Vault' };
      if (item.to === '/activity') return { ...item, label: 'Live Monitoring' };
    }
    return item;
  });

  return (
    <aside className={cn("hidden shrink-0 flex-col lg:flex relative transition-all duration-300 ease-in-out border-r border-slate-200/60 dark:border-slate-850 bg-white dark:bg-slate-900", isCollapsed ? "w-[76px]" : "w-[280px]")}>
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-white dark:from-slate-900 dark:via-slate-850/50 dark:to-slate-900" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(42,93,168,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(42,93,168,0.02)_1px,transparent_1px)] bg-[size:22px_22px]" />

      {/* Floating Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute right-[-12px] top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-750 transition-all hover:text-mayzax-blue hover:scale-105"
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
      </button>

      <div className="relative flex h-full flex-col">
        {/* Header/Branding */}
        <div className={cn("flex h-14 items-center border-b border-slate-200/60 dark:border-slate-850 bg-gradient-to-r from-white dark:from-slate-900 to-mayzax-blue-50/30 dark:to-mayzax-blue-950/20 transition-all", isCollapsed ? "px-4.5 justify-center" : "px-6 gap-3")}>
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-mayzax-gradient rounded-xl blur-[4px] opacity-20" />
            <img src={mayzaxLogo} alt="Mayzax" className="relative h-8 w-8 rounded-lg bg-white p-1 shadow-md ring-1 ring-slate-200 dark:ring-slate-800" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-mayzax-green-500 border border-white dark:border-slate-900 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold tracking-tight">
                  <span className="text-black dark:text-white">MAYZAX</span>
                </p>
                <Badge className="bg-mayzax-gradient text-white text-[8px] px-1 py-0 h-3.5 border-0 shadow-sm">CRM</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 px-3 py-2 overflow-y-auto scrollbar-thin transition-all", isCollapsed ? "space-y-2.5" : "space-y-0.5")}>
          {nav.map((item, idx) => (
            <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
              <NavLink
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-xl transition-all duration-300 overflow-hidden border',
                    isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-1.5 text-sm font-medium',
                    isActive ? 'bg-mayzax-blue-50 dark:bg-mayzax-blue-900/30 text-mayzax-blue-700 dark:text-mayzax-blue-300 border-mayzax-blue-200 dark:border-mayzax-blue-800 shadow-sm shadow-mayzax-blue-100/50 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:shadow-sm hover:border-slate-200 dark:hover:border-slate-700 border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-mayzax-gradient" />}
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300 shadow-sm', isActive ? `bg-gradient-to-br ${item.gradient} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-mayzax-blue-600 group-hover:text-white')}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className={cn('truncate font-bold text-xs leading-none transition-colors duration-200', isActive ? 'text-mayzax-blue-700 dark:text-mayzax-blue-300' : 'text-slate-850 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white')}>{item.label}</p>
                        </div>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-mayzax-gradient animate-pulse" />}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}

          {/* System section */}
          <div className={cn("mt-4", !isCollapsed && "px-3")}>
            {!isCollapsed && <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1.5">System</p>}
            <NavLink
              to="/updates"
              title={isCollapsed ? "Updates & Releases" : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center justify-between rounded-xl transition-all border',
                  isCollapsed ? 'justify-center p-2' : 'px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-mayzax-gradient text-white border-mayzax-blue-600 shadow-md shadow-mayzax-blue-200/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-mayzax-blue-200 dark:hover:border-mayzax-blue-800 hover:bg-mayzax-blue-50/50 dark:hover:bg-mayzax-blue-950/20'
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-mayzax-blue to-mayzax-green text-white shadow-sm shrink-0">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                {!isCollapsed && (
                  <div>
                    <p className="text-xs font-bold leading-none">Updates</p>
                  </div>
                )}
              </div>
              {!isCollapsed && unreadCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white text-mayzax-blue px-1 text-[10px] font-bold shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
              {isCollapsed && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </NavLink>
          </div>
        </nav>

        {/* Footer/Business Date */}
        <div className={cn("border-t border-slate-200/60 dark:border-slate-800 bg-gradient-to-b from-white dark:from-slate-900 to-mayzax-blue-50/20 dark:to-mayzax-blue-950/10 transition-all", isCollapsed ? "p-3 space-y-2.5 text-center" : "p-4 space-y-3")}>
          {isCollapsed ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md mx-auto cursor-help hover:scale-105 transition-transform"
              title={`Business Shift: ${summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'}\nBD: ${summary?.currentBusinessDate || '—'}`}
            >
              <Zap className="h-5 w-5" />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-mayzax-gradient p-3 text-white shadow-lg shadow-mayzax-blue-200/30">
              <div className="absolute -top-10 -right-10 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-white/80" />
                  <p className="text-xs font-bold tracking-wide uppercase">Business Shift</p>
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </div>
                <p className="text-sm font-semibold">{summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'}</p>
                <p className="text-[11px] text-white/70 mt-1">BD: {summary?.currentBusinessDate || '—'}</p>
                <div className="mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full w-[68%] rounded-full bg-white" />
                </div>
              </div>
            </div>
          )}

          <div className={cn("flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1", isCollapsed && "justify-center")}>
            {!isCollapsed ? (
              <>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500" />
                  System operational
                </span>
                <span className="font-medium text-mayzax-blue-600">v1.1</span>
              </>
            ) : (
              <span className="font-bold text-mayzax-blue-600">v1.1</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
