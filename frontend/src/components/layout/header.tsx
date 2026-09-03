import { LogOut, User as UserIcon, Menu, Bell, FileText, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserStatusSelector } from '@/components/activity/user-status-selector';
import { useUpdates, useMarkUpdateAsRead } from '@/hooks/use-updates';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const { isAdmin, isTeamLeader } = usePermissions();
  const navigate = useNavigate();
  const { data: updatesData } = useUpdates();
  const markAsReadMutation = useMarkUpdateAsRead();

  const unreadCount = updatesData?.unreadCount ?? 0;
  const updates = updatesData?.updates ?? [];

  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 sm:px-6 sticky top-0 z-20 shadow-sm shadow-slate-200/20 dark:shadow-none">
      
      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-mayzax-gradient text-white shadow-md lg:hidden hover:opacity-90 transition-opacity" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        {/* <div className="hidden lg:flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mayzax-blue-50 border border-mayzax-blue-100 text-mayzax-blue-600">
            <Zap className="h-4 w-4" />
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mayzax-blue-50 border border-mayzax-blue-200 text-mayzax-blue-700 px-2.5 py-1 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-mayzax-green-500 animate-pulse" />
              Live
            </span>
          </div>
        </div> */}

        <div className="lg:hidden">
          <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            MAYZAX
            <Badge className="bg-mayzax-gradient text-white text-[9px] h-4 px-1.5 border-0">CRM</Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <UserStatusSelector />

        <ThemeToggle />

        <div className="hidden sm:flex items-center gap-1.5">
          {isAdmin && <Badge className="bg-mayzax-gradient text-white border-0 shadow-sm rounded-full px-3 py-1 text-xs font-semibold">Admin</Badge>}
          {isTeamLeader && <Badge className="bg-gradient-to-r from-mayzax-blue to-mayzax-green text-white border-0 shadow-sm rounded-full px-3 py-1">Team Leader</Badge>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-mayzax-blue-50 dark:hover:bg-slate-700 hover:text-mayzax-blue-700 dark:hover:text-white hover:border-mayzax-blue-200 dark:hover:border-slate-600 transition-all hover:shadow-md">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse border-2 border-white dark:border-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0 overflow-hidden">
            <div className="bg-mayzax-gradient text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">System Updates</p>
                    <p className="text-xs text-white/70">{unreadCount}</p>
                  </div>
                </div>
                {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/40">
              {updates.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">No updates yet</p>
                </div>
              ) : (
                updates.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.isRead) markAsReadMutation.mutate(item.id);
                      navigate('/updates');
                    }}
                    className={`group flex items-start gap-3 rounded-xl p-3 text-xs transition-all cursor-pointer border ${item.isRead ? 'bg-white dark:bg-slate-850 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm opacity-80' : 'bg-white dark:bg-slate-800 border-mayzax-blue-200 dark:border-mayzax-blue-800 shadow-sm hover:shadow-md'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.isRead ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-mayzax-gradient text-white shadow-sm'}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold truncate ${item.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{item.title}</p>
                        {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-mayzax-blue-600 animate-pulse shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
              <button onClick={() => navigate('/updates')} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-mayzax-gradient hover:opacity-90 text-white py-2.5 text-xs font-semibold transition-opacity">
                View All Updates
                <Sparkles className="h-3 w-3" />
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center gap-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-1 pr-2 sm:pr-3 py-1 shadow-sm hover:shadow-md hover:border-mayzax-blue-200 dark:hover:border-slate-600 transition-all">
              <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-700 shadow-sm group-hover:ring-mayzax-blue-100 dark:group-hover:ring-slate-600">
                <AvatarFallback className="bg-mayzax-gradient text-white font-bold text-xs">{user ? initials(user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[100px]">{user?.name?.split(' ')[0]}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{user?.role === 'TEAM_LEADER' ? 'Team Leader' : user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
            <div className="rounded-xl bg-mayzax-gradient text-white p-3 mb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white/20">
                  <AvatarFallback className="bg-white text-mayzax-blue-700 font-bold">{user ? initials(user.name) : '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-white/70 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl gap-2 py-2.5 focus:bg-slate-100 dark:focus:bg-slate-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mayzax-blue-50 dark:bg-slate-800 text-mayzax-blue-600 dark:text-mayzax-blue-400">
                <UserIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Profile Settings</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage Profile</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem onClick={() => logout()} className="rounded-xl gap-2 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Sign out</p>
                <p className="text-[11px] text-red-400 dark:text-red-500">End session securely</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

