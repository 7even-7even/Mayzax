import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InterviewsCalendarProps {
  interviews: any[];
  isLoading: boolean;
  selectedDate: Date | null;
  onDateSelect: (d: Date) => void;
  mini?: boolean;
}

export function InterviewsCalendar({
  interviews,
  isLoading,
  selectedDate,
  onDateSelect,
  mini = false,
}: InterviewsCalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(currentYear, currentMonth, i));
  }
  while (calendarDays.length < 42) {
    calendarDays.push(null);
  }

  const getInterviewsForDate = (date: Date) => {
    const compareStr = date.toISOString().slice(0, 10);
    return interviews.filter((item) => item.date === compareStr);
  };

  return (
    <div className={`w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800 ${mini ? 'max-w-md mx-auto' : ''}`}>
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className={`text-mayzax-blue-600 ${mini ? 'h-4 w-4' : 'h-5 w-5'}`} />
          <h3 className={`font-bold text-slate-800 dark:text-white ${mini ? 'text-sm' : 'text-base'}`}>
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePrevMonth}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNextMonth}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={`text-center text-slate-400 font-medium ${mini ? 'py-8 text-[11px]' : 'py-20 text-xs'}`}>
          Loading interviews...
        </div>
      ) : (
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 tracking-wider mb-1.5 uppercase text-[10px]">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square rounded-lg bg-slate-50/30 dark:bg-slate-950/10" />;
              }

              const dayInterviews = getInterviewsForDate(day);
              const hasInterviews = dayInterviews.length > 0;
              const isSelected = selectedDate && selectedDate.toDateString() === day.toDateString();
              const isToday = new Date().toDateString() === day.toDateString();

              const calendarCellMarkup = (
                <button
                  type="button"
                  onClick={() => onDateSelect(day)}
                  className={`relative aspect-square flex flex-col items-center justify-between p-1 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400 z-10'
                      : isToday
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-500/20 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-400/50'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-100'
                  }`}
                >
                  <span
                    className={`text-[12px] font-bold ${
                      isSelected
                        ? 'text-white'
                        : isToday
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {hasInterviews && (
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold shadow-sm ${
                        isSelected
                          ? 'bg-white text-indigo-700'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {dayInterviews.length}
                    </div>
                  )}
                </button>
              );

              if (hasInterviews) {
                return (
                  <Tooltip key={`day-${idx}`}>
                    <TooltipTrigger asChild>
                      {calendarCellMarkup}
                    </TooltipTrigger>
                    <TooltipContent className="p-3 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl max-w-xs space-y-1.5">
                      <div className="font-extrabold text-xs text-indigo-400">
                        {dayInterviews.length} Interview{dayInterviews.length !== 1 ? 's' : ''} Scheduled
                      </div>
                      <div className="space-y-1 text-[11px] font-medium text-slate-300">
                        {dayInterviews.map((item, idy) => (
                          <div key={idy} className="flex items-center gap-1.5 truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {item.profile?.candidateName} ({item.roundName})
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={`day-${idx}`} className="contents">
                  {calendarCellMarkup}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
