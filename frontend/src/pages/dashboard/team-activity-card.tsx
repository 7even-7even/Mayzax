import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityHeatmap } from '@/components/motion/activity-heatmap';
import { useDailyCounts } from '@/hooks/use-analytics';

export function TeamActivityCard() {
  const { data, isLoading } = useDailyCounts({});

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-mayzax-green" /> Team Activity Heatmap
          </CardTitle>
          <CardDescription>Application submissions across all recruiters, by business date.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto pb-5">
        {isLoading ? <Skeleton className="h-28 w-full max-w-2xl" /> : <ActivityHeatmap data={data ?? []} weeks={18} />}
      </CardContent>
    </Card>
  );
}
