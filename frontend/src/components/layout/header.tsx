import { LogOut, User as UserIcon, Menu } from 'lucide-react';
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

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();

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
        {user?.role === 'ADMIN' && <Badge variant="default">Admin</Badge>}
        {user?.role === 'RECRUITER' && <Badge variant="secondary">Recruiter</Badge>}
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
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
