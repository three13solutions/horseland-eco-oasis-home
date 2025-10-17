import React, { useState, useEffect } from 'react';
import { CalendarRange, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface SeasonPeriod {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

interface SeasonDefinition {
  id: string;
  name: string;
  periods: SeasonPeriod[];
  color: string;
  description: string;
}

const defaultSeasons: SeasonDefinition[] = [
  {
    id: 'peak',
    name: 'Peak Season',
    periods: [
      { startMonth: 10, startDay: 1, endMonth: 2, endDay: 28 }
    ],
    color: 'hsl(var(--destructive))',
    description: 'High demand period with best weather and festivals'
  },
  {
    id: 'shoulder',
    name: 'Shoulder Season',
    periods: [
      { startMonth: 3, startDay: 1, endMonth: 5, endDay: 31 },
      { startMonth: 9, startDay: 1, endMonth: 9, endDay: 30 }
    ],
    color: 'hsl(var(--warning))',
    description: 'Moderate demand with pleasant weather'
  },
  {
    id: 'off_peak',
    name: 'Off-Peak Season',
    periods: [
      { startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 }
    ],
    color: 'hsl(var(--success))',
    description: 'Lower demand period, often with special rates'
  }
];

export default function SeasonPricing() {
  const [seasons, setSeasons] = useState<SeasonDefinition[]>(defaultSeasons);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSeasons, setEditingSeasons] = useState<SeasonDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadSeasonDefinitions();
  }, []);

  const loadSeasonDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'season_definitions')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value && Array.isArray(data.setting_value)) {
        setSeasons(data.setting_value as unknown as SeasonDefinition[]);
      }
    } catch (error) {
      console.error('Error loading season definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'season_definitions',
          setting_value: editingSeasons as any
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setSeasons(editingSeasons);
      setEditingId(null);
      toast({
        title: "Success",
        description: "Season definitions updated successfully",
      });
    } catch (error) {
      console.error('Error saving season definitions:', error);
      toast({
        title: "Error",
        description: "Failed to save season definitions",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (seasonId: string) => {
    setEditingId(seasonId);
    setEditingSeasons(JSON.parse(JSON.stringify(seasons)));
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingSeasons([]);
  };

  const updatePeriod = (seasonId: string, periodIndex: number, field: keyof SeasonPeriod, value: number) => {
    setEditingSeasons(prev => prev.map(season => {
      if (season.id === seasonId) {
        const newPeriods = [...season.periods];
        newPeriods[periodIndex] = { ...newPeriods[periodIndex], [field]: value };
        return { ...season, periods: newPeriods };
      }
      return season;
    }));
  };

  const formatDateRange = (period: SeasonPeriod) => {
    return `${monthNames[period.startMonth - 1]} ${period.startDay} - ${monthNames[period.endMonth - 1]} ${period.endDay}`;
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
          <h1 className="text-3xl font-bold tracking-tight">Season Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Define and manage seasonal periods for pricing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Season Definitions</CardTitle>
          <CardDescription>
            Configure seasonal periods used for pricing across all room categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(editingId ? editingSeasons : seasons).map((season) => {
            const isEditing = editingId === season.id;
            return (
              <Card key={season.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full mt-1" 
                          style={{ backgroundColor: season.color }}
                        />
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg">{season.name}</h3>
                            <p className="text-sm text-muted-foreground">{season.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(season.id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {season.periods.map((period, idx) => (
                        <div key={idx} className="border rounded-lg p-4 space-y-3">
                          {isEditing ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Start Date</Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={period.startMonth.toString()}
                                    onValueChange={(v) => updatePeriod(season.id, idx, 'startMonth', parseInt(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {monthNames.map((month, i) => (
                                        <SelectItem key={i} value={(i + 1).toString()}>
                                          {month}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={period.startDay}
                                    onChange={(e) => updatePeriod(season.id, idx, 'startDay', parseInt(e.target.value) || 1)}
                                    className="w-20"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>End Date</Label>
                                <div className="flex gap-2">
                                  <Select
                                    value={period.endMonth.toString()}
                                    onValueChange={(v) => updatePeriod(season.id, idx, 'endMonth', parseInt(v))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {monthNames.map((month, i) => (
                                        <SelectItem key={i} value={(i + 1).toString()}>
                                          {month}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={period.endDay}
                                    onChange={(e) => updatePeriod(season.id, idx, 'endDay', parseInt(e.target.value) || 1)}
                                    className="w-20"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-sm">
                              <CalendarRange className="h-3 w-3 mr-1" />
                              {formatDateRange(period)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Season Definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-1">🎯 Peak Season</h4>
              <p className="text-muted-foreground">
                Highest demand period - festivals, holidays, best weather. Set your premium rates for this period.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">🌤️ Shoulder Season</h4>
              <p className="text-muted-foreground">
                Moderate demand with pleasant weather. Standard rates apply. Can have multiple periods throughout the year.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">💚 Off-Peak Season</h4>
              <p className="text-muted-foreground">
                Lower demand period. Often offered at discounted rates to attract bookings.
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> These season definitions are used throughout the system for pricing. 
              Update them in Category Pricing and Unit Pricing to set rates for each season.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
