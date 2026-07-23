import { useState } from 'react';
import { Users, UserCheck, UserSquare2, Briefcase, Clock, ChevronDown, ChevronUp, Zap, Coffee, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatCard } from '@/components/motion/stat-card';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { useAuth } from '@/context/auth-context';

const adminCardConfig = [
  { key: 'totalRecruiters', label: 'Total Recruiters', icon: Users, color: 'text-mayzax-blue bg-mayzax-blue-50' },
  { key: 'activeRecruiters', label: 'Active Recruiters', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'totalProfiles', label: 'Total Client Profiles', icon: UserSquare2, color: 'text-mayzax-green bg-mayzax-green-50' },
  { key: 'totalApplications', label: 'Total Applications', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { key: 'currentShiftApplications', label: "Today's Applications", icon: Clock, color: 'text-purple-600 bg-purple-50' },
] as const;

const tlCardConfig = [
  { key: 'totalRecruiters', label: 'Team Recruiters', icon: Users, color: 'text-mayzax-blue bg-mayzax-blue-50' },
  { key: 'activeRecruiters', label: 'Active Recruiters', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'totalProfiles', label: 'Team Clients Profiles', icon: UserSquare2, color: 'text-mayzax-green bg-mayzax-green-50' },
  { key: 'totalApplications', label: 'Total Team Applications', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { key: 'currentShiftApplications', label: "Today's Team Applications", icon: Clock, color: 'text-purple-600 bg-purple-50' },
  { key: 'myTotalApplications', label: 'My Total Applications', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { key: 'myCurrentShiftApplications', label: "My Current Applications", icon: Clock, color: 'text-purple-600 bg-purple-50' },
  { key: 'activeMemberCount', label: 'Active Team Members', icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'onBreakMemberCount', label: 'Members on Break', icon: Coffee, color: 'text-blue-600 bg-blue-50' },
  { key: 'topPerformer', label: 'Top Performer Today', icon: Trophy, color: 'text-indigo-600 bg-indigo-50' },
] as const;

export function SummaryCards() {
  const { user } = useAuth();
  const { data, isLoading } = useGlobalSummary();
  const isAdmin = user?.role === 'ADMIN';
  const isTeamLeader = user?.role === 'TEAM_LEADER';
  const [teamsExpanded, setTeamsExpanded] = useState(false);

  const visibleCards = isTeamLeader ? tlCardConfig : adminCardConfig;

  /** Formats "Sneha Reddy" → "Sneha R." (ignores non-letter tokens like parentheses) */
  const abbreviateName = (fullName: unknown): string => {
    if (typeof fullName !== 'string' || !fullName.trim()) return '—';
    const parts = fullName.trim().split(/\s+/).filter(p => /^[A-Za-z]/.test(p));
    if (parts.length === 0) return '—';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleCards.map((card, i) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={
              card.key === 'topPerformer'
                ? abbreviateName(data?.[card.key])
                : data
                  ? (data[card.key] ?? 0)
                  : 0
            }
            isLoading={isLoading}
            colorClass={card.color}
            index={i}
          />
        ))}
      </div>

      {/* Team Count Card — Admin only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setTeamsExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Teams</p>
                <p className="text-xl font-bold text-slate-900">
                  {isLoading ? '...' : (data?.totalTeams ?? 0)}
                  <span className="ml-1.5 text-xs font-normal text-slate-400">active teams</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-xs">{teamsExpanded ? 'Collapse' : 'View Teams'}</span>
              {teamsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          <AnimatePresence>
            {teamsExpanded && (
              <motion.div
                key="team-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100 px-4 pb-3 pt-2">
                  {isLoading && (
                    <p className="py-4 text-center text-xs text-slate-400">Loading teams...</p>
                  )}
                  {!isLoading && (!data?.teams || data.teams.length === 0) && (
                    <p className="py-4 text-center text-xs text-slate-400">No teams found. Assign Team Leaders to create teams.</p>
                  )}
                  {!isLoading && data?.teams && data.teams.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                      {data.teams.map((team) => (
                        <div key={team.tlId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {team.teamName || <span className="italic text-slate-400">No team name</span>}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              TL: <span className="font-medium text-slate-700">{team.tlName}</span>
                            </p>
                          </div>
                          <span className="ml-2 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {data && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-xs text-slate-400"
        >
          Business date: <span className="font-medium text-slate-600">{data.currentBusinessDate}</span> · Shift window{' '}
          {data.shiftWindowText || '6:00 PM – 9:00 AM IST'}
        </motion.p>
      )}
    </div>
  );
}
