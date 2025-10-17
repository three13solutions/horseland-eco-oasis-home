import React, { useState, useEffect } from 'react';
import { HomeIcon, Plus, Edit, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name: string | null;
  room_types: {
    name: string;
  } | null;
}

export default function UnitPricing() {
  const [units, setUnits] = useState<RoomUnit[]>([]);
  const [loading, setLoading] = useState(true);
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
          room_types (name)
        `)
        .eq('is_active', true)
        .order('unit_number');

      if (error) throw error;
      setUnits(data || []);
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
          <h1 className="text-3xl font-bold tracking-tight">Unit Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Manage pricing for individual room units (Coming Soon)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unit-Specific Pricing</CardTitle>
          <CardDescription>
            Set custom prices for individual room units that override category pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature allows you to set specific pricing for individual room units. 
              For example, you might charge more for a corner unit with better views, 
              or offer a discount for units that need minor maintenance.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Available Units:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {units.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                    <HomeIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {unit.unit_name || `Unit ${unit.unit_number}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {unit.room_types?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
