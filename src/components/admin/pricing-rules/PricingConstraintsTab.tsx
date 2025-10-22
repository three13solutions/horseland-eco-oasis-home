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
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyRuleState } from './EmptyRuleState';

export function PricingConstraintsTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<any>(null);
  const [formData, setFormData] = useState({
    room_type_id: '',
    room_unit_id: '',
    floor_price: '',
    ceiling_price: '',
    is_active: true
  });

  const { data: constraints, isLoading: loadingConstraints } = useQuery({
    queryKey: ['pricing-constraints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_constraints')
        .select('*, room_types(name), room_units(unit_number)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: roomTypes } = useQuery({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_types')
        .select('id, name')
        .eq('is_published', true);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: roomUnits } = useQuery({
    queryKey: ['room-units', formData.room_type_id],
    queryFn: async () => {
      if (!formData.room_type_id) return [];
      
      const { data, error } = await supabase
        .from('room_units')
        .select('id, unit_number')
        .eq('room_type_id', formData.room_type_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!formData.room_type_id
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('pricing_constraints')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-constraints'] });
      toast.success('Pricing constraint created successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create constraint: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('pricing_constraints')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-constraints'] });
      toast.success('Pricing constraint updated successfully');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update constraint: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_constraints')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-constraints'] });
      toast.success('Pricing constraint deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete constraint: ' + error.message);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('pricing_constraints')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-constraints'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      room_type_id: '',
      room_unit_id: '',
      floor_price: '',
      ceiling_price: '',
      is_active: true
    });
    setEditingConstraint(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      room_type_id: formData.room_type_id || null,
      room_unit_id: formData.room_unit_id || null,
      floor_price: parseFloat(formData.floor_price),
      ceiling_price: formData.ceiling_price ? parseFloat(formData.ceiling_price) : null,
      is_active: formData.is_active
    };

    if (editingConstraint) {
      updateMutation.mutate({ id: editingConstraint.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (constraint: any) => {
    setEditingConstraint(constraint);
    setFormData({
      room_type_id: constraint.room_type_id || '',
      room_unit_id: constraint.room_unit_id || '',
      floor_price: constraint.floor_price?.toString() || '',
      ceiling_price: constraint.ceiling_price?.toString() || '',
      is_active: constraint.is_active
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Floor & Ceiling Prices</CardTitle>
            <CardDescription>
              Set minimum and maximum price limits for room categories and units
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Constraint
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingConstraint ? 'Edit' : 'Add'} Pricing Constraint
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room_type">Room Category</Label>
                    <Select
                      value={formData.room_type_id}
                      onValueChange={(value) => setFormData({ ...formData, room_type_id: value, room_unit_id: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {roomTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="room_unit">Specific Unit (Optional)</Label>
                    <Select
                      value={formData.room_unit_id}
                      onValueChange={(value) => setFormData({ ...formData, room_unit_id: value })}
                      disabled={!formData.room_type_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Units</SelectItem>
                        {roomUnits?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="floor_price">Floor Price (Minimum) *</Label>
                    <Input
                      id="floor_price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.floor_price}
                      onChange={(e) => setFormData({ ...formData, floor_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ceiling_price">Ceiling Price (Maximum)</Label>
                    <Input
                      id="ceiling_price"
                      type="number"
                      step="0.01"
                      placeholder="Optional"
                      value={formData.ceiling_price}
                      onChange={(e) => setFormData({ ...formData, ceiling_price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingConstraint ? 'Update' : 'Create'}
                  </Button>
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
              <TableHead>Category / Unit</TableHead>
              <TableHead>Floor Price</TableHead>
              <TableHead>Ceiling Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingConstraints ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : constraints?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyRuleState
                    icon={Shield}
                    title="No Price Constraints Defined"
                    description="Set minimum and maximum price limits to protect your revenue and maintain competitive positioning"
                    examples={[
                      "Prevent prices from dropping below cost",
                      "Cap maximum rates during peak periods",
                      "Apply constraints to specific room types or units"
                    ]}
                    onAddClick={() => setIsDialogOpen(true)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              constraints?.map((constraint) => (
                <TableRow key={constraint.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {constraint.room_types?.name || 'All Categories'}
                      </div>
                      {constraint.room_units && (
                        <div className="text-sm text-muted-foreground">
                          Unit: {constraint.room_units.unit_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">₹{constraint.floor_price}</TableCell>
                  <TableCell className="font-mono">
                    {constraint.ceiling_price ? `₹${constraint.ceiling_price}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={constraint.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: constraint.id, is_active: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {constraint.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(constraint)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(constraint.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
