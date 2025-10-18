import React, { useState, useEffect } from 'react';
import { IndianRupee, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RoomType {
  id: string;
  name: string;
  base_price: number;
}

interface Season {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface DayType {
  id: string;
  name: string;
  slug: string;
}

interface PriceData {
  [roomId: string]: {
    [key: string]: string; // key format: seasonSlug_dayTypeSlug
  };
}

export default function CategoryPricing() {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('room_types')
        .select('id, name, base_price')
        .eq('is_published', true)
        .order('name');

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Load seasons
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, slug, color')
        .eq('is_active', true)
        .order('display_order');

      if (seasonsError) throw seasonsError;
      setSeasons(seasonsData || []);

      // Load day types (should only be weekday and weekend now)
      const { data: dayTypesData, error: dayTypesError } = await supabase
        .from('day_types')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order');

      if (dayTypesError) throw dayTypesError;
      setDayTypes(dayTypesData || []);

      // Load all pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('seasonal_pricing')
        .select(`
          *,
          season:seasons(slug),
          day_type:day_types(slug)
        `);

      if (pricingError) throw pricingError;

      // Organize pricing data by room
      const pricesObj: PriceData = {};
      roomsData?.forEach((room) => {
        pricesObj[room.id] = {};
      });

      pricingData?.forEach((price: any) => {
        const roomId = price.room_type_id;
        const key = `${price.season.slug}_${price.day_type.slug}`;
        if (pricesObj[roomId]) {
          pricesObj[roomId][key] = price.price.toString();
        }
      });

      setPrices(pricesObj);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (roomId: string, seasonSlug: string, dayTypeSlug: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [`${seasonSlug}_${dayTypeSlug}`]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // Prepare all upsert data
      const upsertData: any[] = [];

      rooms.forEach((room) => {
        seasons.forEach((season) => {
          dayTypes.forEach((dayType) => {
            const key = `${season.slug}_${dayType.slug}`;
            const priceValue = prices[room.id]?.[key];
            
            if (priceValue && parseFloat(priceValue) > 0) {
              upsertData.push({
                room_type_id: room.id,
                season_id: season.id,
                day_type_id: dayType.id,
                price: parseFloat(priceValue)
              });
            }
          });
        });
      });

      // Upsert all pricing records
      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('seasonal_pricing')
          .upsert(upsertData, {
            onConflict: 'room_type_id,season_id,day_type_id'
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "All pricing saved successfully",
      });

      await loadData();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getColumnHeader = (season: Season, dayType: DayType) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: season.color }}
          />
          <span className="font-semibold">{season.name}</span>
        </div>
        <div className="text-xs text-muted-foreground font-normal">
          {dayType.name}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Configure seasonal pricing for all room categories
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Matrix</CardTitle>
          <CardDescription>
            Set weekday and weekend prices for each season. Weekend rates apply to Fri-Sun and all holidays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] font-semibold">Room Category</TableHead>
                  {seasons.flatMap((season) =>
                    dayTypes.map((dayType) => (
                      <TableHead key={`${season.id}_${dayType.id}`} className="text-center">
                        {getColumnHeader(season, dayType)}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{room.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Base: ₹{room.base_price.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </TableCell>
                    {seasons.flatMap((season) =>
                      dayTypes.map((dayType) => {
                        const key = `${season.slug}_${dayType.slug}`;
                        return (
                          <TableCell key={`${season.id}_${dayType.id}`} className="p-2">
                            <div className="relative">
                              <IndianRupee className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="100"
                                value={prices[room.id]?.[key] || ''}
                                onChange={(e) => 
                                  handlePriceChange(room.id, season.slug, dayType.slug, e.target.value)
                                }
                                className="pl-7 h-9 text-sm"
                                placeholder={room.base_price.toString()}
                              />
                            </div>
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">📅 Day Types</h4>
            <ul className="text-muted-foreground space-y-1 ml-4">
              <li>• <strong>Weekday:</strong> Monday to Thursday</li>
              <li>• <strong>Weekend:</strong> Friday to Sunday + All holidays and long weekends</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">🗓️ Seasons</h4>
            <p className="text-muted-foreground">
              Season date ranges are configured in <strong>Season Rules</strong>. Holidays are automatically priced as weekend rates.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">💡 Pricing Strategy</h4>
            <p className="text-muted-foreground">
              Set higher rates for peak season weekends to maximize revenue during high demand. Offer competitive weekday rates to maintain occupancy throughout the week.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}