import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, FileText, BarChart3, UserCircle, Activity, Bell, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { useUpdates } from '@/hooks/use-updates';
import { cn } from '@/lib/utils';
import mayzaxLogo from '@/assets/mayzax-logo.png';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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
  { to: '/activity', label: 'Shift Tracking', icon: Activity, gradient: 'from-mayzax-green-600 to-emerald-700', desc: 'Time tracking' },
  { to: '/profile', label: 'Profile', icon: UserCircle, gradient: 'from-slate-600 to-slate-800', desc: 'Settings' },
];

export function Sidebar() {
  const { user } = useAuth();
  const { isAdmin, isTeamLeader } = usePermissions();
  const { data: summary } = useGlobalSummary();
  const { data: updatesData } = useUpdates();
  const unreadCount = updatesData?.unreadCount ?? 0;

  const rawNav = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' ? adminNav : recruiterNav;

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
    <aside className="hidden w-[280px] shrink-0 flex-col lg:flex relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-white border-r border-slate-200/60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(42,93,168,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(42,93,168,0.02)_1px,transparent_1px)] bg-[size:22px_22px]" />

      <div className="relative flex h-full flex-col">
        <div className="flex h-[72px] items-center gap-3 border-b border-slate-200/60 px-6 bg-gradient-to-r from-white to-mayzax-blue-50/30">
          <div className="relative">
            <div className="absolute inset-0 bg-mayzax-gradient rounded-xl blur-[4px] opacity-20" />
            <img src={mayzaxLogo} alt="Mayzax" className="relative h-10 w-10 rounded-xl bg-white p-1.5 shadow-md ring-1 ring-slate-200" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-mayzax-green-500 border-2 border-white animate-pulse" />
          </div>
          <div className="leading-tight flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold tracking-tight text-slate-900">MAYZAX</p>
              <Badge className="bg-mayzax-gradient text-white text-[9px] px-1.5 py-0 h-4 border-0 shadow-sm">PREMIUM</Badge>
            </div>
            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              Recruitment OS
              <span className="h-1 w-1 rounded-full bg-mayzax-green-500" />
              Live • #2A5DA8
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mayzax-blue-50 text-mayzax-blue-600 border border-mayzax-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto scrollbar-thin">
          <div className="mb-3 px-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Navigation</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
          </div>
          {nav.map((item, idx) => (
            <motion.div key={item.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden border',
                    isActive ? 'bg-mayzax-blue-50 text-mayzax-blue-700 border-mayzax-blue-200 shadow-sm shadow-mayzax-blue-100/50' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:border-slate-200 border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-mayzax-gradient" />}
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 shadow-sm', isActive ? `bg-gradient-to-br ${item.gradient} text-white` : 'bg-slate-100 text-slate-500 group-hover:bg-mayzax-blue-600 group-hover:text-white')}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-[13px] leading-tight">{item.label}</p>
                      <p className={cn('truncate text-[11px] leading-tight', isActive ? 'text-mayzax-blue-700/70' : 'text-slate-400')}>{item.desc}</p>
                    </div>
                    {isActive && <div className="h-2 w-2 rounded-full bg-mayzax-gradient animate-pulse" />}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}

          <div className="mt-6 px-3">
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mb-2">System</p>
            <NavLink
              to="/updates"
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all border',
                  isActive ? 'bg-mayzax-gradient text-white border-mayzax-blue-600 shadow-md shadow-mayzax-blue-200/50' : 'bg-white border-slate-200 text-slate-700 hover:border-mayzax-blue-200 hover:bg-mayzax-blue-50/50'
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-mayzax-blue to-mayzax-green text-white shadow-sm">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-tight">Updates</p>
                  <p className="text-[11px] opacity-80 leading-tight">Release notes</p>
                </div>
              </div>
              {unreadCount > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white text-mayzax-blue px-1.5 text-[11px] font-bold shadow-sm animate-pulse">{unreadCount}</span>}
            </NavLink>
          </div>
        </nav>

        <div className="border-t border-slate-200/60 p-4 space-y-3 bg-gradient-to-b from-white to-mayzax-blue-50/20">
          <div className="relative overflow-hidden rounded-xl bg-mayzax-gradient p-3 text-white shadow-lg shadow-mayzax-blue-200/30">
            <div className="absolute -top-10 -right-10 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="h-3.5 w-3.5 text-white/80" />
                <p className="text-xs font-bold tracking-wide uppercase">Business Shift</p>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </div>
              <p className="text-sm font-semibold">{summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'}</p>
              <p className="text-[11px] text-white/70 mt-1">BD: {summary?.currentBusinessDate || '—'} • IST • Original palette</p>
              <div className="mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-[68%] rounded-full bg-white" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500" />
              System operational
            </span>
            <span className="font-medium text-mayzax-blue-600">v2.1 • #2A5DA8</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
