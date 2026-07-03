import { Users, UserCheck, UserSquare2, Briefcase, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalSummary } from '@/hooks/use-analytics';

const cardConfig = [
  { key: 'totalRecruiters', label: 'Total Recruiters', icon: Users, color: 'text-mayzax-blue bg-mayzax-blue-50' },
  { key: 'activeRecruiters', label: 'Active Recruiters', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'totalProfiles', label: 'Client Profiles', icon: UserSquare2, color: 'text-mayzax-green bg-mayzax-green-50' },
  { key: 'totalApplications', label: 'Total Applications', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { key: 'currentShiftApplications', label: "Today's Shift Applications", icon: Clock, color: 'text-purple-600 bg-purple-50' },
] as const;

export function SummaryCards() {
  const { data, isLoading } = useGlobalSummary();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cardConfig.map((card) => (
        <Card key={card.key}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-xl font-bold text-slate-900">{data ? data[card.key] : '—'}</p>
              )}
              <p className="text-xs text-slate-500">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {data && (
        <p className="col-span-full text-xs text-slate-400">
          Business date: <span className="font-medium text-slate-600">{data.currentBusinessDate}</span> · Shift window
          7:30 PM – 4:30 AM IST
        </p>
      )}
    </div>
  );
}
