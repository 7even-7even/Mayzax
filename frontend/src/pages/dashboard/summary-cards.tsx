import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserSquare2, Briefcase, Clock, ChevronDown, ChevronUp, Zap, Coffee, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalSummary } from '@/hooks/use-analytics';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/context/auth-context';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';
import { Badge } from '@/components/ui/badge';

const adminCardConfig = [
  { key: 'totalRecruiters', label: 'Total Users', icon: Users, gradient: 'from-mayzax-blue-500 to-mayzax-green-500', accent: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'activeRecruiters', label: 'Total Recruiters', icon: UserCheck, gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'totalProfiles', label: 'Total Clients', icon: UserSquare2, gradient: 'from-amber-500 to-orange-600', accent: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'totalApplications', label: 'Total Applications', icon: Briefcase, gradient: 'from-blue-500 to-cyan-600', accent: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'currentShiftApplications', label: "Today's Apps", icon: Clock, gradient: 'from-mayzax-blue-500 to-mayzax-green-600', accent: 'text-violet-600', bg: 'bg-violet-50' },
] as const;

const tlCardConfig = [
  { key: 'totalRecruiters', label: 'Team Recruiters', icon: Users, gradient: 'from-mayzax-blue-500 to-mayzax-green-500', accent: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'activeRecruiters', label: 'Active Recruiters', icon: UserCheck, gradient: 'from-emerald-500 to-teal-600', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'totalProfiles', label: 'Team Clients', icon: UserSquare2, gradient: 'from-amber-500 to-orange-600', accent: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'totalApplications', label: 'Team Apps', icon: Briefcase, gradient: 'from-blue-500 to-cyan-600', accent: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'currentShiftApplications', label: "Today's Team", icon: Clock, gradient: 'from-mayzax-blue-500 to-mayzax-green-600', accent: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'myTotalApplications', label: 'My Total Apps', icon: Briefcase, gradient: 'from-slate-700 to-slate-900', accent: 'text-slate-700', bg: 'bg-slate-100' },
  { key: 'myCurrentShiftApplications', label: 'My Current Apps', icon: Clock, gradient: 'from-pink-500 to-rose-600', accent: 'text-pink-600', bg: 'bg-pink-50' },
  { key: 'activeMemberCount', label: 'Active', icon: Zap, gradient: 'from-emerald-500 to-green-600', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'onBreakMemberCount', label: 'On Break', icon: Coffee, gradient: 'from-amber-500 to-yellow-600', accent: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'topPerformer', label: 'Top Performer', icon: Trophy, gradient: 'from-yellow-500 to-amber-600', accent: 'text-amber-600', bg: 'bg-yellow-50' },
] as const;

