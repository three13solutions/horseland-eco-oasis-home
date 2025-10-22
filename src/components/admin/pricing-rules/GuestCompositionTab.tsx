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
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export function GuestCompositionTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [formData, setFormData] = useState({
    room_type_id: '',
    base_guests_count: '2',
    max_extra_guests: '',
    extra_adult_charge: '',
    extra_child_charge: '',
    extra_infant_charge: '',
    is_active: true
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['guest-composition-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_composition_rules')
        .select('*, room_types(name)')
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('guest_composition_rules').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-composition-rules'] });
      toast.success('Guest composition rule created');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from('guest_composition_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-composition-rules'] });
      toast.success('Rule updated');
      setIsDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guest_composition_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-composition-rules'] });
      toast.success('Rule deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      room_type_id: '',
      base_guests_count: '2',
      max_extra_guests: '',
      extra_adult_charge: '',
      extra_child_charge: '',
      extra_infant_charge: '',
      is_active: true
    });
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      room_type_id: formData.room_type_id || null,
      base_guests_count: parseInt(formData.base_guests_count),
      max_extra_guests: parseInt(formData.max_extra_guests),
      extra_adult_charge: parseFloat(formData.extra_adult_charge),
      extra_child_charge: formData.extra_child_charge ? parseFloat(formData.extra_child_charge) : null,
      extra_infant_charge: formData.extra_infant_charge ? parseFloat(formData.extra_infant_charge) : null,
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
      room_type_id: rule.room_type_id || '',
      base_guests_count: rule.base_guests_count?.toString() || '2',
      max_extra_guests: rule.max_extra_guests?.toString() || '',
      extra_adult_charge: rule.extra_adult_charge?.toString() || '',
      extra_child_charge: rule.extra_child_charge?.toString() || '',
      extra_infant_charge: rule.extra_infant_charge?.toString() || '',
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
              <Users className="h-5 w-5" />
              Guest Composition Charges
            </CardTitle>
            <CardDescription>
              Define extra guest charges for adults, children, and infants
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Rule</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Edit' : 'Add'} Guest Composition Rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Room Category (Optional - leave empty for all)</Label>
                  <Select value={formData.room_type_id} onValueChange={(value) => setFormData({ ...formData, room_type_id: value })}>
                    <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {roomTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Guest Count</Label>
                    <Input type="number" min="1" placeholder="2" value={formData.base_guests_count} onChange={(e) => setFormData({ ...formData, base_guests_count: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Extra Guests</Label>
                    <Input type="number" min="1" placeholder="2" value={formData.max_extra_guests} onChange={(e) => setFormData({ ...formData, max_extra_guests: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Extra Adult Charge (₹)</Label>
                  <Input type="number" step="0.01" placeholder="1000" value={formData.extra_adult_charge} onChange={(e) => setFormData({ ...formData, extra_adult_charge: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Extra Child Charge (₹) - Optional</Label>
                    <Input type="number" step="0.01" placeholder="500" value={formData.extra_child_charge} onChange={(e) => setFormData({ ...formData, extra_child_charge: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Extra Infant Charge (₹) - Optional</Label>
                    <Input type="number" step="0.01" placeholder="0" value={formData.extra_infant_charge} onChange={(e) => setFormData({ ...formData, extra_infant_charge: e.target.value })} />
                  </div>
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
              <TableHead>Category</TableHead>
              <TableHead>Base Guests</TableHead>
              <TableHead>Max Extra</TableHead>
              <TableHead>Adult Charge</TableHead>
              <TableHead>Child Charge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : rules?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No guest composition rules defined</TableCell></TableRow>
            ) : (
              rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.room_types?.name || 'All'}</TableCell>
                  <TableCell>{rule.base_guests_count}</TableCell>
                  <TableCell>{rule.max_extra_guests}</TableCell>
                  <TableCell>₹{rule.extra_adult_charge}</TableCell>
                  <TableCell>{rule.extra_child_charge ? `₹${rule.extra_child_charge}` : '-'}</TableCell>
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
