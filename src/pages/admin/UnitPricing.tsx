import React, { useState, useEffect } from 'react';
import { HomeIcon, Save, X, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomPricing {
  peak?: number;
  shoulder?: number;
  monsoon?: number;
  off_peak?: number;
}

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name: string | null;
  custom_pricing: CustomPricing | null;
  room_types: {
    name: string;
    base_price: number;
    seasonal_pricing?: CustomPricing;
  } | null;
}

export default function UnitPricing() {
  const [units, setUnits] = useState<RoomUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [pricing, setPricing] = useState<CustomPricing>({});
  const { toast } = useToast();

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('room_units')
        .select(`
          id,
          unit_number,
          unit_name,
          custom_pricing,
          room_types (
            name,
            base_price,
            seasonal_pricing
          )
        `)
        .eq('is_active', true)
        .order('unit_number');

      if (error) throw error;
      setUnits((data || []) as RoomUnit[]);
    } catch (error) {
      console.error('Error loading units:', error);
      toast({
        title: "Error",
        description: "Failed to load room units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unit: RoomUnit) => {
    setEditingUnit(unit.id);
    setPricing(unit.custom_pricing || {});
  };

  const handleCancel = () => {
    setEditingUnit(null);
    setPricing({});
  };

  const handleSave = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('room_units')
        .update({ custom_pricing: pricing as any })
        .eq('id', unitId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Unit pricing updated successfully",
      });

      setEditingUnit(null);
      setPricing({});
      loadUnits();
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Error",
        description: "Failed to update unit pricing",
        variant: "destructive",
      });
    }
  };

  const handleClearPricing = async (unitId: string) => {
    try {
      const { error } = await supabase
        .from('room_units')
        .update({ custom_pricing: null })
        .eq('id', unitId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom pricing removed. Unit will use category pricing.",
      });

      loadUnits();
    } catch (error) {
      console.error('Error clearing pricing:', error);
      toast({
        title: "Error",
        description: "Failed to clear custom pricing",
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

  const getDisplayPrice = (unit: RoomUnit, season: keyof CustomPricing) => {
    if (unit.custom_pricing?.[season]) {
      return unit.custom_pricing[season];
    }
    if (unit.room_types?.seasonal_pricing?.[season]) {
      return unit.room_types.seasonal_pricing[season];
    }
    return unit.room_types?.base_price || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unit Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Set custom prices for individual room units that override category pricing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit-Specific Pricing</CardTitle>
          <CardDescription>
            Custom prices override the default category pricing. Leave blank to use category pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {units.map((unit) => (
              <div key={unit.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HomeIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">
                        {unit.unit_name || `Unit ${unit.unit_number}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {unit.room_types?.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingUnit === unit.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(unit.id)}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        {unit.custom_pricing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClearPricing(unit.id)}
                          >
                            Clear Custom Pricing
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleEdit(unit)}
                        >
                          {unit.custom_pricing ? 'Edit' : 'Set Custom Pricing'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingUnit === unit.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    {(['peak', 'shoulder', 'monsoon', 'off_peak'] as const).map((season) => (
                      <div key={season}>
                        <Label htmlFor={`${unit.id}-${season}`} className="capitalize">
                          {season.replace('_', ' ')} Season
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`${unit.id}-${season}`}
                            type="number"
                            placeholder={`${getDisplayPrice(unit, season)}`}
                            value={pricing[season] || ''}
                            onChange={(e) => setPricing({
                              ...pricing,
                              [season]: e.target.value ? Number(e.target.value) : undefined
                            })}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Default: ₹{getDisplayPrice(unit, season)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    {(['peak', 'shoulder', 'monsoon', 'off_peak'] as const).map((season) => (
                      <div key={season}>
                        <div className="text-xs text-muted-foreground capitalize">
                          {season.replace('_', ' ')}
                        </div>
                        <div className="font-semibold flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {getDisplayPrice(unit, season)}
                          {unit.custom_pricing?.[season] && (
                            <span className="text-xs text-primary ml-1">(Custom)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {units.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No room units found. Create room units first in Room Management.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
