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
import { Plus, Pencil, Trash2, Radio } from 'lucide-react';
import { toast } from 'sonner';

export function ChannelRulesTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    channel_name: '',
    adjustment_type: 'percentage',
    adjustment_value: '',
    applies_to: 'all',
    room_type_id: '',
    season_id: '',
    is_active: true
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['channel-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_rules')
        .select('*, room_types(name), seasons(name)')
        .order('created_at', { ascending: false });
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
      const { error } = await supabase.from('channel_rules').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-rules'] });
      toast.success('Channel rule created');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('channel_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-rules'] });
      toast.success('Rule updated');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('channel_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-rules'] });
      toast.success('Rule deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      channel_name: '',
      adjustment_type: 'percentage',
      adjustment_value: '',
      applies_to: 'all',
      room_type_id: '',
      season_id: '',
      is_active: true
    });
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      channel_name: formData.channel_name,
      adjustment_type: formData.adjustment_type,
      adjustment_value: parseFloat(formData.adjustment_value),
      applies_to: formData.applies_to,
      room_type_id: formData.applies_to === 'category' ? formData.room_type_id : null,
      season_id: formData.applies_to === 'season' ? formData.season_id : null,
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
      channel_name: rule.channel_name,
      adjustment_type: rule.adjustment_type,
      adjustment_value: rule.adjustment_value?.toString() || '',
      applies_to: rule.applies_to,
      room_type_id: rule.room_type_id || '',
      season_id: rule.season_id || '',
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
              <Radio className="h-5 w-5" />
              Channel Adjustments
            </CardTitle>
            <CardDescription>
              Set pricing rules for different booking channels (direct, OTA, travel agents)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit' : 'Add'} Channel Rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Channel Name</Label>
                  <Select value={formData.channel_name} onValueChange={(value) => setFormData({ ...formData, channel_name: value })}>
                    <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct Booking</SelectItem>
                      <SelectItem value="booking.com">Booking.com</SelectItem>
                      <SelectItem value="makemytrip">MakeMyTrip</SelectItem>
                      <SelectItem value="goibibo">Goibibo</SelectItem>
                      <SelectItem value="agoda">Agoda</SelectItem>
                      <SelectItem value="travel_agent">Travel Agent</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <Input type="number" step="0.01" placeholder={formData.adjustment_type === 'percentage' ? '15' : '500'} value={formData.adjustment_value} onChange={(e) => setFormData({ ...formData, adjustment_value: e.target.value })} required />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.adjustment_type === 'percentage' ? 'OTA commission (e.g., 15 for 15% commission)' : 'Fixed commission amount'}
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
              <TableHead>Channel</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : rules?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No channel rules defined</TableCell></TableRow>
            ) : (
              rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium capitalize">{rule.channel_name.replace('_', ' ')}</TableCell>
                  <TableCell>{rule.adjustment_type === 'percentage' ? `+${rule.adjustment_value}%` : `₹${rule.adjustment_value}`}</TableCell>
                  <TableCell>{rule.applies_to === 'category' ? rule.room_types?.name : rule.applies_to === 'season' ? rule.seasons?.name : 'All'}</TableCell>
                  <TableCell><Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
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
