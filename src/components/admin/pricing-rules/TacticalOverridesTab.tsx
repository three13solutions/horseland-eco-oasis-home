import { useState, useMemo, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay, addDays } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';

type StatusFilter = 'all' | 'active' | 'expired' | 'upcoming';

interface RateScenario {
  key: string;
  label: string;
  nights: number;
  adults: number;
  children: number;
  currentRate: number | null;
  overrideRate: string;
}

interface FormData {
  reason: string;
  start_date: string;
  end_date: string;
  selected_room_types: string[];
  room_unit_id: string;
  meal_plan_code: string;
  is_active: boolean;
  scenarios: RateScenario[];
}

const defaultScenarios: Omit<RateScenario, 'currentRate' | 'overrideRate'>[] = [
  { key: '1n_double', label: '1 Night - Double Occupancy', nights: 1, adults: 2, children: 0 },
  { key: '2n_double', label: '2 Nights - Double Occupancy', nights: 2, adults: 2, children: 0 },
  { key: '1n_single', label: '1 Night - Single Occupancy', nights: 1, adults: 1, children: 0 },
  { key: '1n_extra_adult', label: '1 Night - With Extra Adult', nights: 1, adults: 3, children: 0 },
  { key: '1n_with_child', label: '1 Night - With 1 Child', nights: 1, adults: 2, children: 1 },
];

