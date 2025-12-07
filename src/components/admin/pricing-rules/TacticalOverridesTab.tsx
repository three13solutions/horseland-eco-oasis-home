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
import { Plus, Pencil, Trash2, Zap, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type StatusFilter = 'all' | 'active' | 'expired' | 'upcoming';

interface FormData {
  reason: string;
  start_date: string;
  end_date: string;
  selected_room_types: string[];
  room_unit_id: string;
  override_type: string;
  override_price: string;
  adjustment_type: string;
  adjustment_value: string;
  is_active: boolean;
  // Occupancy conditions
  occupancy_type: string;
  min_adults: string;
  max_adults: string;
  min_children: string;
  max_children: string;
  // Length of stay conditions
  min_nights: string;
  max_nights: string;
}

const initialFormData: FormData = {
  reason: '',
  start_date: '',
  end_date: '',
  selected_room_types: [],
  room_unit_id: '',
  override_type: 'fixed_price',
  override_price: '',
  adjustment_type: 'percentage',
  adjustment_value: '',
  is_active: true,
  occupancy_type: '',
  min_adults: '',
  max_adults: '',
  min_children: '',
  max_children: '',
  min_nights: '',
  max_nights: ''
};

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showOccupancyOptions, setShowOccupancyOptions] = useState(false);
  const [showStayOptions, setShowStayOptions] = useState(false);
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

  const { data: roomUnits } = useQuery({
    queryKey: ['room-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_units').select('id, unit_number, room_type_id');
      if (error) throw error;
      return data;
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
    setShowOccupancyOptions(false);
    setShowStayOptions(false);
  };

  const handleRoomTypeToggle = (roomTypeId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_room_types: prev.selected_room_types.includes(roomTypeId)
        ? prev.selected_room_types.filter(id => id !== roomTypeId)
        : [...prev.selected_room_types, roomTypeId],
      room_unit_id: ''
    }));
  };

  const handleSelectAllRoomTypes = () => {
    if (formData.selected_room_types.length === roomTypes?.length) {
      setFormData(prev => ({ ...prev, selected_room_types: [], room_unit_id: '' }));
    } else {
      setFormData(prev => ({ ...prev, selected_room_types: roomTypes?.map(t => t.id) || [], room_unit_id: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const basePayload = {
      reason: formData.reason,
      start_date: formData.start_date,
      end_date: formData.end_date,
      room_unit_id: formData.room_unit_id || null,
      override_price: formData.override_type === 'fixed_price' ? parseFloat(formData.override_price) : null,
      adjustment_type: formData.override_type === 'adjustment' ? formData.adjustment_type : null,
      adjustment_value: formData.override_type === 'adjustment' ? parseFloat(formData.adjustment_value) : null,
      is_active: formData.is_active,
      // Occupancy conditions
      occupancy_type: formData.occupancy_type || null,
      min_adults: formData.min_adults ? parseInt(formData.min_adults) : null,
      max_adults: formData.max_adults ? parseInt(formData.max_adults) : null,
      min_children: formData.min_children ? parseInt(formData.min_children) : null,
      max_children: formData.max_children ? parseInt(formData.max_children) : null,
      // Length of stay conditions
      min_nights: formData.min_nights ? parseInt(formData.min_nights) : null,
      max_nights: formData.max_nights ? parseInt(formData.max_nights) : null
    };

    if (editingRule) {
      updateMutation.mutate({ 
        id: editingRule.id, 
        data: { ...basePayload, room_type_id: formData.selected_room_types[0] || null }
      });
    } else {
      if (formData.selected_room_types.length === 0) {
        createMutation.mutate([{ ...basePayload, room_type_id: null }]);
      } else {
        const payloads = formData.selected_room_types.map(room_type_id => ({
          ...basePayload,
          room_type_id
        }));
        createMutation.mutate(payloads);
      }
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    const hasOccupancyConditions = rule.occupancy_type || rule.min_adults || rule.max_adults || rule.min_children || rule.max_children;
    const hasStayConditions = rule.min_nights || rule.max_nights;
    setShowOccupancyOptions(hasOccupancyConditions);
    setShowStayOptions(hasStayConditions);
    setFormData({
      reason: rule.reason,
      start_date: rule.start_date,
      end_date: rule.end_date,
      selected_room_types: rule.room_type_id ? [rule.room_type_id] : [],
      room_unit_id: rule.room_unit_id || '',
      override_type: rule.override_price ? 'fixed_price' : 'adjustment',
      override_price: rule.override_price?.toString() || '',
      adjustment_type: rule.adjustment_type || 'percentage',
      adjustment_value: rule.adjustment_value?.toString() || '',
      is_active: rule.is_active,
      occupancy_type: rule.occupancy_type || '',
      min_adults: rule.min_adults?.toString() || '',
      max_adults: rule.max_adults?.toString() || '',
      min_children: rule.min_children?.toString() || '',
      max_children: rule.max_children?.toString() || '',
      min_nights: rule.min_nights?.toString() || '',
      max_nights: rule.max_nights?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const getConditionsSummary = (rule: any) => {
    const conditions: string[] = [];
    if (rule.occupancy_type) {
      const labels: Record<string, string> = {
        single: 'Single',
        double: 'Double',
        extra_adult: '+Adult',
        extra_child: '+Child'
      };
      conditions.push(labels[rule.occupancy_type] || rule.occupancy_type);
    }
    if (rule.min_nights || rule.max_nights) {
      if (rule.min_nights && rule.max_nights) {
        conditions.push(`${rule.min_nights}-${rule.max_nights}N`);
      } else if (rule.min_nights) {
        conditions.push(`${rule.min_nights}+N`);
      } else if (rule.max_nights) {
        conditions.push(`≤${rule.max_nights}N`);
      }
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit' : 'Add'} Tactical Override</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input placeholder="e.g., Special Event Premium / Maintenance Discount" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
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
              
              {/* Bulk Room Type Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Room Categories {!editingRule && '(Select multiple for bulk override)'}</Label>
                  {!editingRule && roomTypes && roomTypes.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllRoomTypes}>
                      {formData.selected_room_types.length === roomTypes.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
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
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
                    {roomTypes?.map((type) => (
                      <div key={type.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`room-type-${type.id}`}
                          checked={formData.selected_room_types.includes(type.id)}
                          onCheckedChange={() => handleRoomTypeToggle(type.id)}
                        />
                        <label htmlFor={`room-type-${type.id}`} className="text-sm cursor-pointer">{type.name}</label>
                      </div>
                    ))}
                    {(!roomTypes || roomTypes.length === 0) && (
                      <p className="text-sm text-muted-foreground col-span-2">No room categories available</p>
                    )}
                  </div>
                )}
                {formData.selected_room_types.length === 0 && !editingRule && (
                  <p className="text-xs text-muted-foreground">Leave empty to apply to all categories</p>
                )}
              </div>

              {/* Specific Unit - only show if single room type selected */}
              {formData.selected_room_types.length === 1 && (
                <div className="space-y-2">
                  <Label>Specific Unit (Optional)</Label>
                  <Select value={formData.room_unit_id || '__all__'} onValueChange={(value) => setFormData({ ...formData, room_unit_id: value === '__all__' ? '' : value })}>
                    <SelectTrigger><SelectValue placeholder="All units" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Units</SelectItem>
                      {roomUnits?.filter(u => u.room_type_id === formData.selected_room_types[0]).map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.unit_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Occupancy Conditions */}
              <Collapsible open={showOccupancyOptions} onOpenChange={setShowOccupancyOptions}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Users className="h-4 w-4" />
                    Occupancy Conditions
                    <Badge variant="secondary" className="ml-auto">{showOccupancyOptions ? 'Collapse' : 'Expand'}</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Occupancy Type</Label>
                    <Select value={formData.occupancy_type || '__any__'} onValueChange={(value) => setFormData({ ...formData, occupancy_type: value === '__any__' ? '' : value })}>
                      <SelectTrigger><SelectValue placeholder="Any occupancy" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any Occupancy</SelectItem>
                        <SelectItem value="single">Single (1 adult)</SelectItem>
                        <SelectItem value="double">Double (2 adults)</SelectItem>
                        <SelectItem value="extra_adult">With Extra Adult (3+ adults)</SelectItem>
                        <SelectItem value="extra_child">With Children</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Min Adults</Label>
                      <Input type="number" min="0" placeholder="Any" value={formData.min_adults} onChange={(e) => setFormData({ ...formData, min_adults: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Adults</Label>
                      <Input type="number" min="0" placeholder="Any" value={formData.max_adults} onChange={(e) => setFormData({ ...formData, max_adults: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Min Children</Label>
                      <Input type="number" min="0" placeholder="Any" value={formData.min_children} onChange={(e) => setFormData({ ...formData, min_children: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Children</Label>
                      <Input type="number" min="0" placeholder="Any" value={formData.max_children} onChange={(e) => setFormData({ ...formData, max_children: e.target.value })} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Length of Stay Conditions */}
              <Collapsible open={showStayOptions} onOpenChange={setShowStayOptions}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Calendar className="h-4 w-4" />
                    Length of Stay Conditions
                    <Badge variant="secondary" className="ml-auto">{showStayOptions ? 'Collapse' : 'Expand'}</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Minimum Nights</Label>
                      <Input type="number" min="1" placeholder="Any" value={formData.min_nights} onChange={(e) => setFormData({ ...formData, min_nights: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Maximum Nights</Label>
                      <Input type="number" min="1" placeholder="Any" value={formData.max_nights} onChange={(e) => setFormData({ ...formData, max_nights: e.target.value })} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-2">
                <Label>Override Type</Label>
                <Select value={formData.override_type} onValueChange={(value) => setFormData({ ...formData, override_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_price">Fixed Price</SelectItem>
                    <SelectItem value="adjustment">Price Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.override_type === 'fixed_price' ? (
                <div className="space-y-2">
                  <Label>Override Price (₹)</Label>
                  <Input type="number" step="0.01" placeholder="5000" value={formData.override_price} onChange={(e) => setFormData({ ...formData, override_price: e.target.value })} required />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adjustment Type</Label>
                    <Select value={formData.adjustment_type} onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Adjustment Value</Label>
                    <Input type="number" step="0.01" placeholder={formData.adjustment_type === 'percentage' ? '20' : '1000'} value={formData.adjustment_value} onChange={(e) => setFormData({ ...formData, adjustment_value: e.target.value })} required />
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  {editingRule ? 'Update' : formData.selected_room_types.length > 1 ? `Create ${formData.selected_room_types.length} Overrides` : 'Create'}
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
                      {rule.override_price ? `₹${rule.override_price}` : `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_type === 'percentage' ? `${rule.adjustment_value}%` : `₹${rule.adjustment_value}`}`}
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
