import React, { useState } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RoomCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function RoomCategoriesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['room-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as RoomCategory[];
    },
  });

  const { data: roomTypeCounts = {} } = useQuery({
    queryKey: ['room-type-counts-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_types')
        .select('category_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((rt: any) => {
        if (rt.category_id) {
          counts[rt.category_id] = (counts[rt.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('room_categories')
          .update({
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            display_order: data.display_order,
            is_active: data.is_active,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('room_categories')
          .insert([{
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            display_order: data.display_order,
            is_active: data.is_active,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-categories'] });
      toast({
        title: 'Success',
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save category',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if any room types use this category
      const { data: roomTypes } = await supabase
        .from('room_types')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (roomTypes && roomTypes.length > 0) {
        throw new Error('Cannot delete category with assigned room types');
      }

      const { error } = await supabase
        .from('room_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-categories'] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('room_categories')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-categories'] });
      toast({
        title: 'Success',
        description: 'Category status updated',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      display_order: categories.length,
      is_active: true,
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: RoomCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingCategory?.id,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <div className="flex justify-end">
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: editingCategory ? formData.slug : generateSlug(name),
                      });
                    }}
                    placeholder="e.g., Superior"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., superior"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this category..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Room Types</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {category.display_order}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {roomTypeCounts[category.id] || 0} types
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: category.id, is_active: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this category?')) {
                          deleteMutation.mutate(category.id);
                        }
                      }}
                      className="text-destructive hover:text-destructive"
                      disabled={(roomTypeCounts[category.id] || 0) > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No categories yet. Create your first category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
