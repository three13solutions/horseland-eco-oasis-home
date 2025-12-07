import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Zap, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatusFilter = 'all' | 'active' | 'expired' | 'upcoming';
type OverrideLevel = 'category' | 'room_type' | 'room_unit';

interface RateRow {
  double: string;
  extraAdult: string;
  extraChild: string;
}

interface RoomCategoryRates {
  id: string;
  name: string;
  rates: {
    oneNightWeekday: RateRow;
    oneNightWeekend: RateRow;
    twoNightsWeekday: RateRow;
    twoNightsWeekend: RateRow;
  };
}

interface FormData {
  reason: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  sameRateForAllDays: boolean;
  overrideLevel: OverrideLevel;
  selectedIds: string[];
  categoryRates: RoomCategoryRates[];
}

const initialFormData: FormData = {
  reason: '',
  start_date: '',
  end_date: '',
  is_active: true,
  sameRateForAllDays: true,
  overrideLevel: 'room_type',
  selectedIds: [],
  categoryRates: []
};

const emptyRateRow: RateRow = { double: '', extraAdult: '', extraChild: '' };

const emptyRates = {
  oneNightWeekday: { ...emptyRateRow },
  oneNightWeekend: { ...emptyRateRow },
  twoNightsWeekday: { ...emptyRateRow },
  twoNightsWeekend: { ...emptyRateRow }
};

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showExtraChargesWarning, setShowExtraChargesWarning] = useState(false);
  const [pendingPayloads, setPendingPayloads] = useState<any[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingOverrides, setConflictingOverrides] = useState<any[]>([]);
  const [categoriesMissingCharges, setCategoriesMissingCharges] = useState<string[]>([]);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['tactical-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tactical_overrides')
        .select('*, room_types(name), room_units(unit_number, unit_name), room_categories(name)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: roomCategories } = useQuery({
    queryKey: ['room-categories-for-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_categories').select('id, name').eq('is_active', true).order('display_order');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: roomTypes } = useQuery({
    queryKey: ['room-types-for-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_types').select('id, name, category_id');
      if (error) throw error;
      return data?.filter(rt => rt) || [];
    }
  });

  const { data: roomUnits } = useQuery({
    queryKey: ['room-units-for-overrides'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_units').select('id, unit_number, unit_name, room_type_id, room_types(name)').eq('is_active', true).order('unit_number');
      if (error) throw error;
      return data || [];
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
      setShowConflictDialog(false);
      setConflictingOverrides([]);
      resetForm();
    },
    onError: (err) => {
      toast.error('Failed to create overrides');
      console.error(err);
    }
  });

  const deactivateAndCreateMutation = useMutation({
    mutationFn: async ({ idsToDeactivate, newPayloads }: { idsToDeactivate: string[]; newPayloads: any[] }) => {
      // Deactivate conflicting overrides
      if (idsToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
          .from('tactical_overrides')
          .update({ is_active: false })
          .in('id', idsToDeactivate);
        if (deactivateError) throw deactivateError;
      }
      // Create new overrides
      const { error: insertError } = await supabase.from('tactical_overrides').insert(newPayloads);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Override(s) created successfully');
      setIsDialogOpen(false);
      setShowConflictDialog(false);
      setConflictingOverrides([]);
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

  const handleItemToggle = (id: string, name: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedIds.includes(id);
      if (isSelected) {
        return {
          ...prev,
          selectedIds: prev.selectedIds.filter(i => i !== id),
          categoryRates: prev.categoryRates.filter(r => r.id !== id)
        };
      } else {
        return {
          ...prev,
          selectedIds: [...prev.selectedIds, id],
          categoryRates: [...prev.categoryRates, {
            id,
            name,
            rates: { ...emptyRates }
          }]
        };
      }
    });
  };

  const handleSelectAll = () => {
    const items = getSelectableItems();
    if (!items) return;
    if (formData.selectedIds.length === items.length) {
      setFormData(prev => ({ ...prev, selectedIds: [], categoryRates: [] }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedIds: items.map(t => t.id),
        categoryRates: items.map(t => ({
          id: t.id,
          name: t.name,
          rates: { ...emptyRates }
        }))
      }));
    }
  };

  const getSelectableItems = (): { id: string; name: string }[] | undefined => {
    switch (formData.overrideLevel) {
      case 'category':
        return roomCategories?.map(c => ({ id: c.id, name: c.name }));
      case 'room_type':
        return roomTypes?.map(t => ({ id: t.id, name: t.name }));
      case 'room_unit':
        return roomUnits?.map(u => ({ 
          id: u.id, 
          name: `${u.unit_number}${u.unit_name ? ` - ${u.unit_name}` : ''} (${u.room_types?.name || 'Unknown'})` 
        }));
      default:
        return [];
    }
  };

  const handleOverrideLevelChange = (level: OverrideLevel) => {
    setFormData(prev => ({
      ...prev,
      overrideLevel: level,
      selectedIds: [],
      categoryRates: []
    }));
  };

  const updateRateValue = (
    id: string, 
    duration: 'oneNightWeekday' | 'oneNightWeekend' | 'twoNightsWeekday' | 'twoNightsWeekend', 
    field: 'double' | 'extraAdult' | 'extraChild', 
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      categoryRates: prev.categoryRates.map(r => 
        r.id === id 
          ? { ...r, rates: { ...r.rates, [duration]: { ...r.rates[duration], [field]: value } } }
          : r
      )
    }));
  };

  const checkMissingExtraCharges = (categoryRates: RoomCategoryRates[]): string[] => {
    const categoriesWithMissingCharges: string[] = [];
    
    for (const categoryRate of categoryRates) {
      const { rates, name } = categoryRate;
      const ratesToCheck = formData.sameRateForAllDays 
        ? [rates.oneNightWeekday, rates.twoNightsWeekday]
        : [rates.oneNightWeekday, rates.oneNightWeekend, rates.twoNightsWeekday, rates.twoNightsWeekend];
      
      for (const rateRow of ratesToCheck) {
        if (rateRow.double && (!rateRow.extraAdult || !rateRow.extraChild)) {
          if (!categoriesWithMissingCharges.includes(name)) {
            categoriesWithMissingCharges.push(name);
          }
        }
      }
    }
    
    return categoriesWithMissingCharges;
  };

  const buildPayloads = (): any[] => {
    const payloads: any[] = [];
    
    const defaultMealPlanCode = 'all_meals_inclusive';
    
    const createPayload = (
      targetId: string,
      rateRow: RateRow,
      minNights: number,
      maxNights: number | null,
      dayType: 'weekday' | 'weekend',
      reason: string
    ) => {
      const basePayload: any = {
        reason,
        start_date: formData.start_date,
        end_date: formData.end_date,
        meal_plan_code: defaultMealPlanCode,
        min_nights: minNights,
        max_nights: maxNights,
        day_type: dayType,
        is_active: formData.is_active,
        override_type: 'date_range'
      };

      // Set the correct ID based on override level
      if (formData.overrideLevel === 'category') {
        basePayload.room_category_id = targetId;
      } else if (formData.overrideLevel === 'room_type') {
        basePayload.room_type_id = targetId;
      } else if (formData.overrideLevel === 'room_unit') {
        basePayload.room_unit_id = targetId;
      }

      if (rateRow.double) {
        payloads.push({
          ...basePayload,
          override_price: parseFloat(rateRow.double),
          min_adults: 2,
          max_adults: 2,
          occupancy_type: 'double',
        });
      }
      
      if (rateRow.extraAdult) {
        payloads.push({
          ...basePayload,
          reason: `${reason} - Extra Adult`,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rateRow.extraAdult),
          min_adults: 3,
          occupancy_type: 'extra_adult',
        });
      }
      
      if (rateRow.extraChild) {
        payloads.push({
          ...basePayload,
          reason: `${reason} - Extra Child`,
          adjustment_type: 'fixed',
          adjustment_value: parseFloat(rateRow.extraChild),
          min_children: 1,
          occupancy_type: 'extra_child',
        });
      }
    };
    
    for (const categoryRate of formData.categoryRates) {
      const { rates, id } = categoryRate;
      
      if (formData.sameRateForAllDays) {
        createPayload(id, rates.oneNightWeekday, 1, 1, 'weekday', formData.reason);
        createPayload(id, rates.oneNightWeekday, 1, 1, 'weekend', formData.reason);
        createPayload(id, rates.twoNightsWeekday, 2, null, 'weekday', formData.reason);
        createPayload(id, rates.twoNightsWeekday, 2, null, 'weekend', formData.reason);
      } else {
        createPayload(id, rates.oneNightWeekday, 1, 1, 'weekday', formData.reason);
        createPayload(id, rates.oneNightWeekend, 1, 1, 'weekend', formData.reason);
        createPayload(id, rates.twoNightsWeekday, 2, null, 'weekday', formData.reason);
        createPayload(id, rates.twoNightsWeekend, 2, null, 'weekend', formData.reason);
      }
    }
    
    return payloads;
  };

  const checkForConflicts = async (payloads: any[]): Promise<any[]> => {
    const conflicts: any[] = [];
    
    for (const payload of payloads) {
      let query = supabase
        .from('tactical_overrides')
        .select('*, room_types(name), room_units(unit_number, unit_name), room_categories(name)')
        .eq('is_active', true)
        .lte('start_date', payload.end_date)
        .gte('end_date', payload.start_date);
      
      // Filter by same target
      if (payload.room_category_id) {
        query = query.eq('room_category_id', payload.room_category_id);
      } else if (payload.room_type_id) {
        query = query.eq('room_type_id', payload.room_type_id);
      } else if (payload.room_unit_id) {
        query = query.eq('room_unit_id', payload.room_unit_id);
      }
      
      const { data } = await query;
      
      if (data && data.length > 0) {
        for (const conflict of data) {
          if (!conflicts.find(c => c.id === conflict.id)) {
            conflicts.push(conflict);
          }
        }
      }
    }
    
    return conflicts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.categoryRates.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const payloads = buildPayloads();
    
    if (payloads.length === 0) {
      toast.error('Please enter at least one rate');
      return;
    }

    const missingCharges = checkMissingExtraCharges(formData.categoryRates);
    
    if (missingCharges.length > 0) {
      setCategoriesMissingCharges(missingCharges);
      setPendingPayloads(payloads);
      setShowExtraChargesWarning(true);
      return;
    }

    // Check for conflicts
    const conflicts = await checkForConflicts(payloads);
    
    if (conflicts.length > 0) {
      setConflictingOverrides(conflicts);
      setPendingPayloads(payloads);
      setShowConflictDialog(true);
      return;
    }

    createMutation.mutate(payloads);
  };

  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflictingOverrides([]);
    setPendingPayloads([]);
  };

  const handleConflictCreateAnyway = () => {
    // New override will take precedence due to created_at
    createMutation.mutate(pendingPayloads);
  };

  const handleConflictKeepHigherPrice = () => {
    // Compare prices and deactivate lower ones
    const idsToDeactivate: string[] = [];
    const newMaxPrice = Math.max(...pendingPayloads.filter(p => p.override_price).map(p => p.override_price));
    
    for (const conflict of conflictingOverrides) {
      if (conflict.override_price && conflict.override_price < newMaxPrice) {
        idsToDeactivate.push(conflict.id);
      } else if (conflict.override_price && conflict.override_price >= newMaxPrice) {
        // Existing has higher price, don't create the new ones with lower price
        toast.info('Existing override has higher or equal price, keeping it active');
        setShowConflictDialog(false);
        setConflictingOverrides([]);
        setPendingPayloads([]);
        return;
      }
    }
    
    deactivateAndCreateMutation.mutate({ idsToDeactivate, newPayloads: pendingPayloads });
  };

  const handleConfirmWithDynamicPricing = () => {
    createMutation.mutate(pendingPayloads);
    setShowExtraChargesWarning(false);
    setPendingPayloads([]);
    setCategoriesMissingCharges([]);
  };

  const handleCancelWarning = () => {
    setShowExtraChargesWarning(false);
    setPendingPayloads([]);
    setCategoriesMissingCharges([]);
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
    if (rule.min_nights) {
      conditions.push(rule.max_nights ? `${rule.min_nights}N` : `${rule.min_nights}+N`);
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

              {/* Override Level Selection */}
              <div className="space-y-2">
                <Label>Override Level</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'category' as OverrideLevel, label: 'By Category' },
                    { value: 'room_type' as OverrideLevel, label: 'By Room Type' },
                    { value: 'room_unit' as OverrideLevel, label: 'By Room Unit' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.overrideLevel === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOverrideLevelChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Item Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {formData.overrideLevel === 'category' && 'Select Categories'}
                    {formData.overrideLevel === 'room_type' && 'Select Room Types'}
                    {formData.overrideLevel === 'room_unit' && 'Select Room Units'}
                  </Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll}>
                    {formData.selectedIds.length === (getSelectableItems()?.length || 0) ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30 max-h-48 overflow-y-auto">
                  {getSelectableItems()?.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={formData.selectedIds.includes(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id, item.name)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Same rate toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sameRateForAllDays"
                  checked={formData.sameRateForAllDays} 
                  onCheckedChange={(checked) => setFormData({ ...formData, sameRateForAllDays: checked as boolean })} 
                />
                <Label htmlFor="sameRateForAllDays" className="text-sm font-normal cursor-pointer">
                  Same rate for weekdays and weekends
                </Label>
              </div>
              {formData.categoryRates.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> All override rates are for <span className="font-medium text-foreground">Full Board (All Meals Inclusive)</span> meal plan with <span className="font-medium text-foreground">Refundable as Credit Voucher</span> cancellation policy. Extra adult/child charges apply from the 3rd guest onwards.
                </div>
              )}

              {formData.categoryRates.map((categoryRate) => (
                <Card key={categoryRate.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{categoryRate.name}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleItemToggle(categoryRate.id, categoryRate.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {formData.sameRateForAllDays ? (
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
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.double} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'double', e.target.value)} />
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'extraAdult', e.target.value)} />
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'extraChild', e.target.value)} />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="py-2 font-medium text-sm">2+ Nights</TableCell>
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.double} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'double', e.target.value)} />
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'extraAdult', e.target.value)} />
                            </TableCell>
                            <TableCell className="py-1 px-2">
                              <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'extraChild', e.target.value)} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="h-8 text-xs w-24" rowSpan={2}>Duration</TableHead>
                          <TableHead className="h-8 text-xs text-center border-l" colSpan={3}>
                            <Badge variant="secondary" className="text-xs">Weekday</Badge>
                          </TableHead>
                          <TableHead className="h-8 text-xs text-center border-l" colSpan={3}>
                            <Badge variant="outline" className="text-xs">Weekend</Badge>
                          </TableHead>
                        </TableRow>
                        <TableRow className="bg-muted/30">
                          <TableHead className="h-7 text-xs text-center border-l px-1">Double</TableHead>
                          <TableHead className="h-7 text-xs text-center px-1">+Adult</TableHead>
                          <TableHead className="h-7 text-xs text-center px-1">+Child</TableHead>
                          <TableHead className="h-7 text-xs text-center border-l px-1">Double</TableHead>
                          <TableHead className="h-7 text-xs text-center px-1">+Adult</TableHead>
                          <TableHead className="h-7 text-xs text-center px-1">+Child</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="py-2 font-medium text-sm">1 Night</TableCell>
                          <TableCell className="py-1 px-1 border-l">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.double} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'double', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'extraAdult', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekday.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekday', 'extraChild', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1 border-l">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekend.double} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekend', 'double', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekend.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekend', 'extraAdult', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.oneNightWeekend.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'oneNightWeekend', 'extraChild', e.target.value)} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="py-2 font-medium text-sm">2+ Nights</TableCell>
                          <TableCell className="py-1 px-1 border-l">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.double} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'double', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'extraAdult', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekday.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekday', 'extraChild', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1 border-l">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekend.double} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekend', 'double', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekend.extraAdult} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekend', 'extraAdult', e.target.value)} />
                          </TableCell>
                          <TableCell className="py-1 px-1">
                            <Input type="number" placeholder="—" className="h-8 text-center text-sm" value={categoryRate.rates.twoNightsWeekend.extraChild} onChange={(e) => updateRateValue(categoryRate.id, 'twoNightsWeekend', 'extraChild', e.target.value)} />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    )}
                  </CardContent>
                </Card>
              ))}

              {formData.selectedIds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Select {formData.overrideLevel === 'category' ? 'categories' : formData.overrideLevel === 'room_type' ? 'room types' : 'room units'} above to enter override rates
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
                    {rule.room_categories?.name 
                      ? <Badge variant="outline" className="text-xs">{rule.room_categories.name}</Badge>
                      : rule.room_types?.name 
                        ? rule.room_types.name 
                        : rule.room_units?.unit_number 
                          ? `Unit ${rule.room_units.unit_number}${rule.room_units.unit_name ? ` - ${rule.room_units.unit_name}` : ''}`
                          : 'All'}
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

      {/* Warning Dialog for Missing Extra Charges */}
      <AlertDialog open={showExtraChargesWarning} onOpenChange={setShowExtraChargesWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Missing Extra Guest Charges
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  The following room categories have base rates but are missing extra adult or extra child charges:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {categoriesMissingCharges.map((name) => (
                    <li key={name} className="font-medium text-foreground">{name}</li>
                  ))}
                </ul>
                <p className="text-amber-600 dark:text-amber-400">
                  Dynamic pricing rates will be applied for additional guests during this period.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning}>
              Cancel - Edit Rates
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWithDynamicPricing}>
              Continue - Use Dynamic Pricing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Conflicting Override Found
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  An active override already exists for the same period and room:
                </p>
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  {conflictingOverrides.map((conflict) => (
                    <div key={conflict.id} className="text-sm">
                      <p className="font-medium text-foreground">{conflict.reason}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(conflict.start_date), 'MMM dd')} - {format(new Date(conflict.end_date), 'MMM dd, yyyy')}
                        {conflict.override_price && ` • ₹${conflict.override_price.toLocaleString()}`}
                      </p>
                    </div>
                  ))}
                </div>
                <p>How would you like to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleConflictCancel}
            >
              Cancel - Don't create this override
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleConflictCreateAnyway}
              disabled={createMutation.isPending}
            >
              Create anyway - New override takes precedence
            </Button>
            <Button 
              className="w-full justify-start"
              onClick={handleConflictKeepHigherPrice}
              disabled={deactivateAndCreateMutation.isPending}
            >
              Keep higher price - Deactivate lower rate override
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
