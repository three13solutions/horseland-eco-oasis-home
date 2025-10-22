import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Grid, List, Edit, Trash2, ArrowLeft, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Meal {
  id: string;
  title: string;
  meal_type: 'breakfast' | 'lunch' | 'high_tea' | 'dinner';
  variant: 'veg' | 'non_veg' | 'jain';
  price: number;
  description: string;
  availability_start: string;
  availability_end: string;
  media_urls: string[];
  media_keys?: string[];
  featured_media: string;
  featured_media_key?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MealsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [variantFilter, setVariantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    meal_type: 'breakfast' | 'lunch' | 'high_tea' | 'dinner';
    variant: 'veg' | 'non_veg' | 'jain';
    price: number;
    description: string;
    availability_start: string;
    availability_end: string;
    featured_media: string;
    featured_media_key: string;
    is_active: boolean;
  }>({
    title: '',
    meal_type: 'breakfast',
    variant: 'veg',
    price: 0,
    description: '',
    availability_start: '00:00',
    availability_end: '23:59',
    featured_media: '',
    featured_media_key: '',
    is_active: true
  });

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error loading meals:', error);
      toast({
        title: "Error",
        description: "Failed to load meals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const mealData = {
        ...formData,
        price: Number(formData.price)
      };

      let result;
      if (editingMeal) {
        result = await (supabase as any)
          .from('meals')
          .update(mealData)
          .eq('id', editingMeal.id);
      } else {
        result = await (supabase as any)
          .from('meals')
          .insert([mealData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Meal ${editingMeal ? 'updated' : 'created'} successfully`
      });

      setIsDialogOpen(false);
      resetForm();
      loadMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingMeal ? 'update' : 'create'} meal`,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      title: meal.title,
      meal_type: meal.meal_type,
      variant: meal.variant,
      price: meal.price,
      description: meal.description || '',
      availability_start: meal.availability_start.slice(0, 5),
      availability_end: meal.availability_end.slice(0, 5),
      featured_media: meal.featured_media || '',
      featured_media_key: meal.featured_media_key || '',
      is_active: meal.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (mealId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('meals')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meal deleted successfully"
      });

      loadMeals();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast({
        title: "Error",
        description: "Failed to delete meal",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      meal_type: 'breakfast',
      variant: 'veg',
      price: 0,
      description: '',
      availability_start: '00:00',
      availability_end: '23:59',
      featured_media: '',
      featured_media_key: '',
      is_active: true
    });
    setEditingMeal(null);
  };

  const filteredMeals = meals.filter(meal => {
    const matchesSearch = meal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meal.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMealType = mealTypeFilter === 'all' || meal.meal_type === mealTypeFilter;
    const matchesVariant = variantFilter === 'all' || meal.variant === variantFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && meal.is_active) ||
                         (statusFilter === 'inactive' && !meal.is_active);
    
    return matchesSearch && matchesMealType && matchesVariant && matchesStatus;
  });

  const getMealTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      high_tea: 'High Tea',
      dinner: 'Dinner'
    };
    return labels[type] || type;
  };

  const getVariantLabel = (variant: string) => {
    const labels: { [key: string]: string } = {
      veg: 'Vegetarian',
      non_veg: 'Non-Vegetarian',
      jain: 'Jain'
    };
    return labels[variant] || variant;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const MealCard = ({ meal }: { meal: Meal }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative bg-muted">
        {meal.featured_media ? (
          <img
            src={meal.featured_media}
            alt={meal.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant={meal.is_active ? "default" : "secondary"}>
            {meal.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{meal.title}</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(meal)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Meal</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this meal? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(meal.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="flex gap-2 mb-2">
          <Badge variant="outline">{getMealTypeLabel(meal.meal_type)}</Badge>
          <Badge variant="outline">{getVariantLabel(meal.variant)}</Badge>
        </div>
        
        {meal.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {meal.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">₹{meal.price}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(meal.availability_start)} - {formatTime(meal.availability_end)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Meals Management</h1>
            <p className="text-muted-foreground">Manage meals and dining options</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add New Meal'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meal_type">Meal Type</Label>
                  <Select
                    value={formData.meal_type}
                    onValueChange={(value: any) => setFormData({...formData, meal_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select meal type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="high_tea">High Tea</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variant">Variant</Label>
                  <Select
                    value={formData.variant}
                    onValueChange={(value: any) => setFormData({...formData, variant: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="availability_start">Available From</Label>
                  <Input
                    id="availability_start"
                    type="time"
                    value={formData.availability_start}
                    onChange={(e) => setFormData({...formData, availability_start: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability_end">Available Until</Label>
                  <Input
                    id="availability_end"
                    type="time"
                    value={formData.availability_end}
                    onChange={(e) => setFormData({...formData, availability_end: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <MediaPicker
                label="Featured Image"
                value={formData.featured_media}
                onChange={async (url) => {
                  setFormData({...formData, featured_media: url});
                  // Fetch and save the hardcoded_key
                  const { data } = await supabase
                    .from('gallery_images')
                    .select('hardcoded_key')
                    .eq('image_url', url)
                    .single();
                  if (data?.hardcoded_key) {
                    setFormData(prev => ({...prev, featured_media_key: data.hardcoded_key}));
                  }
                }}
                categorySlug="dining"
                folder="meals"
              />

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingMeal ? 'Update Meal' : 'Create Meal'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={mealTypeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMealTypeFilter('all')}
            className="h-8 px-3"
          >
            All
          </Button>
          <Button
            variant={mealTypeFilter === 'breakfast' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMealTypeFilter('breakfast')}
            className="h-8 px-3"
          >
            Breakfast
          </Button>
          <Button
            variant={mealTypeFilter === 'lunch' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMealTypeFilter('lunch')}
            className="h-8 px-3"
          >
            Lunch
          </Button>
          <Button
            variant={mealTypeFilter === 'high_tea' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMealTypeFilter('high_tea')}
            className="h-8 px-3"
          >
            High Tea
          </Button>
          <Button
            variant={mealTypeFilter === 'dinner' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMealTypeFilter('dinner')}
            className="h-8 px-3"
          >
            Dinner
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          <Select value={variantFilter} onValueChange={setVariantFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Variants</SelectItem>
              <SelectItem value="veg">Vegetarian</SelectItem>
              <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
              <SelectItem value="jain">Jain</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {filteredMeals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No meals found</p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Meal
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeals.map((meal) => (
                <TableRow key={meal.id}>
                  <TableCell>
                    <div className="w-16 h-12 bg-muted rounded overflow-hidden">
                      {meal.featured_media ? (
                        <img
                          src={meal.featured_media}
                          alt={meal.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{meal.title}</div>
                      {meal.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {meal.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getMealTypeLabel(meal.meal_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getVariantLabel(meal.variant)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">₹{meal.price}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(meal.availability_start)} - {formatTime(meal.availability_end)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={meal.is_active ? "default" : "secondary"}>
                      {meal.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(meal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Meal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this meal? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(meal.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MealsManagement;