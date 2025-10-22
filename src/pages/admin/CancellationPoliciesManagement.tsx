import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CancellationPolicy {
  id: string;
  policy_code: string;
  policy_name: string;
  description: string;
  adjustment_type: string;
  adjustment_value: number;
  cancellation_terms: any;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

const CancellationPoliciesManagement = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [formData, setFormData] = useState({
    policy_code: '',
    policy_name: '',
    description: '',
    adjustment_type: 'percentage',
    adjustment_value: 0,
    cancellation_terms: { terms: '', refund_percentage: 100, notice_hours: 24 },
    display_order: 0,
    is_active: true,
    is_featured: false
  });

  const { data: policies, isLoading } = useQuery({
    queryKey: ['cancellation-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cancellation_policy_rules')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as CancellationPolicy[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingPolicy) {
        const { error } = await supabase
          .from('cancellation_policy_rules')
          .update(data)
          .eq('id', editingPolicy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cancellation_policy_rules')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancellation-policies'] });
      setIsOpen(false);
      resetForm();
      toast.success(editingPolicy ? 'Policy updated' : 'Policy created');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cancellation_policy_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancellation-policies'] });
      toast.success('Policy deleted');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      policy_code: '',
      policy_name: '',
      description: '',
      adjustment_type: 'percentage',
      adjustment_value: 0,
      cancellation_terms: { terms: '', refund_percentage: 100, notice_hours: 24 },
      display_order: 0,
      is_active: true,
      is_featured: false
    });
    setEditingPolicy(null);
  };

  const handleEdit = (policy: CancellationPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_code: policy.policy_code,
      policy_name: policy.policy_name,
      description: policy.description || '',
      adjustment_type: policy.adjustment_type,
      adjustment_value: policy.adjustment_value,
      cancellation_terms: policy.cancellation_terms || { terms: '', refund_percentage: 100, notice_hours: 24 },
      display_order: policy.display_order,
      is_active: policy.is_active,
      is_featured: policy.is_featured
    });
    setIsOpen(true);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cancellation Policies Management</h1>
          <p className="text-muted-foreground">Configure cancellation and refund policies</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? 'Edit' : 'Add'} Cancellation Policy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Policy Code</Label>
                  <Input 
                    value={formData.policy_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, policy_code: e.target.value }))}
                    placeholder="e.g., flexible"
                  />
                </div>
                <div>
                  <Label>Policy Name</Label>
                  <Input 
                    value={formData.policy_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
                    placeholder="e.g., Flexible Rate"
                  />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description shown to guests"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Adjustment Type</Label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.adjustment_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjustment_type: e.target.value }))}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <Label>Adjustment Value (use negative for discount)</Label>
                  <Input 
                    type="number"
                    value={formData.adjustment_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjustment_value: parseFloat(e.target.value) }))}
                    placeholder="-15 for 15% discount"
                  />
                </div>
              </div>

              <div>
                <Label>Cancellation Terms</Label>
                <Textarea 
                  value={formData.cancellation_terms.terms}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    cancellation_terms: { ...prev.cancellation_terms, terms: e.target.value }
                  }))}
                  placeholder="e.g., Full refund if cancelled 24+ hours before check-in"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Refund Percentage</Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={formData.cancellation_terms.refund_percentage}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      cancellation_terms: { ...prev.cancellation_terms, refund_percentage: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label>Notice Hours Required</Label>
                  <Input 
                    type="number"
                    value={formData.cancellation_terms.notice_hours}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      cancellation_terms: { ...prev.cancellation_terms, notice_hours: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label>Display Order</Label>
                <Input 
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label>Featured</Label>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => saveMutation.mutate(formData)}
                disabled={saveMutation.isPending}
              >
                {editingPolicy ? 'Update' : 'Create'} Policy
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Policy Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Adjustment</TableHead>
            <TableHead>Refund %</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies?.map((policy) => (
            <TableRow key={policy.id}>
              <TableCell className="font-medium">{policy.policy_name}</TableCell>
              <TableCell><code>{policy.policy_code}</code></TableCell>
              <TableCell>
                {policy.adjustment_value > 0 ? '+' : ''}{policy.adjustment_value}
                {policy.adjustment_type === 'percentage' ? '%' : '₹'}
              </TableCell>
              <TableCell>{policy.cancellation_terms?.refund_percentage || 0}%</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {policy.is_active && <Badge>Active</Badge>}
                  {policy.is_featured && <Badge variant="secondary">Featured</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(policy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CancellationPoliciesManagement;
