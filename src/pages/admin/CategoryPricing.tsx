import React, { useState, useEffect } from 'react';
import { IndianRupee, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoomType {
  id: string;
  name: string;
  base_price: number;
}

interface Season {
  id: string;
  name: string;
  color: string;
}

interface DayType {
  id: string;
  name: string;
}

interface SeasonalPrice {
  id?: string;
  season_id: string;
  day_type_id: string;
  price: number;
}

export default function CategoryPricing() {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [existingPrices, setExistingPrices] = useState<SeasonalPrice[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadPricing(selectedRoom);
    }
  }, [selectedRoom]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('room_types')
        .select('id, name, base_price')
        .order('name');

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      // Load seasons
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('id, name, color')
        .eq('is_active', true)
        .order('display_order');

      if (seasonsError) throw seasonsError;
      setSeasons(seasonsData || []);

      // Load day types
      const { data: dayTypesData, error: dayTypesError } = await supabase
        .from('day_types')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');

      if (dayTypesError) throw dayTypesError;
      setDayTypes(dayTypesData || []);

      // Set first room as selected if available
      if (roomsData && roomsData.length > 0) {
        setSelectedRoom(roomsData[0].id);
      }
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

  const loadPricing = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('seasonal_pricing')
        .select('*')
        .eq('room_type_id', roomId);

      if (error) throw error;

      setExistingPrices(data || []);
      
      // Populate prices object
      const pricesObj: Record<string, string> = {};
      data?.forEach((price) => {
        pricesObj[`${price.season_id}_${price.day_type_id}`] = price.price.toString();
      });
      
      setPrices(pricesObj);
    } catch (error) {
      console.error('Error loading pricing:', error);
    }
  };

  const handlePriceChange = (seasonId: string, dayTypeId: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [`${seasonId}_${dayTypeId}`]: value
    }));
  };

  const handleSave = async () => {
    if (!selectedRoom) return;

    try {
      setSaving(true);

      // Prepare upsert data
      const upsertData: any[] = [];
      seasons.forEach((season) => {
        dayTypes.forEach((dayType) => {
          const key = `${season.id}_${dayType.id}`;
          const priceValue = prices[key];
          
          if (priceValue && parseFloat(priceValue) > 0) {
            const existing = existingPrices.find(
              (p) => p.season_id === season.id && p.day_type_id === dayType.id
            );

            upsertData.push({
              id: existing?.id,
              room_type_id: selectedRoom,
              season_id: season.id,
              day_type_id: dayType.id,
              price: parseFloat(priceValue)
            });
          }
        });
      });

      // Upsert all pricing records
      const { error } = await supabase
        .from('seasonal_pricing')
        .upsert(upsertData, {
          onConflict: 'room_type_id,season_id,day_type_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Seasonal pricing saved successfully",
      });

      await loadPricing(selectedRoom);
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

  const getBasePrice = () => {
    const room = rooms.find((r) => r.id === selectedRoom);
    return room?.base_price || 0;
  };

  const applyBasePriceToAll = () => {
    const basePrice = getBasePrice().toString();
    const newPrices: Record<string, string> = {};
    
    seasons.forEach((season) => {
      dayTypes.forEach((dayType) => {
        newPrices[`${season.id}_${dayType.id}`] = basePrice;
      });
    });
    
    setPrices(newPrices);
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
            Configure seasonal and day-type based pricing for each room category
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Room Category</CardTitle>
          <CardDescription>
            Choose a room category to configure its seasonal pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Room Category</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room category" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name} (Base: ₹{room.base_price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={applyBasePriceToAll}>
              Apply Base Price to All
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Pricing Matrix</CardTitle>
            <CardDescription>
              Set prices for each season and day type combination. Leave blank to use base price.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {seasons.map((season) => (
                <div key={season.id} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: season.color }}
                    />
                    <h3 className="font-semibold">{season.name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dayTypes.map((dayType) => {
                      const key = `${season.id}_${dayType.id}`;
                      return (
                        <div key={key} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            {dayType.name}
                          </Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              value={prices[key] || ''}
                              onChange={(e) => handlePriceChange(season.id, dayType.id, e.target.value)}
                              className="pl-9"
                              placeholder={getBasePrice().toString()}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6 pt-6 border-t">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Pricing'}
              </Button>
              <Button variant="outline" onClick={() => loadPricing(selectedRoom)}>
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pricing Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">🗓️ Seasons</h4>
            <p className="text-muted-foreground">
              Configure season date ranges in <strong>Season Rules</strong>. Each season can have different pricing strategies.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">📅 Day Types</h4>
            <ul className="text-muted-foreground space-y-1 ml-4">
              <li>• <strong>Weekday:</strong> Monday to Thursday</li>
              <li>• <strong>Weekend:</strong> Friday to Sunday</li>
              <li>• <strong>Holiday:</strong> Public holidays (configured in Season Rules)</li>
              <li>• <strong>Long Weekend:</strong> Extended weekends with holidays</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">💡 Pricing Strategy</h4>
            <p className="text-muted-foreground">
              Set higher rates for peak season weekends and holidays. Offer lower rates for off-peak weekdays to maximize occupancy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}