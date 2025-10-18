import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Season {
  id: string;
  name: string;
  color: string;
  season_periods: Array<{
    start_month: number;
    start_day: number;
    end_month: number;
    end_day: number;
  }>;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_long_weekend: boolean;
}

interface YearCalendarViewProps {
  seasons: Season[];
  holidays: Holiday[];
  year?: number;
}

export default function YearCalendarView({ seasons, holidays, year = new Date().getFullYear() }: YearCalendarViewProps) {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getSeasonForDate = (month: number, day: number): Season | null => {
    for (const season of seasons) {
      for (const period of season.season_periods) {
        const startDate = new Date(year, period.start_month - 1, period.start_day);
        const endDate = new Date(year, period.end_month - 1, period.end_day);
        const currentDate = new Date(year, month, day);

        if (currentDate >= startDate && currentDate <= endDate) {
          return season;
        }
      }
    }
    return null;
  };

  const getHolidayForDate = (month: number, day: number): Holiday | null => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find(h => h.date === dateStr) || null;
  };

  const getDaysInMonth = (month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = getDaysInMonth(monthIndex);
    const firstDay = getFirstDayOfMonth(monthIndex);
    const days: JSX.Element[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const season = getSeasonForDate(monthIndex, day);
      const holiday = getHolidayForDate(monthIndex, day);
      const date = new Date(year, monthIndex, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <TooltipProvider key={day}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "aspect-square rounded-sm flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 hover:shadow-md relative",
                  season && "shadow-sm"
                )}
                style={{
                  backgroundColor: season ? season.color : isWeekend ? 'hsl(var(--muted))' : 'transparent',
                  color: season ? 'white' : 'hsl(var(--foreground))',
                }}
              >
                {day}
                {holiday && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-background" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <div className="font-semibold">
                  {monthNames[monthIndex]} {day}, {year}
                </div>
                {season && (
                  <div className="text-xs">
                    Season: <span className="font-medium">{season.name}</span>
                  </div>
                )}
                {holiday && (
                  <div className="text-xs">
                    Holiday: <span className="font-medium">{holiday.name}</span>
                    {holiday.is_long_weekend && (
                      <Badge variant="outline" className="ml-1 text-[10px] py-0">Long Weekend</Badge>
                    )}
                  </div>
                )}
                {isWeekend && !holiday && (
                  <div className="text-xs text-muted-foreground">Weekend</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Card key={monthIndex}>
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-semibold text-center">
            {monthNames[monthIndex]}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-7 gap-0.5 text-[10px] text-muted-foreground mb-1 text-center">
            <div>S</div>
            <div>M</div>
            <div>T</div>
            <div>W</div>
            <div>T</div>
            <div>F</div>
            <div>S</div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days}
          </div>
        </CardContent>
      </Card>
    );
  };

  const seasonLegend = useMemo(() => {
    return seasons.map(season => ({
      name: season.name,
      color: season.color,
      id: season.id
    }));
  }, [seasons]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Calendar Year View - {year}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visual overview of seasonal periods and holidays
          </p>
        </div>
        <div className="flex items-center gap-2">
          {seasonLegend.map(season => (
            <div key={season.id} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm shadow-sm" 
                style={{ backgroundColor: season.color }}
              />
              <span>{season.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm ml-2 pl-2 border-l">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Holiday</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>
    </div>
  );
}
