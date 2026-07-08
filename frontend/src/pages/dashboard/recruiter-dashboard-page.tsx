import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Briefcase, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useJobPortalAnalytics } from '@/hooks/use-analytics';
import { useApplications } from '@/hooks/use-applications';
import { useAuth } from '@/context/auth-context';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { formatDateTime } from '@/lib/utils';

export default function RecruiterDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useJobPortalAnalytics();
  const { data: recentApplicationsData } = useApplications({ page: 1, pageSize: 5, sortBy: 'appliedAt', sortOrder: 'desc' });

  const portals = data?.portals ?? [];
  const chartData = portals.map((row) => ({ portal: formatEnumLabel(row.portal), applications: row.count }));
  const hasPortalData = portals.some((row) => row.count > 0);
  const topPortal = portals.reduce((best, row) => (row.count > best.count ? row : best), portals[0] ?? { portal: 'LINKEDIN' as const, count: 0 });
  const recentApplications = recentApplicationsData?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Recruiter Dashboard"
        description={`Welcome${user?.name ? `, ${user.name}` : ''}. Track your job portal performance and latest application activity.`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Job Portal Analytics</CardTitle>
            <CardDescription>Number of applications submitted through each job portal.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <Skeleton className="h-80 w-full" />}
            {isError && <ErrorState onRetry={() => refetch()} />}
            {!isLoading && !isError && !hasPortalData && (
              <EmptyState icon={BarChart3} title="No portal data yet" description="Submit applications to start seeing portal-wise analytics." />
            )}
            {!isLoading && !isError && hasPortalData && (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="portal" tick={{ fontSize: 11, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value) => [value, 'Applications']}
                  />
                  <Bar dataKey="applications" fill="#2A5DA8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal-wise Count</CardTitle>
            <CardDescription>Quick count by portal.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {portals.map((row) => (
                  <div key={row.portal} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{formatEnumLabel(row.portal)}</span>
                    <Badge variant={row.count > 0 ? 'default' : 'muted'}>{row.count}</Badge>
                  </div>
                ))}
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
