import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, ChevronRight, ArrowRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LiveRateResult {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  finalPrice: number;
  adjustments: any[];
  seasonName?: string;
  dayTypeName?: string;
}

interface RateVariant {
  meal_plan_code: string;
  meal_plan_name: string;
  cancellation_policy_code: string;
  cancellation_policy_name: string;
  room_rate: number;
  meal_cost: number;
  policy_adjustment: number;
  total_price: number;
  price_per_night: number;
}

interface RoomType {
  id: string;
  name: string;
  base_price: number | null;
}

export default function LiveRateCard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('room-rates');

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

  // Determine day type for display
  const dayOfWeek = selectedDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const { data: seasons = [] } = useQuery<any[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, color');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dayTypes = [] } = useQuery<any[]>({
    queryKey: ['day-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_types')
        .select('id, name, slug');
      if (error) throw error;
      return data || [];
    },
  });

  const currentDayType = dayTypes.find(d => d.slug === (isWeekend ? 'weekend' : 'weekday'));

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
            adjustments: [],
            dayTypeName: currentDayType?.name || (isWeekend ? 'Weekend' : 'Weekday')
          });
        } else if (data && data.length > 0) {
          const adjustmentsData = data[0].adjustments;
          rates.push({
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            basePrice: data[0].base_price || 0,
            finalPrice: data[0].final_price || 0,
            adjustments: Array.isArray(adjustmentsData) ? adjustmentsData : [],
            dayTypeName: currentDayType?.name || (isWeekend ? 'Weekend' : 'Weekday')
          });
        }
      }
      
      return rates;
    },
    enabled: roomTypes.length > 0,
  });

  // Fetch full rate variants for the first room type (for demonstration)
  const { data: rateVariants = [] } = useQuery<{ roomTypeId: string; roomTypeName: string; variants: RateVariant[] }[]>({
    queryKey: ['rate-variants', format(selectedDate, 'yyyy-MM-dd'), roomTypes.length],
    queryFn: async () => {
      if (roomTypes.length === 0) return [];
      
      const results: { roomTypeId: string; roomTypeName: string; variants: RateVariant[] }[] = [];
      const checkOut = new Date(selectedDate);
      checkOut.setDate(checkOut.getDate() + 1);
      
      for (const roomType of roomTypes) {
        const { data, error } = await supabase.rpc('calculate_rate_variants', {
          p_room_type_id: roomType.id,
          p_check_in: format(selectedDate, 'yyyy-MM-dd'),
          p_check_out: format(checkOut, 'yyyy-MM-dd'),
          p_adults_count: 2,
          p_children_count: 0,
          p_infants_count: 0,
          p_booking_channel: 'direct'
        });
        
        if (!error && data) {
          const variantsArray = Array.isArray(data) ? data : [];
          results.push({
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            variants: variantsArray as unknown as RateVariant[]
          });
        }
      }
      
      return results;
    },
    enabled: roomTypes.length > 0 && activeTab === 'full-variants',
  });

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Room Types - Live Rates</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {currentDayType && (
                  <Badge variant={isWeekend ? 'default' : 'secondary'}>
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="room-rates">Room Rates Only</TabsTrigger>
              <TabsTrigger value="full-variants">Full Variants (with Meal Plans)</TabsTrigger>
            </TabsList>

            <TabsContent value="room-rates" className="space-y-4 mt-4">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Room Rates Only:</strong> Shows base room pricing with dynamic adjustments (occupancy, lead time, channel, tactical overrides). 
                  Meal plans and cancellation policies are shown in "Full Variants" tab.
                </AlertDescription>
              </Alert>

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
                                {/* Step 1: Day Type & Base Price */}
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">1</Badge>
                                    <div>
                                      <span>Base Price</span>
                                      <div className="text-[10px] text-muted-foreground">
                                        {rate.dayTypeName} rate
                                      </div>
                                    </div>
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
                                              {rule.channel && (
                                                <div className="text-[10px] text-muted-foreground">Channel: {rule.channel}</div>
                                              )}
                                              {rule.guests && (
                                                <div className="text-[10px] text-muted-foreground">{rule.guests} guests</div>
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
                                    No dynamic rules applied. Using base {rate.dayTypeName?.toLowerCase()} price.
                                  </div>
                                )}
                                
                                {/* Final Price */}
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="h-3 w-3" />
                                      <span className="font-semibold text-sm">Room Rate</span>
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

                                <div className="border-t pt-2 mt-2 text-[10px] text-muted-foreground">
                                  <Info className="h-3 w-3 inline mr-1" />
                                  Meal plans & cancellation policies are applied at booking. See "Full Variants" tab.
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
            </TabsContent>

            <TabsContent value="full-variants" className="space-y-4 mt-4">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Full Variants:</strong> Shows complete pricing including room rate + meal plan adjustments + cancellation policy adjustments. 
                  This is what guests see during booking.
                </AlertDescription>
              </Alert>

              {rateVariants.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Loading rate variants...</p>
              ) : (
                <div className="space-y-6">
                  {rateVariants.map((room) => (
                    <Card key={room.roomTypeId} className="overflow-hidden">
                      <CardHeader className="py-3 bg-muted/30">
                        <CardTitle className="text-base">{room.roomTypeName}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead className="py-2 px-3">Meal Plan</TableHead>
                              <TableHead className="py-2 px-3">Cancellation</TableHead>
                              <TableHead className="py-2 px-3 text-right">Room</TableHead>
                              <TableHead className="py-2 px-3 text-right">Meal Adj.</TableHead>
                              <TableHead className="py-2 px-3 text-right">Policy Adj.</TableHead>
                              <TableHead className="py-2 px-3 text-right font-semibold">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {room.variants.map((variant, idx) => (
                              <TableRow key={idx} className="text-sm">
                                <TableCell className="py-2 px-3">
                                  <div className="font-medium text-xs">{variant.meal_plan_name}</div>
                                  <div className="text-[10px] text-muted-foreground">{variant.meal_plan_code}</div>
                                </TableCell>
                                <TableCell className="py-2 px-3">
                                  <div className="font-medium text-xs">{variant.cancellation_policy_name}</div>
                                  <div className="text-[10px] text-muted-foreground">{variant.cancellation_policy_code}</div>
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right text-xs text-muted-foreground">
                                  ₹{variant.room_rate?.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right text-xs">
                                  {variant.meal_cost !== 0 ? (
                                    <span className={variant.meal_cost >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      {variant.meal_cost >= 0 ? '+' : ''}₹{variant.meal_cost?.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right text-xs">
                                  {variant.policy_adjustment !== 0 ? (
                                    <span className={variant.policy_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      {variant.policy_adjustment >= 0 ? '+' : ''}₹{variant.policy_adjustment?.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-semibold">
                                  ₹{variant.total_price?.toLocaleString('en-IN')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
