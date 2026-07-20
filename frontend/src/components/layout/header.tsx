import { LogOut, User as UserIcon, Menu, Bell, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserStatusSelector } from '@/components/activity/user-status-selector';
import { useUpdates, useMarkUpdateAsRead } from '@/hooks/use-updates';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: updatesData } = useUpdates();
  const markAsReadMutation = useMarkUpdateAsRead();

  const unreadCount = updatesData?.unreadCount ?? 0;
  const updates = updatesData?.updates ?? [];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <p className="text-sm font-bold text-slate-900">Mayzax ATS</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UserStatusSelector />
        {user?.role === 'ADMIN' && <Badge variant="default">Admin</Badge>}
        {user?.role === 'TEAM_LEADER' && <Badge variant="default" className="bg-mayzax-blue text-white hover:bg-mayzax-blue/90">Team Leader</Badge>}
        {user?.role === 'RECRUITER' && <Badge variant="secondary">Recruiter</Badge>}

        {/* Notifications Bell Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition outline-none"
              title="System Updates & Announcements"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="font-semibold text-sm">System Updates</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-rose-200">
                  {unreadCount} new
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto space-y-1 p-1">
              {updates.length === 0 ? (
                <p className="p-3 text-center text-xs text-slate-400">No updates posted yet.</p>
              ) : (
                updates.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.isRead) markAsReadMutation.mutate(item.id);
                      navigate('/updates');
                    }}
                    className={`flex items-start gap-2.5 rounded-lg p-2 text-xs transition cursor-pointer ${
                      item.isRead ? 'hover:bg-slate-50 opacity-75' : 'bg-mayzax-blue/5 hover:bg-mayzax-blue/10'
                    }`}
                  >
                    <FileText className={`h-4 w-4 shrink-0 mt-0.5 ${item.isRead ? 'text-slate-400' : 'text-mayzax-blue'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${item.isRead ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                          {item.title}
                        </p>
                        {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-mayzax-blue shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/updates')} className="justify-center text-xs font-semibold text-mayzax-blue cursor-pointer">
              View All Updates & Release Notes →
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{user ? initials(user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-slate-500">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
