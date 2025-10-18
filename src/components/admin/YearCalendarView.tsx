import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Save, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  onUpdate?: () => void;
}

export default function YearCalendarView({ seasons, holidays, year = new Date().getFullYear(), onUpdate }: YearCalendarViewProps) {
  const { toast } = useToast();
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(seasons[0] || null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getDateKey = (month: number, day: number) => `${year}-${month}-${day}`;

  const getSeasonForDate = useCallback((month: number, day: number): Season | null => {
    const dateKey = getDateKey(month, day);
    
    // Check pending changes first
    if (pendingChanges.has(dateKey)) {
      const seasonId = pendingChanges.get(dateKey);
      return seasons.find(s => s.id === seasonId) || null;
    }

    // Check existing season periods
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
  }, [seasons, year, pendingChanges]);

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

  const handleDateClick = (month: number, day: number) => {
    if (!selectedSeason) return;

    const dateKey = getDateKey(month, day);
    const newChanges = new Map(pendingChanges);
    newChanges.set(dateKey, selectedSeason.id);
    setPendingChanges(newChanges);
    setHasChanges(true);
  };

  const handleMouseDown = (month: number, day: number) => {
    setIsDrawing(true);
    handleDateClick(month, day);
  };

  const handleMouseEnter = (month: number, day: number) => {
    if (isDrawing) {
      handleDateClick(month, day);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Prevent text selection during drag
  React.useEffect(() => {
    if (isDrawing) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    } else {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDrawing]);

  const handleSaveChanges = async () => {
    if (!pendingChanges.size) return;

    try {
      // Group changes by season
      const seasonChanges = new Map<string, Array<{ month: number; day: number }>>();
      
      pendingChanges.forEach((seasonId, dateKey) => {
        const [, month, day] = dateKey.split('-').map(Number);
        if (!seasonChanges.has(seasonId)) {
          seasonChanges.set(seasonId, []);
        }
        seasonChanges.get(seasonId)!.push({ month, day });
      });

      // Delete existing season periods and create new consolidated ones
      for (const [seasonId, dates] of seasonChanges) {
        // Delete old periods for this season
        const { error: deleteError } = await supabase
          .from('season_periods')
          .delete()
          .eq('season_id', seasonId);

        if (deleteError) throw deleteError;

        // Sort dates and find continuous ranges
        dates.sort((a, b) => {
          const dateA = new Date(year, a.month, a.day);
          const dateB = new Date(year, b.month, b.day);
          return dateA.getTime() - dateB.getTime();
        });

        // Create continuous periods
        let periodStart = dates[0];
        let periodEnd = dates[0];

        const periodsToInsert: any[] = [];

        for (let i = 1; i < dates.length; i++) {
          const currentDate = new Date(year, dates[i].month, dates[i].day);
          const prevDate = new Date(year, periodEnd.month, periodEnd.day);
          const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

          if (daysDiff === 1) {
            // Continuous period
            periodEnd = dates[i];
          } else {
            // Gap found, save current period and start new one
            periodsToInsert.push({
              season_id: seasonId,
              start_month: periodStart.month + 1,
              start_day: periodStart.day,
              end_month: periodEnd.month + 1,
              end_day: periodEnd.day
            });
            periodStart = dates[i];
            periodEnd = dates[i];
          }
        }

        // Add the last period
        periodsToInsert.push({
          season_id: seasonId,
          start_month: periodStart.month + 1,
          start_day: periodStart.day,
          end_month: periodEnd.month + 1,
          end_day: periodEnd.day
        });

        // Insert new periods
        const { error: insertError } = await supabase
          .from('season_periods')
          .insert(periodsToInsert);

        if (insertError) throw insertError;
      }

      setPendingChanges(new Map());
      setHasChanges(false);
      
      toast({
        title: "Success",
        description: "Season periods updated successfully",
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    setHasChanges(false);
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

      const dateKey = getDateKey(monthIndex, day);
      const hasChange = pendingChanges.has(dateKey);

      days.push(
        <TooltipProvider key={day}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "aspect-square rounded-sm flex items-center justify-center text-xs font-medium transition-all relative select-none touch-none",
                  "hover:scale-110 hover:z-10 hover:shadow-md",
                  season && "shadow-sm",
                  hasChange && "ring-2 ring-primary ring-offset-1",
                  isDrawing ? "cursor-crosshair" : "cursor-pointer",
                  isDrawing && selectedSeason && "hover:ring-2 hover:ring-offset-1"
                )}
                style={{
                  backgroundColor: season ? season.color : isWeekend ? 'hsl(var(--muted))' : 'transparent',
                  color: season ? 'white' : 'hsl(var(--foreground))',
                  ...(isDrawing && selectedSeason && { 
                    boxShadow: `0 0 0 2px ${selectedSeason.color}40` 
                  })
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleMouseDown(monthIndex, day);
                }}
                onMouseEnter={() => handleMouseEnter(monthIndex, day)}
                onMouseUp={handleMouseUp}
                onDragStart={(e) => e.preventDefault()}
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
                    {hasChange && <Badge variant="outline" className="ml-1 text-[10px] py-0">Modified</Badge>}
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
                {selectedSeason && (
                  <div className="text-xs text-muted-foreground mt-2 pt-1 border-t">
                    Click to assign: <span className="font-medium">{selectedSeason.name}</span>
                  </div>
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
    <div 
      className="space-y-6" 
      onMouseUp={handleMouseUp} 
      onMouseLeave={handleMouseUp}
      style={{ userSelect: isDrawing ? 'none' : 'auto' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Calendar Year View - {year}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isDrawing ? (
              <span className="text-primary font-medium">
                Painting with {selectedSeason?.name}... Release to stop
              </span>
            ) : (
              <span>Click and drag across dates to paint seasons. Holidays are marked with red dots.</span>
            )}
          </p>
        </div>
      </div>

      <div className={cn(
        "flex items-center justify-between gap-4 p-4 border rounded-lg transition-colors",
        isDrawing ? "bg-primary/10 border-primary" : "bg-muted/30"
      )}>
        <div className="flex items-center gap-3">
          <Paintbrush className={cn(
            "h-5 w-5 transition-colors",
            isDrawing ? "text-primary" : "text-muted-foreground"
          )} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isDrawing ? "Painting:" : "Select season:"}
            </span>
            {seasons.map(season => (
              <Button
                key={season.id}
                size="sm"
                variant={selectedSeason?.id === season.id ? "default" : "outline"}
                onClick={() => setSelectedSeason(season)}
                className="gap-2"
                disabled={isDrawing}
              >
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: season.color }}
                />
                {season.name}
              </Button>
            ))}
          </div>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{pendingChanges.size} dates modified</Badge>
            <Button size="sm" variant="outline" onClick={handleDiscardChanges}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSaveChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm ring-2 ring-primary" />
          <span>Modified (unsaved)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </div>
    </div>
  );
}
