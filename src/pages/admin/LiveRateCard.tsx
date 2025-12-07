import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead className="text-right">Adjustment</TableHead>
                    <TableHead>Rules Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {liveRates.map((rate) => {
                    const adjustment = rate.finalPrice - rate.basePrice;
                    const adjustmentPercent = rate.basePrice > 0 
                      ? ((adjustment / rate.basePrice) * 100).toFixed(1)
                      : '0';

                    return (
                      <TableRow key={rate.roomTypeId}>
                        <TableCell className="font-medium">
                          {rate.roomTypeName}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{rate.basePrice.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-lg">
                          ₹{rate.finalPrice.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {adjustment !== 0 ? (
                            <span className={adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {adjustment >= 0 ? '+' : ''}₹{adjustment.toLocaleString('en-IN')}
                              <span className="text-xs ml-1">({adjustmentPercent}%)</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {rate.adjustments && rate.adjustments.length > 0 ? (
                              rate.adjustments.map((rule: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {rule.type || rule.rule_type || 'Rule'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Base only</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
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
