import { useState } from 'react';
import { useApplications } from '@/hooks/use-applications';
import { PremiumPageHeader } from '@/components/shared/premium-page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { useAuth } from '@/context/auth-context';
import { formatDateTime } from '@/lib/utils';
import { formatEnumLabel } from '@/components/shared/status-badge';
import { Briefcase, Clock, Award, Zap } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data: appResponse, isLoading, error } = useApplications({
    page,
    pageSize: 10,
    sortBy: 'appliedAt',
    sortOrder: 'desc',
  });

  const applications = appResponse?.data ?? [];
  const pagination = appResponse?.pagination;

  // Aggregate stats from applications (local rollup for client simplicity)
  const totalApps = pagination?.total ?? 0;
  const inReview = applications.filter((a) => a.status === 'IN_REVIEW' || a.status === 'APPLIED').length;
  const interviews = applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'INTERVIEWED' || a.status === 'SHORTLISTED').length;
  const offers = applications.filter((a) => a.status === 'OFFERED').length;

  if (error) {
    return <ErrorState message="Failed to load your application stats." />;
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <PremiumPageHeader
        icon={Briefcase}
        title="Client Placement Center"
        description={`Welcome back, ${user?.name || 'Client'}. Here is your placement summary and application logs.`}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-mayzax-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{totalApps}</div>
            <p className="text-xs text-slate-500 mt-1">Submitted on your behalf</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">In Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{inReview}</div>
            <p className="text-xs text-slate-500 mt-1">Pending response</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Interviews & Shortlists</CardTitle>
            <Zap className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{interviews}</div>
            <p className="text-xs text-slate-500 mt-1">Active hiring stages</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Offers Received</CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{offers}</div>
            <p className="text-xs text-slate-500 mt-1">Congratulations!</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Log Table */}
      <Card className="border-slate-200/60 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Your Applications Log</CardTitle>
          <CardDescription>Real-time log of job submissions and status tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton cols={5} rows={5} />
          ) : applications.length === 0 ? (
            <EmptyState
              title="No applications logged"
              description="Your assigned recruiter hasn't submitted any applications for your profile yet."
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="font-semibold">Company</TableHead>
                      <TableHead className="font-semibold">Job Title</TableHead>
                      <TableHead className="font-semibold">Job Portal</TableHead>
                      <TableHead className="font-semibold">Applied Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{app.companyName}</TableCell>
                        <TableCell>{app.jobTitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                            {formatEnumLabel(app.jobPortal)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">{formatDateTime(app.appliedAt)}</TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              app.status === 'OFFERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                                : app.status === 'REJECTED'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                : app.status.startsWith('INTERVIEW')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {formatEnumLabel(app.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <PaginationControls
                  pagination={pagination}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
