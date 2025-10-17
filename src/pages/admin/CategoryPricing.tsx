import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoomType {
  id: string;
  name: string;
  base_price: number;
  seasonal_pricing: any;
}

export default function CategoryPricing() {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const { toast } = useToast();

  const [seasonalPrices, setSeasonalPrices] = useState({
    peak: '',
    shoulder: '',
    monsoon: '',
    offPeak: ''
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('room_types')
        .select('id, name, base_price, seasonal_pricing')
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load room categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (room: RoomType) => {
    setEditingRoom(room);
    const pricing = room.seasonal_pricing || {};
    setSeasonalPrices({
      peak: pricing.peak?.toString() || room.base_price.toString(),
      shoulder: pricing.shoulder?.toString() || room.base_price.toString(),
      monsoon: pricing.monsoon?.toString() || room.base_price.toString(),
      offPeak: pricing.offPeak?.toString() || room.base_price.toString()
    });
  };

  const handleSave = async () => {
    if (!editingRoom) return;

    try {
      const seasonal_pricing = {
        peak: parseFloat(seasonalPrices.peak) || 0,
        shoulder: parseFloat(seasonalPrices.shoulder) || 0,
        monsoon: parseFloat(seasonalPrices.monsoon) || 0,
        offPeak: parseFloat(seasonalPrices.offPeak) || 0
      };

      const { error } = await supabase
        .from('room_types')
        .update({ seasonal_pricing })
        .eq('id', editingRoom.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Seasonal pricing updated successfully",
      });

      setEditingRoom(null);
      loadRooms();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing",
        variant: "destructive",
      });
    }
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
            Manage seasonal pricing for room categories
          </p>
        </div>
      </div>

      {editingRoom && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Seasonal Pricing - {editingRoom.name}</CardTitle>
            <CardDescription>
              Set different prices for peak, shoulder, monsoon, and off-peak seasons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="peak">Peak Season (₹)</Label>
                <Input
                  id="peak"
                  type="number"
                  value={seasonalPrices.peak}
                  onChange={(e) => setSeasonalPrices({ ...seasonalPrices, peak: e.target.value })}
                  placeholder="Peak season price"
                />
                <p className="text-xs text-muted-foreground mt-1">Oct-Feb, holidays</p>
              </div>
              <div>
                <Label htmlFor="shoulder">Shoulder Season (₹)</Label>
                <Input
                  id="shoulder"
                  type="number"
                  value={seasonalPrices.shoulder}
                  onChange={(e) => setSeasonalPrices({ ...seasonalPrices, shoulder: e.target.value })}
                  placeholder="Shoulder season price"
                />
                <p className="text-xs text-muted-foreground mt-1">Mar-Apr, Sep</p>
              </div>
              <div>
                <Label htmlFor="monsoon">Monsoon Season (₹)</Label>
                <Input
                  id="monsoon"
                  type="number"
                  value={seasonalPrices.monsoon}
                  onChange={(e) => setSeasonalPrices({ ...seasonalPrices, monsoon: e.target.value })}
                  placeholder="Monsoon season price"
                />
                <p className="text-xs text-muted-foreground mt-1">Jun-Aug</p>
              </div>
              <div>
                <Label htmlFor="offPeak">Off-Peak Season (₹)</Label>
                <Input
                  id="offPeak"
                  type="number"
                  value={seasonalPrices.offPeak}
                  onChange={(e) => setSeasonalPrices({ ...seasonalPrices, offPeak: e.target.value })}
                  placeholder="Off-peak season price"
                />
                <p className="text-xs text-muted-foreground mt-1">May</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingRoom(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {rooms.map((room) => {
          const pricing = room.seasonal_pricing || {};
          return (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      {room.name}
                    </CardTitle>
                    <CardDescription>Base Price: ₹{room.base_price}</CardDescription>
                  </div>
                  <Button onClick={() => handleEdit(room)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pricing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Peak Season</div>
                    <div className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {pricing.peak || room.base_price}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Shoulder Season</div>
                    <div className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {pricing.shoulder || room.base_price}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Monsoon Season</div>
                    <div className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {pricing.monsoon || room.base_price}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Off-Peak Season</div>
                    <div className="text-2xl font-bold flex items-center">
                      <IndianRupee className="h-5 w-5 mr-1" />
                      {pricing.offPeak || room.base_price}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No room categories found. Create room types first in Room Management.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