const initialFormData: FormData = {
  reason: '',
  start_date: '',
  end_date: '',
  selected_room_types: [],
  room_unit_id: '',
  meal_plan_code: '',
  is_active: true,
  scenarios: defaultScenarios.map(s => ({ ...s, currentRate: null, overrideRate: '' }))
};

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

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

  const { data: roomUnits } = useQuery({
    queryKey: ['room-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_units').select('id, unit_number, room_type_id');
      if (error) throw error;
      return data;
    }
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('meal_plan_rules').select('plan_code, plan_name').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const today = startOfDay(new Date());

  // Fetch current calculated rates when room type and dates change
  useEffect(() => {
    const fetchCurrentRates = async () => {
      if (!formData.selected_room_types.length || !formData.start_date) return;
      
      setIsLoadingRates(true);
      try {
        const roomTypeId = formData.selected_room_types[0];
        const checkIn = new Date(formData.start_date);
        
        const updatedScenarios = await Promise.all(
          formData.scenarios.map(async (scenario) => {
            const checkOut = addDays(checkIn, scenario.nights);
            
            const { data, error } = await supabase.rpc('calculate_rate_variants', {
              p_room_type_id: roomTypeId,
              p_check_in: format(checkIn, 'yyyy-MM-dd'),
              p_check_out: format(checkOut, 'yyyy-MM-dd'),
              p_adults_count: scenario.adults,
              p_children_count: scenario.children,
              p_infants_count: 0,
              p_booking_channel: 'direct'
            });
            
            if (error || !data || !Array.isArray(data) || data.length === 0) {
              return { ...scenario, currentRate: null };
            }
            
            // Find the matching meal plan rate or use first one
            const variants = data as any[];
            const matchingVariant = formData.meal_plan_code 
              ? variants.find(v => v.meal_plan_code === formData.meal_plan_code)
              : variants[0];
            
            return { 
              ...scenario, 
              currentRate: matchingVariant ? Math.round(matchingVariant.total_price) : null 
            };
          })
        );
        
        setFormData(prev => ({ ...prev, scenarios: updatedScenarios }));
      } catch (err) {
        console.error('Error fetching rates:', err);
      } finally {
        setIsLoadingRates(false);
      }
    };
    
    if (formData.selected_room_types.length === 1 && formData.start_date && !editingRule) {
      fetchCurrentRates();
    }
  }, [formData.selected_room_types[0], formData.start_date, formData.meal_plan_code]);

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
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('tactical_overrides').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Override updated');
      setIsDialogOpen(false);
      resetForm();
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

  const handleRoomTypeToggle = (roomTypeId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_room_types: prev.selected_room_types.includes(roomTypeId)
        ? prev.selected_room_types.filter(id => id !== roomTypeId)
        : [...prev.selected_room_types, roomTypeId],
      room_unit_id: '',
      scenarios: defaultScenarios.map(s => ({ ...s, currentRate: null, overrideRate: '' }))
    }));
  };

  const handleSelectAllRoomTypes = () => {
    if (formData.selected_room_types.length === roomTypes?.length) {
      setFormData(prev => ({ ...prev, selected_room_types: [], room_unit_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, selected_room_types: roomTypes?.map(t => t.id) || [], room_unit_id: '' }));
    }
  };

  const handleScenarioRateChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      scenarios: prev.scenarios.map(s => 
        s.key === key ? { ...s, overrideRate: value } : s
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get scenarios with override rates filled in
    const scenariosWithRates = formData.scenarios.filter(s => s.overrideRate);
    
    if (scenariosWithRates.length === 0) {
      toast.error('Please enter at least one override rate');
      return;
    }

    if (editingRule) {
      // For editing, use the first scenario's rate
      const scenario = scenariosWithRates[0];
      updateMutation.mutate({ 
        id: editingRule.id, 
        data: {
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date,
          room_type_id: formData.selected_room_types[0] || null,
          room_unit_id: formData.room_unit_id || null,
          meal_plan_code: formData.meal_plan_code || null,
          override_price: parseFloat(scenario.overrideRate),
          min_nights: scenario.nights,
          max_nights: scenario.nights,
          min_adults: scenario.adults,
          max_adults: scenario.adults,
          min_children: scenario.children > 0 ? scenario.children : null,
          max_children: scenario.children > 0 ? scenario.children : null,
          is_active: formData.is_active
        }
      });
    } else {
      // Create one override per scenario per room type
      const payloads: any[] = [];
      const roomTypeIds = formData.selected_room_types.length > 0 
        ? formData.selected_room_types 
        : [null];

      for (const roomTypeId of roomTypeIds) {
        for (const scenario of scenariosWithRates) {
          payloads.push({
            reason: `${formData.reason} (${scenario.label})`,
            start_date: formData.start_date,
            end_date: formData.end_date,
            room_type_id: roomTypeId,
            room_unit_id: formData.room_unit_id || null,
            meal_plan_code: formData.meal_plan_code || null,
            override_price: parseFloat(scenario.overrideRate),
            min_nights: scenario.nights,
            max_nights: scenario.nights,
            min_adults: scenario.adults,
            max_adults: scenario.adults,
            min_children: scenario.children > 0 ? scenario.children : null,
            max_children: scenario.children > 0 ? scenario.children : null,
            is_active: formData.is_active
          });
        }
      }
      
      createMutation.mutate(payloads);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    // Find matching scenario or use first one
    const matchingScenario = defaultScenarios.find(s => 
      s.nights === rule.min_nights && s.adults === rule.min_adults
    ) || defaultScenarios[0];
    
    setFormData({
      reason: rule.reason.replace(/ \([^)]+\)$/, ''), // Remove scenario suffix
      start_date: rule.start_date,
      end_date: rule.end_date,
      selected_room_types: rule.room_type_id ? [rule.room_type_id] : [],
      room_unit_id: rule.room_unit_id || '',
      meal_plan_code: rule.meal_plan_code || '',
      is_active: rule.is_active,
      scenarios: defaultScenarios.map(s => ({
        ...s,
        currentRate: null,
        overrideRate: s.key === matchingScenario.key ? rule.override_price?.toString() || '' : ''
      }))
    });
    setIsDialogOpen(true);
  };

  const getConditionsSummary = (rule: any) => {
    const conditions: string[] = [];
    if (rule.min_nights && rule.max_nights && rule.min_nights === rule.max_nights) {
      conditions.push(`${rule.min_nights}N`);
    } else if (rule.min_nights || rule.max_nights) {
      conditions.push(`${rule.min_nights || 1}-${rule.max_nights || '∞'}N`);
    }
    if (rule.min_adults) {
      conditions.push(`${rule.min_adults}A`);
    }
    if (rule.min_children) {
      conditions.push(`${rule.min_children}C`);
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit' : 'Add'} Tactical Override</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Reason / Event Name</Label>
                <Input placeholder="e.g., Diwali Special, New Year Package" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Room Type Selection */}
                <div className="space-y-2">
                  <Label>Room Category</Label>
                  {editingRule ? (
                    <Select 
                      value={formData.selected_room_types[0] || '__all__'} 
                      onValueChange={(value) => setFormData({ ...formData, selected_room_types: value === '__all__' ? [] : [value], room_unit_id: '' })}
                    >
                      <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Categories</SelectItem>
                        {roomTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select 
                      value={formData.selected_room_types.length === 1 ? formData.selected_room_types[0] : '__all__'} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        selected_room_types: value === '__all__' ? [] : [value], 
                        room_unit_id: '',
                        scenarios: defaultScenarios.map(s => ({ ...s, currentRate: null, overrideRate: '' }))
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select room category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Categories</SelectItem>
                        {roomTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Meal Plan Selection */}
                <div className="space-y-2">
                  <Label>Meal Plan</Label>
                  <Select value={formData.meal_plan_code || '__all__'} onValueChange={(value) => setFormData({ ...formData, meal_plan_code: value === '__all__' ? '' : value })}>
                    <SelectTrigger><SelectValue placeholder="All meal plans" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Meal Plans</SelectItem>
                      {mealPlans?.map((plan) => (
                        <SelectItem key={plan.plan_code} value={plan.plan_code}>{plan.plan_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rate Entry Table */}
              <div className="space-y-2">
                <Label>Override Rates</Label>
                <p className="text-xs text-muted-foreground">Enter override prices. Leave blank for scenarios you don't want to override.</p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="h-9">Scenario</TableHead>
                        <TableHead className="h-9 text-right w-32">Current Rate</TableHead>
                        <TableHead className="h-9 text-right w-36">Override Rate (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.scenarios.map((scenario) => (
                        <TableRow key={scenario.key}>
                          <TableCell className="py-2 font-medium text-sm">{scenario.label}</TableCell>
                          <TableCell className="py-2 text-right">
                            {isLoadingRates ? (
                              <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                            ) : scenario.currentRate !== null ? (
                              <span className="text-muted-foreground">₹{scenario.currentRate.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="Enter rate"
                              className="h-8 text-right"
                              value={scenario.overrideRate}
                              onChange={(e) => handleScenarioRateChange(scenario.key, e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {formData.selected_room_types.length !== 1 && (
                  <p className="text-xs text-amber-600">Select a specific room category to see current calculated rates</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                <Label>Active</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  {editingRule ? 'Update' : 'Create Overrides'}
                </Button>
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
            <TableHead className="h-9">Scope</TableHead>
            <TableHead className="h-9">Conditions</TableHead>
            <TableHead className="h-9">Override</TableHead>
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
                    title="No Tactical Overrides Defined"
                    description="Create manual price overrides for special situations like events, maintenance, or flash sales."
                    examples={[
                      "Premium pricing for festival weekends",
                      "Discounts during renovation periods",
                      "Special event packages with fixed rates"
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
                  <TableCell className="py-2.5 font-medium">{rule.reason}</TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">
                    {format(new Date(rule.start_date), 'MMM dd')} - {format(new Date(rule.end_date), 'MMM dd, yy')}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {rule.room_units?.unit_number || rule.room_types?.name || 'All'}
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
                    <Badge variant="outline" className="font-mono">
                      {rule.override_price ? `₹${rule.override_price.toLocaleString()}` : `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_type === 'percentage' ? `${rule.adjustment_value}%` : `₹${rule.adjustment_value}`}`}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
