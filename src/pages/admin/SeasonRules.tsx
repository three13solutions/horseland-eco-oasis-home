import React, { useState, useEffect } from 'react';
import { CalendarRange, Edit, Save, X, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import YearCalendarView from '@/components/admin/YearCalendarView';

export default function SeasonRules() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    is_long_weekend: false,
    description: ''
  });
  const { toast } = useToast();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadData();
  }, [currentYear]);

  const loadData = async () => {
    try {
      // Load seasons with their periods filtered by current year
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
          season_periods(*)
        `)
        .order('display_order');

      if (seasonsError) throw seasonsError;
      
      // Filter periods by current year on the client side
      const seasonsWithYearPeriods = seasonsData?.map(season => ({
        ...season,
        season_periods: season.season_periods?.filter((p: any) => p.year === currentYear) || []
      })) || [];
      
      setSeasons(seasonsWithYearPeriods);

      // Load holidays for the current year and next year
      const { data: holidaysData, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .gte('year', currentYear)
        .lte('year', currentYear + 1)
        .order('date');

      if (holidaysError) throw holidaysError;
      setHolidays(holidaysData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load season rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSeason = async (season: any) => {
    try {
      const { error } = await supabase
        .from('seasons')
        .update({
          name: season.name,
          description: season.description,
          color: season.color
        })
        .eq('id', season.id);

      if (error) throw error;

      await loadData();
      setEditingSeasonId(null);
      toast({
        title: "Success",
        description: "Season updated successfully",
      });
    } catch (error) {
      console.error('Error saving season:', error);
      toast({
        title: "Error",
        description: "Failed to save season",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePeriod = async (periodId: string, field: string, value: number) => {
    try {
      const { error } = await supabase
        .from('season_periods')
        .update({ [field]: value })
        .eq('id', periodId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating period:', error);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast({
        title: "Error",
        description: "Please fill in holiday name and date",
        variant: "destructive",
      });
      return;
    }

    try {
      const year = new Date(newHoliday.date).getFullYear();
      const { error } = await supabase
        .from('holidays')
        .insert({
          ...newHoliday,
          year
        });

      if (error) throw error;

      setNewHoliday({ name: '', date: '', is_long_weekend: false, description: '' });
      await loadData();
      toast({
        title: "Success",
        description: "Holiday added successfully",
      });
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast({
        title: "Error",
        description: "Failed to add holiday",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadData();
      toast({
        title: "Success",
        description: "Holiday deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast({
        title: "Error",
        description: "Failed to delete holiday",
        variant: "destructive",
      });
    }
  };

  const formatDateRange = (period: any) => {
    return `${monthNames[period.start_month - 1]} ${period.start_day} - ${monthNames[period.end_month - 1]} ${period.end_day}`;
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
          <h1 className="text-3xl font-bold tracking-tight">Season Rules & Holidays</h1>
          <p className="text-muted-foreground mt-2">
            Configure seasonal periods and holidays for dynamic pricing
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <YearCalendarView 
            seasons={seasons} 
            holidays={holidays} 
            year={currentYear}
            onUpdate={loadData}
            onYearChange={setCurrentYear}
          />
        </TabsContent>

        <TabsContent value="seasons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Season Definitions</CardTitle>
              <CardDescription>
                Configure seasonal periods used for pricing across all room categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {seasons.map((season) => {
                const isEditing = editingSeasonId === season.id;
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
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    value={season.name}
                                    onChange={(e) => {
                                      setSeasons(prev => prev.map(s => 
                                        s.id === season.id ? { ...s, name: e.target.value } : s
                                      ));
                                    }}
                                  />
                                  <Textarea
                                    value={season.description || ''}
                                    onChange={(e) => {
                                      setSeasons(prev => prev.map(s => 
                                        s.id === season.id ? { ...s, description: e.target.value } : s
                                      ));
                                    }}
                                    placeholder="Description"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <h3 className="font-semibold text-lg">{season.name}</h3>
                                  <p className="text-sm text-muted-foreground">{season.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setEditingSeasonId(null);
                                  loadData();
                                }}>
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleSaveSeason(season)}>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditingSeasonId(season.id)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {season.season_periods?.map((period: any) => (
                            <div key={period.id} className="border rounded-lg p-4 space-y-3">
                              {isEditing ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <div className="flex gap-2">
                                      <Select
                                        value={period.start_month.toString()}
                                        onValueChange={(v) => handleUpdatePeriod(period.id, 'start_month', parseInt(v))}
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
                                        value={period.start_day}
                                        onChange={(e) => handleUpdatePeriod(period.id, 'start_day', parseInt(e.target.value) || 1)}
                                        className="w-20"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <div className="flex gap-2">
                                      <Select
                                        value={period.end_month.toString()}
                                        onValueChange={(v) => handleUpdatePeriod(period.id, 'end_month', parseInt(v))}
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
                                        value={period.end_day}
                                        onChange={(e) => handleUpdatePeriod(period.id, 'end_day', parseInt(e.target.value) || 1)}
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
              <CardTitle>Day Types</CardTitle>
              <CardDescription>
                Pricing is configured for two day types: Weekday (Mon-Thu) and Weekend (Fri-Sun + Holidays)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">M-T</span>
                  </div>
                  <div>
                    <div className="font-medium">Weekday Pricing</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      Applied to Monday through Thursday bookings
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">F-S</span>
                  </div>
                  <div>
                    <div className="font-medium">Weekend Pricing</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      Applied to Friday through Sunday, plus all holidays and long weekends configured below
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Configure pricing for each combination in <strong>Category Pricing</strong> section.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Holiday</CardTitle>
              <CardDescription>
                Add public holidays and special dates for dynamic pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Holiday Name</Label>
                  <Input
                    placeholder="e.g., Diwali, Christmas"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Additional details about this holiday"
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="long-weekend"
                  checked={newHoliday.is_long_weekend}
                  onCheckedChange={(checked) => 
                    setNewHoliday({ ...newHoliday, is_long_weekend: checked as boolean })
                  }
                />
                <Label htmlFor="long-weekend" className="cursor-pointer">
                  This is a long weekend (3+ days)
                </Label>
              </div>
              <Button onClick={handleAddHoliday}>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
              <CardDescription>
                Manage holidays for dynamic pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {holidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No holidays configured yet
                  </p>
                ) : (
                  holidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(holiday.date).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                            {holiday.is_long_weekend && (
                              <Badge variant="secondary" className="ml-2">Long Weekend</Badge>
                            )}
                          </div>
                          {holiday.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {holiday.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteHoliday(holiday.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}