import { BarChart3, Briefcase, ExternalLink, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useJobPortalAnalytics } from '@/hooks/use-analytics';
import { useApplications } from '@/hooks/use-applications';
import { useAuth } from '@/context/auth-context';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { formatDateTime } from '@/lib/utils';
import { JobPortalAnalyticsCard } from './job-portal-analytics-card';
import { useMyRecruiterStats } from '@/hooks/use-recruiters';

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
  const totalApplications = recruiterStats?.totalApplications ?? 0;

  return (
    <div>
      <PageHeader
        title="Recruiter Dashboard"
        description={`Welcome${user?.name ? `, ${user.name}` : ''}. Track your job portal performance and latest application activity.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-mayzax-blue" /> Total Applications
            </CardTitle>
            <CardDescription>Your applications across the tracked job portals.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-9 w-24" /> : <p className="text-3xl font-bold text-slate-900">{data?.totalApplications ?? 0}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-mayzax-green" /> Top Portal
            </CardTitle>
            <CardDescription>Portal with your highest application count.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900">{topPortal.count}</p>
                <p className="pb-1 text-sm font-medium text-slate-500">{formatEnumLabel(topPortal.portal)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-mayzax-blue" /> Assigned Profiles
            </CardTitle>
            <CardDescription>Profiles assigned to your recruiter account.</CardDescription>
          </CardHeader>
          <CardContent>
            {isRecruiterStatsLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-slate-900">{recruiterStats?.assignedProfilesCount ?? profileWiseCounts.length}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <JobPortalAnalyticsCard
          title="Job Portal Analytics"
          description="Toggle between all-time, current-shift, and custom date-range portal counts for your applications."
        />
      </div>
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile wise Applications</CardTitle>
            <CardDescription>Applications grouped by the client profiles assigned to you.</CardDescription>
          </CardHeader>
          <CardContent>
            {isRecruiterStatsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : profileWiseCounts.length === 0 ? (
              <EmptyState title="No assigned profiles" description="Profiles assigned to you will appear here with their application counts." />
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="text-right">Current Shift Applications</TableHead>
                      <TableHead className="text-right">Total Applications</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profileWiseCounts.map((row) => (
                      <TableRow key={row.profileId}>
                        <TableCell>
                          <p className="text-sm font-medium text-slate-900">{row.candidateName}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.currentShiftApplicationCount > 0 ? 'default' : 'muted'}>
                            {row.currentShiftApplicationCount} applications
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{row.applicationCount} applications</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Your latest submitted applications.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <EmptyState title="No recent applications" description="Applications you submit will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Portal</TableHead>
                  <TableHead>Company / Title</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{app.profile?.candidateName}</p>
                      <p className="text-xs text-slate-400">{app.profile?.technology}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatEnumLabel(app.jobPortal)}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-900">{app.companyName || 'Company not provided'}</p>
                      <p className="text-xs text-slate-500">{app.jobTitle || 'Job title not provided'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDateTime(app.appliedAt)}</TableCell>
                    <TableCell className="text-right">
                      <a href={app.jobLink} target="_blank" rel="noreferrer" className="text-mayzax-blue hover:underline">
                        <ExternalLink className="ml-auto h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
