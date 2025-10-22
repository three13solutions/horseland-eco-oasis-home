import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface RateCardEntry {
  date: string;
  day_type_id: string | null;
  season_id: string | null;
  base_price: number;
  final_price: number;
  rules_applied: any[];
}

export function RateCardPreviewTab() {
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [viewMonth, setViewMonth] = useState(new Date());

  const { data: roomTypes = [] } = useQuery<any[]>({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('room_types')
        .select('id, name')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const startDate = startOfMonth(viewMonth);
  const endDate = endOfMonth(viewMonth);

  const { data: rateCard = [], isLoading } = useQuery<RateCardEntry[]>({
    queryKey: ['rate-card', selectedRoomType, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!selectedRoomType) return [];
      
      const { data, error } = await supabase
        .from('rate_card_cache')
        .select('*')
        .eq('room_type_id', selectedRoomType)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as RateCardEntry[];
    },
    enabled: !!selectedRoomType,
  });

  const { data: seasons = [] } = useQuery<any[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: dayTypes = [] } = useQuery<any[]>({
    queryKey: ['day-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_types')
        .select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const getSeasonName = (seasonId: string | null) => {
    if (!seasonId) return '-';
    return seasons.find(s => s.id === seasonId)?.name || '-';
  };

  const getDayTypeName = (dayTypeId: string | null) => {
    if (!dayTypeId) return '-';
    return dayTypes.find(d => d.id === dayTypeId)?.name || '-';
  };

  const previousMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rate Card Preview</CardTitle>
            <CardDescription>View computed pricing across dates and room types</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={previousMonth}>
                Previous
              </Button>
              <div className="flex items-center justify-center flex-1 border rounded-md px-3">
                <Calendar className="h-4 w-4 mr-2" />
                {format(viewMonth, 'MMMM yyyy')}
              </div>
              <Button variant="outline" onClick={nextMonth}>
                Next
              </Button>
            </div>
          </div>
        </div>

        {!selectedRoomType ? (
          <p className="text-muted-foreground text-center py-8">Please select a room type to view rates</p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading rates...</p>
        ) : rateCard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No rate card data available for this period.</p>
            <p className="text-sm text-muted-foreground">
              Rate cards are auto-computed based on your pricing rules. Make sure base prices and rules are configured.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Day Type</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Final Price</TableHead>
                  <TableHead className="text-right">Adjustment</TableHead>
                  <TableHead>Rules Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateCard.map((entry) => {
                  const adjustment = entry.final_price - entry.base_price;
                  const adjustmentPercent = entry.base_price > 0 
                    ? ((adjustment / entry.base_price) * 100).toFixed(1)
                    : '0';

                  return (
                    <TableRow key={entry.date}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{format(new Date(entry.date), 'EEE')}</TableCell>
                      <TableCell>{getSeasonName(entry.season_id)}</TableCell>
                      <TableCell>{getDayTypeName(entry.day_type_id)}</TableCell>
                      <TableCell className="text-right">₹{entry.base_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">₹{entry.final_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={adjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {adjustment >= 0 ? '+' : ''}₹{adjustment.toFixed(2)}
                          <span className="text-xs ml-1">({adjustmentPercent}%)</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {entry.rules_applied && entry.rules_applied.length > 0 ? (
                            entry.rules_applied.map((rule: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {rule.type || rule.rule_type || 'Rule'}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
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
  );
}
