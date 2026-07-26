import { BarChart3, Briefcase, ExternalLink, Shield, Users, Sparkles, Zap, TrendingUp, Award, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useJobPortalAnalytics } from '@/hooks/use-analytics';
import { useApplications } from '@/hooks/use-applications';
import { usePermissions } from '@/hooks/use-permissions';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { formatDateTime } from '@/lib/utils';
import { JobPortalAnalyticsCard } from './job-portal-analytics-card';
import { useMyRecruiterStats } from '@/hooks/use-recruiters';
import { useAuth } from '@/context/auth-context';
import { Reveal, StaggerContainer, StaggerItem } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';
import { motion } from 'framer-motion';

function PremiumMiniStat({ icon: Icon, label, value, sub, gradient, loading, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-[1px] shadow-sm hover:shadow-lg transition-all"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br ${gradient} transition-opacity`} />
      <div className="relative rounded-[15px] bg-white p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <Sparkles className="h-4 w-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-1">
          {loading ? <Skeleton className="h-8 w-20" /> : typeof value === 'number' ? <p className="text-2xl font-bold text-slate-900"><CountUp value={value} /></p> : <p className="text-lg font-semibold text-slate-900">{value}</p>}
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const { data: recruiterStats, isLoading: isRecruiterStatsLoading } = useMyRecruiterStats();
  const { data, isLoading } = useJobPortalAnalytics({ scope: 'all' });
  const { data: recentApplicationsData } = useApplications({
    page: 1,
    pageSize: 5,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
    recruiterId: user?.id,
  });

  const portals = data?.portals ?? [];
  const topPortal = portals.reduce((best, row) => (row.count > best.count ? row : best), portals[0] ?? { portal: 'LINKEDIN' as const, count: 0 });
  const recentApplications = recentApplicationsData?.data ?? [];
  const profileWiseCounts = recruiterStats?.profileWiseCounts ?? [];

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/20 p-[1px] shadow-sm">
          <div className="rounded-[19px] bg-white">
            <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-mayzax-blue-600 to-mayzax-green-600 text-white shadow-lg">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    Welcome back, {user?.name?.split(' ')[0] || 'Recruiter'}!
                    <span className="hidden sm:inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Award className="h-3.5 w-3.5" />
                    </span>
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">Your personal cockpit • Portal performance, profiles & recent activity</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-3 py-1 font-semibold">
                      <Zap className="h-3 w-3" />
                      {recruiterStats?.totalApplications ?? 0} total apps
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-medium text-emerald-700">
                      <Clock className="h-3 w-3" />
                      {recruiterStats?.currentShiftApplications ?? 0} today
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Top portal: <span className="font-semibold text-slate-700">{formatEnumLabel(topPortal.portal)}</span> ({topPortal.count})
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-teal-500" />
          </div>
        </div>
      </Reveal>

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <PremiumMiniStat icon={Briefcase} label="Total Applications" value={data?.totalApplications ?? 0} sub="Across all portals" gradient="from-blue-500 to-cyan-600" loading={isLoading} index={0} />
        </StaggerItem>
        <StaggerItem>
          <PremiumMiniStat
            icon={BarChart3}
            label="Top Portal"
            value={`${topPortal.count} • ${formatEnumLabel(topPortal.portal)}`}
            sub="Your strongest channel"
            gradient="from-mayzax-blue-500 to-mayzax-green-600"
            loading={isLoading}
            index={1}
          />
        </StaggerItem>
        <StaggerItem>
          <PremiumMiniStat icon={Users} label="Assigned Profiles" value={recruiterStats?.assignedProfilesCount ?? profileWiseCounts.length} sub="Candidates assigned" gradient="from-amber-500 to-orange-600" loading={isRecruiterStatsLoading} index={2} />
        </StaggerItem>
        <StaggerItem>
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-[1px] shadow-sm hover:shadow-lg transition-all h-full">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-600 transition-opacity" />
            <div className="relative rounded-[15px] bg-white p-5 h-full">
              <div className="flex items-start justify-between mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-600 text-white shadow-md">
                  <Shield className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] bg-violet-50 border-violet-200 text-violet-700">Team</Badge>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">My Team</p>
              {isRecruiterStatsLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : recruiterStats?.teamLeader ? (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {recruiterStats.teamLeader.teamName || <span className="italic text-slate-400">No team name</span>}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    TL: <span className="font-medium text-slate-700">{recruiterStats.teamLeader.name}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400 italic">No team assigned yet</p>
              )}
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      <Reveal delay={0.15}>
        <JobPortalAnalyticsCard />
      </Reveal>

      <Reveal delay={0.2}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Profile-wise Applications</CardTitle>
                <CardDescription className="text-xs">Grouped by your assigned client profiles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isRecruiterStatsLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : profileWiseCounts.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No assigned profiles" description="Profiles assigned to you will appear here." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {profileWiseCounts.map((row, idx) => (
                  <motion.div
                    key={row.profileId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold text-sm">
                        {row.candidateName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.candidateName}</p>
                        <p className="text-xs text-slate-500">{row.profileId.slice(0, 8)} • Profile</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-900 text-white hover:bg-slate-900 border-0 shadow-sm">{row.currentShiftApplications} today</Badge>
                      <Badge variant="secondary" className="bg-indigo-50 border-indigo-100 text-indigo-700">
                        {row.totalApplications} total
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.25}>
        <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
                <CardDescription className="text-xs">Latest 5 submissions • Auto-refreshes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentApplications.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No recent applications" description="Your recent activity will appear here." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentApplications.map((app, idx) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mayzax-blue-500 to-mayzax-green-500 text-white font-bold text-sm">
                        {app.profile?.candidateName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{app.profile?.candidateName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {app.companyName || 'Company'} • {app.jobTitle || 'Role'} • {formatEnumLabel(app.jobPortal)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="hidden sm:inline text-xs text-slate-400">{formatDateTime(app.appliedAt)}</span>
                      <a href={app.jobLink} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-900 text-slate-500 group-hover:text-white transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
