import { Users, UserCheck, UserSquare2, Briefcase, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/motion/stat-card';
import { useGlobalSummary } from '@/hooks/use-analytics';

const cardConfig = [
  { key: 'totalRecruiters', label: 'Total Recruiters', icon: Users, color: 'text-mayzax-blue bg-mayzax-blue-50' },
  { key: 'activeRecruiters', label: 'Active Recruiters', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'totalProfiles', label: 'Total Client Profiles', icon: UserSquare2, color: 'text-mayzax-green bg-mayzax-green-50' },
  { key: 'totalApplications', label: 'Total Applications', icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { key: 'currentShiftApplications', label: "Today's Shift Applications", icon: Clock, color: 'text-purple-600 bg-purple-50' },
] as const;

export function SummaryCards() {
  const { data, isLoading } = useGlobalSummary();

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cardConfig.map((card, i) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={data ? data[card.key] : 0}
            isLoading={isLoading}
            colorClass={card.color}
            index={i}
          />
        ))}
      </div>
      {data && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-xs text-slate-400"
        >
          Business date: <span className="font-medium text-slate-600">{data.currentBusinessDate}</span> · Shift window
          7:30 PM – 7:30 AM IST
        </motion.p>
      )}
    </div>
  );
}
