import { LogOut, User as UserIcon, Menu, Bell, FileText, Sparkles, Zap, Search, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { initials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserStatusSelector } from '@/components/activity/user-status-selector';
import { useUpdates, useMarkUpdateAsRead } from '@/hooks/use-updates';
import { motion } from 'framer-motion';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const { isAdmin, isTeamLeader, isManager } = usePermissions();
  const navigate = useNavigate();
  const { data: updatesData } = useUpdates();
  const markAsReadMutation = useMarkUpdateAsRead();

  const unreadCount = updatesData?.unreadCount ?? 0;
  const updates = updatesData?.updates ?? [];

  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md lg:hidden hover:bg-black transition-colors" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-500">
            <Command className="h-4 w-4" />
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-2.5 py-1 font-semibold shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-slate-400 hidden sm:inline">Press</span>
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-slate-200 bg-white px-1.5 text-[11px] font-mono shadow-sm">⌘K</kbd>
            <span className="text-slate-400 hidden sm:inline">for search</span>
          </div>
        </div>

        <div className="lg:hidden">
          <p className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
            MAYZAX
            <Badge className="bg-slate-900 text-white text-[9px] h-4 px-1">PREMIUM</Badge>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <UserStatusSelector />

        <div className="hidden sm:flex items-center gap-1.5">
          {isAdmin && (
            <Badge className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-sm rounded-full px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
          {isTeamLeader && <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 shadow-sm rounded-full px-3 py-1">Team Leader</Badge>}
          {!isManager && (
            <Badge variant="outline" className="bg-white border-slate-200 shadow-sm rounded-full">
              Recruiter
            </Badge>
          )}
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all hover:shadow-md">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 rounded-2xl shadow-2xl border-slate-200 p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">System Updates</p>
                    <p className="text-xs text-white/60">{unreadCount} unread • Premium feed</p>
                  </div>
                </div>
                {unreadCount > 0 && <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
              {updates.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-slate-500">No updates yet</p>
                </div>
              ) : (
                updates.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.isRead) markAsReadMutation.mutate(item.id);
                      navigate('/updates');
                    }}
                    className={`group flex items-start gap-3 rounded-xl p-3 text-xs transition-all cursor-pointer border ${item.isRead ? 'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-sm opacity-75' : 'bg-white border-violet-200 shadow-sm hover:shadow-md'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.isRead ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm'}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold truncate ${item.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{item.title}</p>
                        {!item.isRead && <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-200 p-2 bg-white">
              <button onClick={() => navigate('/updates')} className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-black text-white py-2.5 text-xs font-semibold transition-colors">
                View All Updates
                <Sparkles className="h-3 w-3" />
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center gap-2.5 rounded-full bg-white border border-slate-200 pl-1 pr-2 sm:pr-3 py-1 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm group-hover:ring-violet-100 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-xs">{user ? initials(user.name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-semibold text-slate-900 truncate max-w-[100px]">{user?.name?.split(' ')[0]}</p>
                <p className="text-[11px] text-slate-500 truncate max-w-[100px]">{user?.role === 'TEAM_LEADER' ? 'Team Leader' : user?.role}</p>
              </div>
              <div className="hidden sm:flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-2xl border-slate-200 p-2">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3 mb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white/20">
                  <AvatarFallback className="bg-white text-slate-900 font-bold">{user ? initials(user.name) : '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-white/60 truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl gap-2 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                <UserIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Profile Settings</p>
                <p className="text-[11px] text-slate-500">Manage premium profile</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="rounded-xl gap-2 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Sign out</p>
                <p className="text-[11px] text-red-400">End session securely</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
