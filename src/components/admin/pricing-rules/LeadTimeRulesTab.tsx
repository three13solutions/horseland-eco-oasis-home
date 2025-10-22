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
import { Plus, Pencil, Trash2, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyRuleState } from './EmptyRuleState';

export function LeadTimeRulesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    days_before_checkin_min: '',
    days_before_checkin_max: '',
    price_adjustment_type: 'percentage',
    price_adjustment: '',
    applies_to: 'all',
    room_type_id: '',
    season_id: '',
    priority: '0',
    is_active: true
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['lead-time-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_time_rules')
        .select('*, room_types(name), seasons(name)')
        .order('priority', { ascending: false });
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

  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seasons').select('id, name');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('lead_time_rules').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-time-rules'] });
      toast.success('Lead time rule created');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('lead_time_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-time-rules'] });
      toast.success('Rule updated');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_time_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-time-rules'] });
      toast.success('Rule deleted');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('lead_time_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-time-rules'] });
      toast.success('Status updated');
    }
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      days_before_checkin_min: '',
      days_before_checkin_max: '',
      price_adjustment_type: 'percentage',
      price_adjustment: '',
      applies_to: 'all',
      room_type_id: '',
      season_id: '',
      priority: '0',
      is_active: true
    });
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      rule_name: formData.rule_name,
      days_before_checkin_min: parseInt(formData.days_before_checkin_min),
      days_before_checkin_max: parseInt(formData.days_before_checkin_max),
      price_adjustment_type: formData.price_adjustment_type,
      price_adjustment: parseFloat(formData.price_adjustment),
      applies_to: formData.applies_to,
      room_type_id: formData.applies_to === 'category' ? formData.room_type_id : null,
      season_id: formData.applies_to === 'season' ? formData.season_id : null,
      priority: parseInt(formData.priority),
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
      rule_name: rule.rule_name,
      days_before_checkin_min: rule.days_before_checkin_min?.toString() || '',
      days_before_checkin_max: rule.days_before_checkin_max?.toString() || '',
      price_adjustment_type: rule.price_adjustment_type,
      price_adjustment: rule.price_adjustment?.toString() || '',
      applies_to: rule.applies_to,
      room_type_id: rule.room_type_id || '',
      season_id: rule.season_id || '',
      priority: rule.priority?.toString() || '0',
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
              <Clock className="h-5 w-5" />
              Lead Time & Pace Rules
            </CardTitle>
            <CardDescription>
              Configure price adjustments based on how far in advance bookings are made
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit' : 'Add'} Lead Time Rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input placeholder="e.g., Early Bird Discount" value={formData.rule_name} onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Days Before Check-in</Label>
                    <Input type="number" min="0" placeholder="30" value={formData.days_before_checkin_min} onChange={(e) => setFormData({ ...formData, days_before_checkin_min: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Days Before Check-in</Label>
                    <Input type="number" min="0" placeholder="90" value={formData.days_before_checkin_max} onChange={(e) => setFormData({ ...formData, days_before_checkin_max: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Adjustment Type</Label>
                    <Select value={formData.price_adjustment_type} onValueChange={(value) => setFormData({ ...formData, price_adjustment_type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price Adjustment</Label>
                    <Input type="number" step="0.01" placeholder={formData.price_adjustment_type === 'percentage' ? '-10' : '-500'} value={formData.price_adjustment} onChange={(e) => setFormData({ ...formData, price_adjustment: e.target.value })} required />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use negative values for discounts (e.g., -10 for 10% off)
                </p>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select value={formData.applies_to} onValueChange={(value) => setFormData({ ...formData, applies_to: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="category">Specific Category</SelectItem>
                      <SelectItem value="season">Specific Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.applies_to === 'category' && (
                  <div className="space-y-2">
                    <Label>Room Category</Label>
                    <Select value={formData.room_type_id} onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{roomTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {formData.applies_to === 'season' && (
                  <div className="space-y-2">
                    <Label>Season</Label>
                    <Select value={formData.season_id} onValueChange={(value) => setFormData({ ...formData, season_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                      <SelectContent>{seasons?.map((season) => <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Priority (higher = applied first)</Label>
                  <Input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} />
                </div>
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
              <TableHead>Rule Name</TableHead>
              <TableHead>Lead Time Range</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : rules?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyRuleState
                    icon={Clock}
                    title="No Lead Time Rules Defined"
                    description="Reward early bookers with discounts or charge premiums for last-minute reservations to optimize your booking pace."
                    examples={[
                      "Offer 15% discount for bookings 60+ days in advance",
                      "Add premium for last-minute bookings (0-7 days)",
                      "Create tiered pricing based on booking window"
                    ]}
                    onAddClick={() => setIsDialogOpen(true)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>{rule.days_before_checkin_min}-{rule.days_before_checkin_max} days</TableCell>
                  <TableCell>
                    <Badge 
                      variant={rule.price_adjustment > 0 ? 'destructive' : 'default'}
                      className="gap-1"
                    >
                      {rule.price_adjustment > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {rule.price_adjustment_type === 'percentage' 
                        ? `${rule.price_adjustment > 0 ? '+' : ''}${rule.price_adjustment}%` 
                        : `₹${rule.price_adjustment}`}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.applies_to === 'category' ? rule.room_types?.name : rule.applies_to === 'season' ? rule.seasons?.name : 'All'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={rule.priority >= 20 ? 'destructive' : rule.priority >= 10 ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      {rule.priority >= 20 && <ArrowUp className="h-3 w-3" />}
                      {rule.priority}
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
