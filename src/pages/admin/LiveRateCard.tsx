import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, ChevronRight, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface LiveRateResult {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  finalPrice: number;
  adjustments: any[];
}

interface RoomType {
  id: string;
  name: string;
  base_price: number | null;
}

export default function LiveRateCard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('room_types')
        .select('id, name, base_price')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: liveRates = [], isLoading, refetch, isFetching } = useQuery<LiveRateResult[]>({
    queryKey: ['live-rates', format(selectedDate, 'yyyy-MM-dd'), roomTypes.length],
    queryFn: async () => {
      if (roomTypes.length === 0) return [];
      
      const rates: LiveRateResult[] = [];
      
      for (const roomType of roomTypes) {
        const { data, error } = await supabase.rpc('calculate_dynamic_price', {
          p_room_type_id: roomType.id,
          p_date: format(selectedDate, 'yyyy-MM-dd'),
          p_adults_count: 2,
          p_children_count: 0,
          p_infants_count: 0,
          p_booking_channel: 'direct',
          p_current_occupancy: 0
        });
        
        if (error) {
          console.error(`Error fetching rate for ${roomType.name}:`, error);
          rates.push({
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            basePrice: roomType.base_price || 0,
            finalPrice: roomType.base_price || 0,
            adjustments: []
          });
        } else if (data && data.length > 0) {
          const adjustmentsData = data[0].adjustments;
          rates.push({
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            basePrice: data[0].base_price || 0,
            finalPrice: data[0].final_price || 0,
            adjustments: Array.isArray(adjustmentsData) ? adjustmentsData : []
          });
        }
      }
      
      return rates;
    },
    enabled: roomTypes.length > 0,
  });

  const { data: seasons = [] } = useQuery<any[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, color');
      if (error) throw error;
      return data;
    },
  });

  const { data: dayTypes = [] } = useQuery<any[]>({
    queryKey: ['day-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_types')
        .select('id, name, slug');
      if (error) throw error;
      return data;
    },
  });

  // Determine day type for display
  const dayOfWeek = selectedDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const currentDayType = dayTypes.find(d => d.slug === (isWeekend ? 'weekend' : 'weekday'));

  // Calculate stats
  const avgPrice = liveRates.length > 0 
    ? liveRates.reduce((sum, e) => sum + e.finalPrice, 0) / liveRates.length 
    : 0;
  const minRate = liveRates.length > 0 
    ? liveRates.reduce((min, e) => e.finalPrice < min.finalPrice ? e : min, liveRates[0])
    : null;
  const maxRate = liveRates.length > 0 
    ? liveRates.reduce((max, e) => e.finalPrice > max.finalPrice ? e : max, liveRates[0])
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Rate Card</h1>
          <p className="text-muted-foreground mt-2">
            View real-time computed pricing for all room types
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Live rates are calculated in real-time using the <code className="text-xs bg-muted px-1 py-0.5 rounded">calculate_dynamic_price</code> function with all pricing rules applied.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Room Types - Live Rates</CardTitle>
              <CardDescription>
                Showing rates for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {currentDayType && (
                  <Badge variant="outline" className="ml-2">
                    {currentDayType.name}
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {liveRates.length > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Average Rate</div>
                <div className="text-2xl font-bold">₹{avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lowest Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  ₹{minRate?.finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">{minRate?.roomTypeName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Highest Rate</div>
                <div className="text-2xl font-bold text-blue-600">
                  ₹{maxRate?.finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">{maxRate?.roomTypeName}</div>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading live rates...</p>
          ) : liveRates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No room types configured.</p>
              <p className="text-sm text-muted-foreground">
                Add room types in Room Management to see live rates.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2 px-3">Room Type</TableHead>
                    <TableHead className="py-2 px-3 text-right">Base</TableHead>
                    <TableHead className="py-2 px-3 text-right">Final</TableHead>
                    <TableHead className="py-2 px-3 text-right">Adj.</TableHead>
                    <TableHead className="py-2 px-3">Rules</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveRates.map((rate) => {
                    const adjustment = rate.finalPrice - rate.basePrice;
                    const adjustmentPercent = rate.basePrice > 0 
                      ? ((adjustment / rate.basePrice) * 100).toFixed(0)
                      : '0';

                    return (
                      <HoverCard key={rate.roomTypeId} openDelay={100} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/80 text-sm">
                            <TableCell className="py-2 px-3 font-medium">
                              {rate.roomTypeName}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right text-muted-foreground text-xs">
                              ₹{rate.basePrice.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-semibold">
                              ₹{rate.finalPrice.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right text-xs">
                              {adjustment !== 0 ? (
                                <span className={adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {adjustment >= 0 ? '+' : ''}{adjustmentPercent}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              <div className="flex items-center gap-1">
                                {rate.adjustments && rate.adjustments.length > 0 ? (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {rate.adjustments.length} rule{rate.adjustments.length > 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Base</span>
                                )}
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TableCell>
                          </TableRow>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 p-0" side="left" align="start">
                          <div className="p-3 border-b bg-muted/30">
                            <div className="font-semibold text-sm">{rate.roomTypeName}</div>
                            <div className="text-xs text-muted-foreground">Rate Calculation Breakdown</div>
                          </div>
                          <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {/* Step 1: Base Price */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">1</Badge>
                                <span>Base Price</span>
                              </div>
                              <span className="font-mono text-xs">₹{rate.basePrice.toLocaleString('en-IN')}</span>
                            </div>
                            
                            {/* Rule adjustments */}
                            {rate.adjustments && rate.adjustments.length > 0 ? (
                              rate.adjustments.map((rule: any, idx: number) => {
                                const ruleAdjustment = rule.adjustment || (rule.to - rule.from) || 0;
                                const newPrice = rule.new_price || rule.to || rate.finalPrice;
                                
                                return (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-start justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">{idx + 2}</Badge>
                                        <div>
                                          <div className="font-medium text-xs capitalize">
                                            {(rule.type || rule.rule_type || 'Adjustment').replace(/_/g, ' ')}
                                          </div>
                                          {rule.rule && (
                                            <div className="text-[10px] text-muted-foreground">{rule.rule}</div>
                                          )}
                                          {rule.reason && (
                                            <div className="text-[10px] text-muted-foreground">{rule.reason}</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={cn(
                                          "font-mono text-xs",
                                          ruleAdjustment >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                          {ruleAdjustment >= 0 ? '+' : ''}₹{Math.abs(ruleAdjustment).toLocaleString('en-IN')}
                                        </div>
                                        {newPrice > 0 && (
                                          <div className="text-[10px] text-muted-foreground">
                                            = ₹{newPrice.toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-muted-foreground italic py-2">
                                No additional rules applied. Using base price only.
                              </div>
                            )}
                            
                            {/* Final Price */}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ArrowRight className="h-3 w-3" />
                                  <span className="font-semibold text-sm">Final Price</span>
                                </div>
                                <span className="font-mono font-bold">₹{rate.finalPrice.toLocaleString('en-IN')}</span>
                              </div>
                              {adjustment !== 0 && (
                                <div className="text-right text-xs text-muted-foreground">
                                  Total adjustment: <span className={adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {adjustment >= 0 ? '+' : ''}₹{adjustment.toLocaleString('en-IN')} ({adjustmentPercent}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
