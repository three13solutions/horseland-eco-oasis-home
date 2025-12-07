import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';

type StatusFilter = 'all' | 'active' | 'expired' | 'upcoming';

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formData, setFormData] = useState({
    reason: '',
    start_date: '',
    end_date: '',
    selected_room_types: [] as string[],
    room_unit_id: '',
    override_type: 'fixed_price',
    override_price: '',
    adjustment_type: 'percentage',
    adjustment_value: '',
    is_active: true
  });

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
    setFormData({
      reason: '',
      start_date: '',
      end_date: '',
      selected_room_types: [],
      room_unit_id: '',
      override_type: 'fixed_price',
      override_price: '',
      adjustment_type: 'percentage',
      adjustment_value: '',
      is_active: true
    });
    setEditingRule(null);
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
      is_active: formData.is_active
    };

    if (editingRule) {
      updateMutation.mutate({ 
        id: editingRule.id, 
        data: { ...basePayload, room_type_id: formData.selected_room_types[0] || null }
      });
    } else {
      // Bulk create: one override per selected room type, or one for "all" if none selected
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
      is_active: rule.is_active
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-4 w-4" />
              Tactical Overrides
            </CardTitle>
            <CardDescription className="text-xs">
              Manual price overrides for special events or promotions
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Override</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/30 max-h-40 overflow-y-auto">
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
      </CardHeader>
      
      {/* Status Filter */}
      {rules && rules.length > 0 && (
        <div className="px-6 pb-3">
          <div className="flex gap-1 flex-wrap">
            {(['all', 'active', 'upcoming', 'expired'] as StatusFilter[]).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {statusCounts[status]}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-xs">Reason</TableHead>
              <TableHead className="h-8 text-xs">Period</TableHead>
              <TableHead className="h-8 text-xs">Scope</TableHead>
              <TableHead className="h-8 text-xs">Override</TableHead>
              <TableHead className="h-8 text-xs">Status</TableHead>
              <TableHead className="h-8 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-sm">Loading...</TableCell></TableRow>
            ) : filteredRules.length === 0 ? (
              statusFilter !== 'all' && rules && rules.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No {statusFilter} overrides found
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyRuleState
                      icon={Zap}
                      title="No Tactical Overrides Defined"
                      description="Create manual price overrides for special situations like events, maintenance, or flash sales. These take highest priority and override all other rules."
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
                return (
                  <TableRow 
                    key={rule.id} 
                    className={isExpired ? 'opacity-50 bg-muted/30' : ''}
                  >
                    <TableCell className="py-2 text-sm font-medium">{rule.reason}</TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {format(new Date(rule.start_date), 'MMM dd')} - {format(new Date(rule.end_date), 'MMM dd, yy')}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {rule.room_units?.unit_number || rule.room_types?.name || 'All'}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="font-mono text-xs h-5">
                        {rule.override_price ? `₹${rule.override_price}` : `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_type === 'percentage' ? `${rule.adjustment_value}%` : `₹${rule.adjustment_value}`}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                          }
                          className="scale-75"
                        />
                        <Badge 
                          variant={status === 'active' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'}
                          className="text-[10px] h-4 px-1"
                        >
                          {status === 'inactive' ? 'Off' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(rule)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(rule.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
