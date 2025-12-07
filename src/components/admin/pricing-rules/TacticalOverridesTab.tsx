import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatusFilter = 'all' | 'active' | 'expired' | 'upcoming';

interface RoomCategoryRates {
  roomTypeId: string;
  roomTypeName: string;
  rates: {
    oneNight: {
      double: string;
      extraAdult: string;
      extraChild: string;
    };
    twoNights: {
      double: string;
      extraAdult: string;
      extraChild: string;
    };
  };
}

interface FormData {
  reason: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  selectedRoomTypeIds: string[];
  roomCategoryRates: RoomCategoryRates[];
}

const initialFormData: FormData = {
  reason: '',
  start_date: '',
  end_date: '',
  is_active: true,
  selectedRoomTypeIds: [],
  roomCategoryRates: []
};

const emptyRates = {
  oneNight: { double: '', extraAdult: '', extraChild: '' },
  twoNights: { double: '', extraAdult: '', extraChild: '' }
};

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['tactical-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tactical_overrides')
        .select('*, room_types(name), room_units(unit_number)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: roomTypes } = useQuery({
    queryKey: ['room-types-for-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_types').select('id, name');
      if (error) throw error;
      return data?.filter(rt => rt) || [];
    }
  });


  const today = startOfDay(new Date());

  const getOverrideStatus = (rule: any): 'active' | 'expired' | 'upcoming' | 'inactive' => {
    if (!rule.is_active) return 'inactive';
    const endDate = startOfDay(new Date(rule.end_date));
    const startDate = startOfDay(new Date(rule.start_date));
    if (isBefore(endDate, today)) return 'expired';
    if (isBefore(today, startDate)) return 'upcoming';
    return 'active';
  };

  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (statusFilter === 'all') return rules;
    return rules.filter(rule => {
      const status = getOverrideStatus(rule);
      if (statusFilter === 'active') return status === 'active';
      if (statusFilter === 'expired') return status === 'expired';
      if (statusFilter === 'upcoming') return status === 'upcoming';
      return true;
    });
  }, [rules, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!rules) return { all: 0, active: 0, expired: 0, upcoming: 0 };
    return rules.reduce((acc, rule) => {
      acc.all++;
      const status = getOverrideStatus(rule);
      if (status === 'active') acc.active++;
      else if (status === 'expired') acc.expired++;
      else if (status === 'upcoming') acc.upcoming++;
      return acc;
    }, { all: 0, active: 0, expired: 0, upcoming: 0 });
  }, [rules]);

  const createMutation = useMutation({
    mutationFn: async (dataList: any[]) => {
      const { error } = await supabase.from('tactical_overrides').insert(dataList);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Tactical override(s) created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error('Failed to create overrides');
      console.error(err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tactical_overrides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Override deleted');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tactical_overrides').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Status updated');
    }
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingRule(null);
  };

  const handleRoomTypeToggle = (roomTypeId: string, roomTypeName: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedRoomTypeIds.includes(roomTypeId);
      if (isSelected) {
        return {
          ...prev,
          selectedRoomTypeIds: prev.selectedRoomTypeIds.filter(id => id !== roomTypeId),
          roomCategoryRates: prev.roomCategoryRates.filter(r => r.roomTypeId !== roomTypeId)
        };
      } else {
        return {
          ...prev,
          selectedRoomTypeIds: [...prev.selectedRoomTypeIds, roomTypeId],
          roomCategoryRates: [...prev.roomCategoryRates, {
            roomTypeId,
            roomTypeName,
            rates: { ...emptyRates }
          }]
        };
      }
    });
  };

  const handleSelectAllRoomTypes = () => {
    if (!roomTypes) return;
    if (formData.selectedRoomTypeIds.length === roomTypes.length) {
      setFormData(prev => ({ ...prev, selectedRoomTypeIds: [], roomCategoryRates: [] }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedRoomTypeIds: roomTypes.map(t => t.id),
        roomCategoryRates: roomTypes.map(t => ({
          roomTypeId: t.id,
          roomTypeName: t.name,
          rates: { ...emptyRates }
        }))
      }));
    }
  };

  const updateRoomCategoryRateValue = (
    roomTypeId: string, 
    duration: 'oneNight' | 'twoNights', 
    field: 'double' | 'extraAdult' | 'extraChild', 
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      roomCategoryRates: prev.roomCategoryRates.map(r => 
        r.roomTypeId === roomTypeId 
          ? { ...r, rates: { ...r.rates, [duration]: { ...r.rates[duration], [field]: value } } }
          : r
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.roomCategoryRates.length === 0) {
      toast.error('Please select at least one room category');
      return;
    }

    const payloads: any[] = [];
    
    // Default meal plan and cancellation policy for all overrides
    const defaultMealPlanCode = 'all_meals_inclusive';
    const defaultCancellationPolicy = 'refundable_credit';
    
    for (const categoryRate of formData.roomCategoryRates) {
      const { rates, roomTypeId } = categoryRate;
      
      // 1 Night - Double Occupancy (base rate)
      if (rates.oneNight.double) {
        payloads.push({
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          override_price: parseFloat(rates.oneNight.double),
          min_nights: 1,
          max_nights: 1,
          min_adults: 2,
          max_adults: 2,
          occupancy_type: 'double',
          is_active: formData.is_active
        });
      }
      
      // 2 Nights - Double Occupancy (base rate)
      if (rates.twoNights.double) {
        payloads.push({
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          override_price: parseFloat(rates.twoNights.double),
          min_nights: 2,
          max_nights: 2,
          min_adults: 2,
          max_adults: 2,
          occupancy_type: 'double',
          is_active: formData.is_active
        });
      }
      
      // Extra Adult charges (from 3rd guest onwards)
      if (rates.oneNight.extraAdult) {
        payloads.push({
          reason: `${formData.reason} - Extra Adult`,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rates.oneNight.extraAdult),
          min_nights: 1,
          max_nights: 1,
          min_adults: 3,
          occupancy_type: 'extra_adult',
          is_active: formData.is_active
        });
      }
      
      if (rates.twoNights.extraAdult) {
        payloads.push({
          reason: `${formData.reason} - Extra Adult`,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rates.twoNights.extraAdult),
          min_nights: 2,
          max_nights: 2,
          min_adults: 3,
          occupancy_type: 'extra_adult',
          is_active: formData.is_active
        });
      }
      
      // Extra Child charges (from 3rd guest onwards)
      if (rates.oneNight.extraChild) {
        payloads.push({
          reason: `${formData.reason} - Extra Child`,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rates.oneNight.extraChild),
          min_nights: 1,
          max_nights: 1,
          min_children: 1,
          occupancy_type: 'extra_child',
          is_active: formData.is_active
        });
      }
      
      if (rates.twoNights.extraChild) {
        payloads.push({
          reason: `${formData.reason} - Extra Child`,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: roomTypeId,
          meal_plan_code: defaultMealPlanCode,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rates.twoNights.extraChild),
          min_nights: 2,
          max_nights: 2,
          min_children: 1,
          occupancy_type: 'extra_child',
          is_active: formData.is_active
        });
      }
    }
    
    if (payloads.length === 0) {
      toast.error('Please enter at least one rate');
      return;
    }

    createMutation.mutate(payloads);
  };

  const getConditionsSummary = (rule: any) => {
    const conditions: string[] = [];
    if (rule.occupancy_type) {
      const labels: Record<string, string> = {
        single: '1A',
        double: '2A',
        extra_adult: '+Adult',
        extra_child: '+Child'
      };
      conditions.push(labels[rule.occupancy_type] || rule.occupancy_type);
    }
    if (rule.min_nights && rule.max_nights && rule.min_nights === rule.max_nights) {
      conditions.push(`${rule.min_nights}N`);
    }
    if (rule.meal_plan_code) {
      const labels: Record<string, string> = {
        all_meals_inclusive: 'FB',
        breakfast_and_dinner: 'HB',
        room_only: 'RO'
      };
      conditions.push(labels[rule.meal_plan_code] || rule.meal_plan_code);
    }
    return conditions;
  };

  return (
    <div className="space-y-4">
      {/* Header with filters and add button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'active', 'upcoming', 'expired'] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {statusCounts[status]}
              </Badge>
            </Button>
          ))}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Override</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Rate Overrides</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Reason / Event Name</Label>
                  <Input placeholder="e.g., Diwali Special" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
              </div>

              {/* Room Category Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Room Categories</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllRoomTypes}>
                    {formData.selectedRoomTypeIds.length === roomTypes?.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                  {roomTypes?.map((type) => (
                    <label key={type.id} className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={formData.selectedRoomTypeIds.includes(type.id)}
                        onCheckedChange={() => handleRoomTypeToggle(type.id, type.name)}
                      />
                      <span className="text-sm">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rate Cards for each selected room category */}
              {formData.roomCategoryRates.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> All override rates are for <span className="font-medium text-foreground">Full Board (All Meals Inclusive)</span> meal plan with <span className="font-medium text-foreground">Refundable as Credit Voucher</span> cancellation policy. Extra adult/child charges apply from the 3rd guest onwards.
                </div>
              )}

              {formData.roomCategoryRates.map((categoryRate) => (
                <Card key={categoryRate.roomTypeId} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{categoryRate.roomTypeName}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRoomTypeToggle(categoryRate.roomTypeId, categoryRate.roomTypeName)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="h-8 text-xs w-24">Duration</TableHead>
                          <TableHead className="h-8 text-xs text-center">Double Occ (₹)</TableHead>
                          <TableHead className="h-8 text-xs text-center">+Adult/night (₹)</TableHead>
                          <TableHead className="h-8 text-xs text-center">+Child/night (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="py-2 font-medium text-sm">1 Night</TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.oneNight.double}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'oneNight', 'double', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.oneNight.extraAdult}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'oneNight', 'extraAdult', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.oneNight.extraChild}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'oneNight', 'extraChild', e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-2 font-medium text-sm">2 Nights</TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.twoNights.double}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'twoNights', 'double', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.twoNights.extraAdult}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'twoNights', 'extraAdult', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              placeholder="—" 
                              className="h-8 text-center"
                              value={categoryRate.rates.twoNights.extraChild}
                              onChange={(e) => updateRoomCategoryRateValue(categoryRate.roomTypeId, 'twoNights', 'extraChild', e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}

              {formData.selectedRoomTypeIds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Select room categories above to enter override rates
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label>Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Overrides'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9">Reason</TableHead>
            <TableHead className="h-9">Period</TableHead>
            <TableHead className="h-9">Room</TableHead>
            <TableHead className="h-9">Conditions</TableHead>
            <TableHead className="h-9">Rate</TableHead>
            <TableHead className="h-9">Status</TableHead>
            <TableHead className="h-9 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
          ) : filteredRules.length === 0 ? (
            statusFilter !== 'all' && rules && rules.length > 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No {statusFilter} overrides found
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyRuleState
                    icon={Zap}
                    title="No Rate Overrides Defined"
                    description="Create manual price overrides for special events or promotions."
                    examples={[
                      "Festival weekend rates",
                      "Promotional discounts",
                      "Special package pricing"
                    ]}
                    onAddClick={() => setIsDialogOpen(true)}
                  />
                </TableCell>
              </TableRow>
            )
          ) : (
            filteredRules.map((rule) => {
              const status = getOverrideStatus(rule);
              const isExpired = status === 'expired';
              const conditions = getConditionsSummary(rule);
              return (
                <TableRow 
                  key={rule.id} 
                  className={isExpired ? 'opacity-50 bg-muted/30' : ''}
                >
                  <TableCell className="py-2.5 font-medium text-sm">{rule.reason}</TableCell>
                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                    {format(new Date(rule.start_date), 'MMM dd')} - {format(new Date(rule.end_date), 'MMM dd, yy')}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {rule.room_types?.name || 'All'}
                  </TableCell>
                  <TableCell className="py-2.5">
                    {conditions.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {conditions.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className="font-mono text-xs">
                      {rule.override_price 
                        ? `₹${rule.override_price.toLocaleString()}` 
                        : rule.adjustment_value 
                          ? `${rule.adjustment_value > 0 ? '+' : ''}₹${rule.adjustment_value}`
                          : '—'
                      }
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                        }
                        className="scale-90"
                      />
                      <Badge 
                        variant={status === 'active' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {status === 'inactive' ? 'Off' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
