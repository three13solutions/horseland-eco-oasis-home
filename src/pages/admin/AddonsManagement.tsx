import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  Package,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface Addon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AddonsManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch addons
  const { data: addons, isLoading } = useQuery({
    queryKey: ['addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Addon[];
    }
  });

  // Create addon mutation
  const createAddonMutation = useMutation({
    mutationFn: async (addon: Omit<Addon, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('addons')
        .insert([addon])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      resetForm();
      toast.success('Addon created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create addon: ' + error.message);
    }
  });

  // Update addon mutation
  const updateAddonMutation = useMutation({
    mutationFn: async ({ id, ...addon }: Partial<Addon> & { id: string }) => {
      const { data, error } = await supabase
        .from('addons')
        .update(addon)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      resetForm();
      toast.success('Addon updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update addon: ' + error.message);
    }
  });

  // Delete addon mutation
  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] });
      toast.success('Addon deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete addon: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      is_active: true
    });
    setEditingAddon(null);
    setShowForm(false);
  };

  const handleEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price,
      category: addon.category,
      is_active: addon.is_active
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAddon) {
      updateAddonMutation.mutate({
        id: editingAddon.id,
        ...formData
      });
    } else {
      createAddonMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this addon?')) {
      deleteAddonMutation.mutate(id);
    }
  };

  const filteredAddons = addons?.filter(addon =>
    addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    addon.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold font-heading">Addons Management</h1>
          <p className="text-muted-foreground">Manage additional services and extras</p>
        </div>
        
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Addon
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingAddon ? 'Edit Addon' : 'Add New Addon'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter addon name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Transportation, Equipment, etc."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter addon description..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createAddonMutation.isPending || updateAddonMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingAddon ? 'Update' : 'Create'} Addon
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search addons by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Addons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAddons.map((addon) => (
          <Card key={addon.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-heading">{addon.name}</CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {addon.category}
                    </Badge>
                  </CardDescription>
                </div>
                <Badge variant={addon.is_active ? "default" : "secondary"}>
                  {addon.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {addon.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {addon.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-primary">₹{addon.price}</span>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(addon)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(addon.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAddons.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Addons Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No addons match your search criteria.' : 'Get started by creating your first addon.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Addon
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}