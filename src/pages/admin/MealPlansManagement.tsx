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
import { Checkbox } from "@/components/ui/checkbox";

interface MealPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  description: string;
  included_meal_types: string[];
  preferred_variant: string;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

const MealPlansManagement = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_code: '',
    plan_name: '',
    description: '',
    included_meal_types: [] as string[],
    preferred_variant: 'veg',
    display_order: 0,
    is_active: true,
    is_featured: false
  });

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_rules')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as MealPlan[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingPlan) {
        const { error } = await supabase
          .from('meal_plan_rules')
          .update(data)
          .eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('meal_plan_rules')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      setIsOpen(false);
      resetForm();
      toast.success(editingPlan ? 'Meal plan updated' : 'Meal plan created');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meal_plan_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      toast.success('Meal plan deleted');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      plan_code: '',
      plan_name: '',
      description: '',
      included_meal_types: [],
      preferred_variant: 'veg',
      display_order: 0,
      is_active: true,
      is_featured: false
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: MealPlan) => {
    setEditingPlan(plan);
    setFormData({
      plan_code: plan.plan_code,
      plan_name: plan.plan_name,
      description: plan.description || '',
      included_meal_types: plan.included_meal_types || [],
      preferred_variant: plan.preferred_variant,
      display_order: plan.display_order,
      is_active: plan.is_active,
      is_featured: plan.is_featured
    });
    setIsOpen(true);
  };

  const handleMealTypeToggle = (mealType: string) => {
    setFormData(prev => ({
      ...prev,
      included_meal_types: prev.included_meal_types.includes(mealType)
        ? prev.included_meal_types.filter(m => m !== mealType)
        : [...prev.included_meal_types, mealType]
    }));
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meal Plans Management</h1>
          <p className="text-muted-foreground">Configure meal plan options for bookings</p>
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>How It Works:</strong> Meal plans are now independent from cancellation policies in the booking flow. 
              Users select a meal plan separately, and the cost is calculated based on the included meal types, guest count, 
              and number of nights. The meal cost is then combined with the room rate before applying any cancellation policy adjustments.
            </p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Meal Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit' : 'Add'} Meal Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plan Code</Label>
                  <Input 
                    value={formData.plan_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan_code: e.target.value }))}
                    placeholder="e.g., breakfast_included"
                  />
                </div>
                <div>
                  <Label>Plan Name</Label>
                  <Input 
                    value={formData.plan_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                    placeholder="e.g., Breakfast Included"
                  />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this meal plan"
                />
              </div>

              <div>
                <Label>Included Meals</Label>
                <div className="flex gap-4 mt-2">
                  {['breakfast', 'lunch', 'dinner'].map(mealType => (
                    <div key={mealType} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={formData.included_meal_types.includes(mealType)}
                        onCheckedChange={() => handleMealTypeToggle(mealType)}
                      />
                      <label className="capitalize">{mealType}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preferred Variant</Label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.preferred_variant}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferred_variant: e.target.value }))}
                  >
                    <option value="veg">Veg</option>
                    <option value="non_veg">Non-Veg</option>
                    <option value="jain">Jain</option>
                  </select>
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input 
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                  />
                </div>
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
                {editingPlan ? 'Update' : 'Create'} Meal Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Included Meals</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mealPlans?.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.plan_name}</TableCell>
              <TableCell><code>{plan.plan_code}</code></TableCell>
              <TableCell>
                {plan.included_meal_types?.length > 0 ? (
                  plan.included_meal_types.map(m => (
                    <Badge key={m} variant="outline" className="mr-1 capitalize">{m}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {plan.is_active && <Badge>Active</Badge>}
                  {plan.is_featured && <Badge variant="secondary">Featured</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(plan.id)}
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

export default MealPlansManagement;
