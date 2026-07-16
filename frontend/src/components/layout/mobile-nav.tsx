import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, FileText, BarChart3, X, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import mayzaxLogo from '@/assets/mayzax-logo.png';

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/recruiters', label: 'Recruiters', icon: Users },
  { to: '/profiles', label: 'Client Profiles', icon: UserSquare2 },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];
const recruiterNav = [
  { to: '/recruiter-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/profiles', label: 'My Profiles', icon: UserSquare2 },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const rawNav = user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' ? adminNav : recruiterNav;

  const nav = rawNav.map((item) => {
    if (user?.role === 'TEAM_LEADER') {
      if (item.to === '/dashboard') return { ...item, label: 'TL Dashboard' };
      if (item.to === '/recruiters') return { ...item, label: 'My Team' };
    }
    if (user?.role === 'ADMIN') {
      if (item.to === '/recruiters') return { ...item, label: 'User Management' };
    }
    return item;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <img src={mayzaxLogo} alt="Mayzax" className="h-8 w-8 rounded-lg" />
            <p className="text-sm font-bold">Mayzax ATS</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-mayzax-blue-50 text-mayzax-blue-700' : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
