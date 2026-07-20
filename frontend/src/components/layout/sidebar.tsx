import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  FileText,
  BarChart3,
  UserCircle,
  Activity,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { useUpdates } from '@/hooks/use-updates';
import { cn } from '@/lib/utils';
import mayzaxLogo from '@/assets/mayzax-logo.png';

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/recruiters', label: 'Management', icon: Users },
  { to: '/profiles', label: 'Clients', icon: UserSquare2 },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/activity', label: 'Monitoring', icon: Activity },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

const recruiterNav = [
  { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'My Clients', icon: UserSquare2 },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/activity', label: 'Shift Tracking', icon: Activity },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export function Sidebar() {
  const { user } = useAuth();
  const { data: summary } = useGlobalSummary();
  const { data: updatesData } = useUpdates();
  const unreadCount = updatesData?.unreadCount ?? 0;

  const rawNav = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' ? adminNav : recruiterNav;

  const nav = rawNav.map((item) => {
    if (user?.role === 'TEAM_LEADER') {
      if (item.to === '/dashboard') return { ...item, label: 'TL Dashboard' };
      if (item.to === '/recruiters') return { ...item, label: 'My Team' };
      if (item.to === '/activity') return { ...item, label: 'Team Tracking' };
    }
    if (user?.role === 'ADMIN') {
      if (item.to === '/recruiters') return { ...item, label: 'Management' };
      if (item.to === '/profiles') return { ...item, label: 'Clients' };
      if (item.to === '/activity') return { ...item, label: 'Monitoring' };
    }
    return item;
  });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <img src={mayzaxLogo} alt="Mayzax" className="h-9 w-9 rounded-lg" />
        <div className="leading-tight">
          <p className="text-base font-bold text-slate-900">MAYZAX</p>
          <p className="text-[11px] text-slate-400">Recruitment ATS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-mayzax-blue-50 text-mayzax-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4 space-y-3">
        <NavLink
          to="/updates"
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors border border-slate-200 bg-slate-50/70 hover:bg-slate-100',
              isActive ? 'border-mayzax-blue/40 bg-mayzax-blue/5 text-mayzax-blue font-semibold' : 'text-slate-700'
            )
          }
        >
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-mayzax-blue shrink-0" />
            <span>Updates & Announcements</span>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </NavLink>

        <div className="rounded-lg bg-mayzax-gradient p-3 text-white">
          <p className="text-xs font-semibold">Business Shift</p>
          <p className="text-[11px] opacity-90">{summary?.shiftWindowText || '6:00 PM – 9:00 AM IST'}</p>
        </div>
      </div>
    </aside>
  );
}
