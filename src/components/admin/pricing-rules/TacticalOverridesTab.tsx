import { useState } from 'react';
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
import { Plus, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EmptyRuleState } from './EmptyRuleState';

export function TacticalOverridesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    reason: '',
    start_date: '',
    end_date: '',
    room_type_id: '',
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
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('room_types').select('id, name');
      if (error) throw error;
      return data;
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('tactical_overrides').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tactical-overrides'] });
      toast.success('Tactical override created');
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
      room_type_id: '',
      room_unit_id: '',
      override_type: 'fixed_price',
      override_price: '',
      adjustment_type: 'percentage',
      adjustment_value: '',
      is_active: true
    });
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      reason: formData.reason,
      start_date: formData.start_date,
      end_date: formData.end_date,
      room_type_id: formData.room_type_id || null,
      room_unit_id: formData.room_unit_id || null,
      override_price: formData.override_type === 'fixed_price' ? parseFloat(formData.override_price) : null,
      adjustment_type: formData.override_type === 'adjustment' ? formData.adjustment_type : null,
      adjustment_value: formData.override_type === 'adjustment' ? parseFloat(formData.adjustment_value) : null,
      is_active: formData.is_active
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      reason: rule.reason,
      start_date: rule.start_date,
      end_date: rule.end_date,
      room_type_id: rule.room_type_id || '',
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Tactical Overrides
            </CardTitle>
            <CardDescription>
              Manual price overrides for special events, maintenance, or promotions
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Override</Button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room Category (Optional)</Label>
                    <Select value={formData.room_type_id || '__all__'} onValueChange={(value) => setFormData({ ...formData, room_type_id: value === '__all__' ? '' : value, room_unit_id: '' })}>
                      <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Categories</SelectItem>
                        {roomTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Specific Unit (Optional)</Label>
                    <Select value={formData.room_unit_id || '__all__'} onValueChange={(value) => setFormData({ ...formData, room_unit_id: value === '__all__' ? '' : value })} disabled={!formData.room_type_id}>
                      <SelectTrigger><SelectValue placeholder="All units" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Units</SelectItem>
                        {roomUnits?.filter(u => !formData.room_type_id || u.room_type_id === formData.room_type_id).map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.unit_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                  <Button type="submit">{editingRule ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : rules?.length === 0 ? (
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
            ) : (
              rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.reason}</TableCell>
                  <TableCell className="text-sm">{format(new Date(rule.start_date), 'MMM dd')} - {format(new Date(rule.end_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{rule.room_units?.unit_number || rule.room_types?.name || 'All'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {rule.override_price ? `₹${rule.override_price}` : `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_type === 'percentage' ? `${rule.adjustment_value}%` : `₹${rule.adjustment_value}`}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
