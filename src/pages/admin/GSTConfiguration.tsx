import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Percent } from 'lucide-react';

interface GSTTier {
  id: string;
  tier_name: string;
  min_amount: number;
  max_amount: number | null;
  gst_percentage: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const GSTConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<GSTTier | null>(null);
  const [formData, setFormData] = useState({
    tier_name: '',
    min_amount: 0,
    max_amount: null as number | null,
    gst_percentage: 5,
    is_active: true,
    display_order: 0
  });

  const { data: gstTiers, isLoading } = useQuery({
    queryKey: ['gst-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gst_tiers')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as GSTTier[];
    }
  });

  const createTierMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('gst_tiers')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-tiers'] });
      toast({
        title: "Success",
        description: "GST tier created successfully"
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GSTTier> }) => {
      const { error } = await supabase
        .from('gst_tiers')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-tiers'] });
      toast({
        title: "Success",
        description: "GST tier updated successfully"
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gst_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gst-tiers'] });
      toast({
        title: "Success",
        description: "GST tier deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      tier_name: '',
      min_amount: 0,
      max_amount: null,
      gst_percentage: 5,
      is_active: true,
      display_order: 0
    });
    setEditingTier(null);
  };

  const handleEdit = (tier: GSTTier) => {
    setEditingTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      min_amount: tier.min_amount,
      max_amount: tier.max_amount,
      gst_percentage: tier.gst_percentage,
      is_active: tier.is_active,
      display_order: tier.display_order
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTier) {
      updateTierMutation.mutate({
        id: editingTier.id,
        data: formData
      });
    } else {
      createTierMutation.mutate(formData);
    }
  };

  const handleToggleActive = (tier: GSTTier) => {
    updateTierMutation.mutate({
      id: tier.id,
      data: { is_active: !tier.is_active }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GST Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure tiered GST rates based on room tariff per night
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add GST Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTier ? 'Edit' : 'Add'} GST Tier</DialogTitle>
              <DialogDescription>
                Configure GST percentage based on room rate ranges
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tier_name">Tier Name</Label>
                <Input
                  id="tier_name"
                  value={formData.tier_name}
                  onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                  placeholder="e.g., Standard Rate"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_amount">Min Amount (₹)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_amount">Max Amount (₹)</Label>
                  <Input
                    id="max_amount"
                    type="number"
                    value={formData.max_amount || ''}
                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="gst_percentage">GST Percentage (%)</Label>
                <Input
                  id="gst_percentage"
                  type="number"
                  step="0.01"
                  value={formData.gst_percentage}
                  onChange={(e) => setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingTier ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Tier Configuration</CardTitle>
          <CardDescription>
            GST is calculated based on the per-night room rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Min Amount</TableHead>
                  <TableHead>Max Amount</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gstTiers?.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.tier_name}</TableCell>
                    <TableCell>₹{tier.min_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {tier.max_amount ? `₹${tier.max_amount.toLocaleString()}` : 'Unlimited'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        {tier.gst_percentage}%
                      </div>
                    </TableCell>
                    <TableCell>{tier.display_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={tier.is_active}
                        onCheckedChange={() => handleToggleActive(tier)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tier)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTierMutation.mutate(tier.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How GST Tiers Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• The system calculates GST based on the per-night room rate</p>
          <p>• Each tier defines a range of room rates and the applicable GST percentage</p>
          <p>• Tiers are evaluated in display order</p>
          <p>• Only active tiers are considered during calculation</p>
          <p>• If no tier matches, the system defaults to 18% GST</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GSTConfiguration;