function PremiumStatCard({ icon: Icon, label, value, gradient, bg, accent, isLoading, index, featured, roleBreakdown, onDoubleClick }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onDoubleClick={onDoubleClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-[1px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer select-none ${featured ? 'ring-1 ring-violet-100' : ''}`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} blur-[0.5px]`} />
      <div className="relative rounded-[15px] bg-white dark:bg-slate-900 p-4 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full ${bg} ${accent}`}>
            <Sparkles className="h-3 w-3" />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">{label}</p>
          <div className="mt-1.5">
            {isLoading ? (
              <div className="h-7 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ) : typeof value === 'number' ? (
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  <CountUp value={value} />
                </p>
              </div>
            ) : (
              <p className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate" title={String(value)}>
                {value}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.4 + index * 0.05, duration: 0.8 }}
            className={`h-full bg-gradient-to-r ${gradient}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function SummaryCards({ onShowRecruiterStats }: { onShowRecruiterStats?: (id: string) => void } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTeamLeader, isAdmin } = usePermissions();
  const { data, isLoading } = useGlobalSummary();
  const [teamsExpanded, setTeamsExpanded] = useState(false);

  const visibleCards = isTeamLeader ? tlCardConfig : adminCardConfig;

  const abbreviateName = (fullName: unknown): string => {
    if (typeof fullName !== 'string' || !fullName.trim()) return '—';
    const parts = fullName.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
    if (parts.length === 0) return '—';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
  };

  const handleCardDoubleClick = (label: string) => {
    if (label === 'Total Users' || label === 'Team Recruiters') {
      navigate('/recruiters?role=ALL');
    } else if (label === 'Total Recruiters' || label === 'Active Recruiters') {
      navigate('/recruiters?role=RECRUITER');
    } else if (label === 'Total Clients' || label === 'Team Clients') {
      navigate('/profiles');
    } else if (label === 'Total Applications' || label === 'Team Apps') {
      navigate('/applications');
    } else if (label === "Today's Apps" || label === "Today's Team") {
      const bizDate = data?.currentBusinessDate || '';
      navigate(bizDate ? `/applications?date=${bizDate}` : '/applications');
    } else if (label === 'My Total Apps') {
      navigate(`/applications?recruiterId=${user?.id}`);
    } else if (label === 'My Current Apps') {
      const bizDate = data?.currentBusinessDate || '';
      navigate(bizDate ? `/applications?recruiterId=${user?.id}&date=${bizDate}` : `/applications?recruiterId=${user?.id}`);
    } else if (label === 'Active') {
      navigate('/activity?status=ACTIVE');
    // } else if (label === 'On Break') {
    //   navigate('/activity?status=SHORT_BREAK,DINNER_BREAK');
    } else if (label === 'Top Performer') {
      if (data?.topPerformerId && onShowRecruiterStats) {
        onShowRecruiterStats(data.topPerformerId);
      }
    }
  };

  return (
    <div className="space-y-5">
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleCards.map((card: any, i: number) => (
          <StaggerItem key={card.key}>
            <PremiumStatCard
              icon={card.icon}
              label={card.label}
              value={card.key === 'topPerformer' ? abbreviateName(data?.[card.key as keyof typeof data]) : data ? (data[card.key as keyof typeof data] as any) ?? 0 : 0}
              gradient={card.gradient}
              bg={card.bg}
              accent={card.accent}
              isLoading={isLoading}
              index={i}
              roleBreakdown={card.key === 'totalRecruiters' && !isTeamLeader ? data?.roleBreakdown : undefined}
              onDoubleClick={() => handleCardDoubleClick(card.label)}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>
      {isAdmin && (
        <Reveal delay={0.3}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-violet-500 via-indigo-500 to-teal-500" />
            <button
              onClick={() => setTeamsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-500 text-white shadow-md">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    Organization Teams
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold">
                      {isLoading ? '...' : data?.totalTeams ?? 0} active
                    </Badge>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Team Leaders & member distribution</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-300">{teamsExpanded ? 'Collapse' : 'Expand teams'}</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white">
                  {teamsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </button>

            <AnimatePresence>
              {teamsExpanded && (
                <motion.div
                  key="team-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30"
                >
                  <div className="p-4">
                    {isLoading && <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">Loading teams...</p>}
                    {!isLoading && (!data?.teams || data.teams.length === 0) && (
                      <p className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">No teams found. Assign Team Leaders to create teams.</p>
                    )}
                    {!isLoading && data?.teams && data.teams.length > 0 && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.teams.map((team: any) => (
                          <motion.div
                            key={team.tlId}
                            whileHover={{ y: -4, scale: 1.01 }}
                            onClick={() => navigate(`/analytics?teamId=${team.tlId}`)}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-[1px] hover:shadow-lg transition-all cursor-pointer"
                          >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-500 blur-[0.5px]" />
                            <div className="relative rounded-[11px] bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-850 dark:to-slate-900 p-3.5 flex flex-col justify-between h-full gap-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {team.teamName || <span className="italic text-slate-400">No team name</span>}
                                  </p>
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-1">TL: <span className="font-semibold text-slate-700 dark:text-slate-300">{team.tlName}</span></p>
                                </div>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-mayzax-blue shadow-sm group-hover:text-white transition-all transform group-hover:translate-x-0.5">
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 text-[10px] font-semibold border border-slate-200 dark:border-slate-700/60 dark:text-white">
                                  {team.memberCount} members
                                </span>
                                <span className="rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-350 px-2 py-0.5 text-[10px] font-semibold border border-blue-200/50 dark:border-blue-900/30 dark:text-white">
                                  {team.totalApplications} total
                                </span>
                                <span className="rounded-full bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-350 px-2 py-0.5 text-[10px] font-semibold border border-violet-200/50 dark:border-violet-900/30 dark:text-white">
                                  {team.currentApplications} today
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Reveal>
      )}

      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 w-fit shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Business Date: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.currentBusinessDate}</span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          {data.shiftWindowText || '6:00 PM – 9:00 AM IST'}
        </motion.div>
      )}
    </div>
  );
}
