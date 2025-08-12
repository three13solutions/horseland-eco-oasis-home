import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUpload from '@/components/ImageUpload';
import { Plus, Edit, Trash2, Search, Grid, List, Calendar, Users, ArrowLeft, Save, X, Hotel, Activity, Utensils, Sparkles } from 'lucide-react';

interface PackageData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  package_type: string;
  weekday_price: number;
  weekend_price: number;
  duration_days: number;
  max_guests: number;
  markup_percentage: number;
  inclusions: string[];
  faqs: any[];
  components: {
    room_units: string[];
    activities: string[];
    meals: string[];
    spa_services: string[];
  };
  banner_image?: string;
  featured_image?: string;
  gallery: string[];
  is_featured: boolean;
  is_active: boolean;
  cta_text?: string;
}

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name?: string;
  room_type_id: string;
  room_types?: { name: string };
}

interface Activity {
  id: string;
  title: string;
  price_amount?: number;
}

interface Meal {
  id: string;
  title: string;
  price: number;
}

interface SpaService {
  id: string;
  title: string;
  price: number;
}

const PackageManagement = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [roomUnits, setRoomUnits] = useState<RoomUnit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [spaServices, setSpaServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<Partial<PackageData>>({
    title: '',
    subtitle: '',
    description: '',
    package_type: 'family',
    weekday_price: 0,
    weekend_price: 0,
    duration_days: 1,
    max_guests: 2,
    markup_percentage: 0,
    inclusions: [],
    faqs: [],
    components: {
      room_units: [],
      activities: [],
      meals: [],
      spa_services: []
    },
    banner_image: '',
    featured_image: '',
    gallery: [],
    is_featured: false,
    is_active: true,
    cta_text: 'Book Now'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;
      setPackages((packagesData as any[]) || []);

      // Load room units
      const { data: roomUnitsData, error: roomUnitsError } = await supabase
        .from('room_units')
        .select(`
          id,
          unit_number,
          unit_name,
          room_type_id,
          room_types (
            name
          )
        `)
        .eq('is_active', true);

      if (roomUnitsError) throw roomUnitsError;
      setRoomUnits(roomUnitsData || []);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, price_amount')
        .eq('is_active', true);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load meals
      const { data: mealsData, error: mealsError } = await (supabase as any)
        .from('meals')
        .select('id, title, price')
        .eq('is_active', true);

      if (mealsError) throw mealsError;
      setMeals((mealsData as any[]) || []);

      // Load spa services
      const { data: spaData, error: spaError } = await supabase
        .from('spa_services')
        .select('id, title, price')
        .eq('is_active', true);

      if (spaError) throw spaError;
      setSpaServices(spaData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    let total = 0;
    
    formData.components?.activities?.forEach(activityId => {
      const activity = activities.find(a => a.id === activityId);
      if (activity?.price_amount) total += activity.price_amount;
    });
    
    formData.components?.meals?.forEach(mealId => {
      const meal = meals.find(m => m.id === mealId);
      if (meal?.price) total += meal.price;
    });
    
    formData.components?.spa_services?.forEach(serviceId => {
      const service = spaServices.find(s => s.id === serviceId);
      if (service?.price) total += service.price;
    });
    
    return total;
  };

  const handleSave = async () => {
    try {
      if (!formData.title) {
        toast({
          title: "Error",
          description: "Package title is required",
          variant: "destructive",
        });
        return;
      }

      const packageData = {
        ...formData,
        inclusions: formData.inclusions || [],
        faqs: formData.faqs || [],
        components: formData.components || {
          room_units: [],
          activities: [],
          meals: [],
          spa_services: []
        },
        gallery: formData.gallery || []
      };

      if (selectedPackage) {
        const { error } = await supabase
          .from('packages')
          .update(packageData as any)
          .eq('id', selectedPackage.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Package updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('packages')
          .insert([packageData as any]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Package created successfully",
        });
      }

      setShowForm(false);
      setSelectedPackage(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving package:', error);
      toast({
        title: "Error",
        description: "Failed to save package",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Package deleted successfully",
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast({
        title: "Error",
        description: "Failed to delete package",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      package_type: 'family',
      weekday_price: 0,
      weekend_price: 0,
      duration_days: 1,
      max_guests: 2,
      markup_percentage: 0,
      inclusions: [],
      faqs: [],
      components: {
        room_units: [],
        activities: [],
        meals: [],
        spa_services: []
      },
      banner_image: '',
      featured_image: '',
      gallery: [],
      is_featured: false,
      is_active: true,
      cta_text: 'Book Now'
    });
    setActiveTab('basic');
  };

  const openEditForm = (pkg: PackageData) => {
    setSelectedPackage(pkg);
    setFormData({
      ...pkg,
      components: pkg.components || {
        room_units: [],
        activities: [],
        meals: [],
        spa_services: []
      }
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setSelectedPackage(null);
    resetForm();
    setShowForm(true);
  };

  const handleComponentToggle = (type: keyof PackageData['components'], itemId: string) => {
    setFormData(prev => ({
      ...prev,
      components: {
        ...prev.components!,
        [type]: prev.components![type].includes(itemId)
          ? prev.components![type].filter(id => id !== itemId)
          : [...prev.components![type], itemId]
      }
    }));
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'room_units': return <Hotel className="w-5 h-5" />;
      case 'activities': return <Activity className="w-5 h-5" />;
      case 'meals': return <Utensils className="w-5 h-5" />;
      case 'spa_services': return <Sparkles className="w-5 h-5" />;
      default: return null;
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.package_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-96">Loading...</div>;
  }

  if (showForm) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Packages
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {selectedPackage ? 'Edit Package' : 'Create Package'}
              </h1>
              <p className="text-muted-foreground">
                {selectedPackage ? 'Update package details' : 'Add a new travel package'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Package
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Package Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Package title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                      placeholder="Package subtitle"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Package description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="package_type">Package Type</Label>
                    <Select 
                      value={formData.package_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, package_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="couple">Couple</SelectItem>
                        <SelectItem value="solo">Solo</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (Days)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 1 }))}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_guests">Max Guests</Label>
                    <Input
                      id="max_guests"
                      type="number"
                      value={formData.max_guests}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) || 1 }))}
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekday_price">Weekday Price (₹)</Label>
                    <Input
                      id="weekday_price"
                      type="number"
                      value={formData.weekday_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, weekday_price: parseFloat(e.target.value) || 0 }))}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend_price">Weekend Price (₹)</Label>
                    <Input
                      id="weekend_price"
                      type="number"
                      value={formData.weekend_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, weekend_price: parseFloat(e.target.value) || 0 }))}
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Room Units */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {getComponentIcon('room_units')}
                    Rooms ({formData.components?.room_units?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roomUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.components?.room_units?.includes(unit.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-border'
                      }`}
                      onClick={() => handleComponentToggle('room_units', unit.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{unit.unit_name || `Unit ${unit.unit_number}`}</div>
                          <div className="text-sm text-muted-foreground">
                            {unit.room_types?.name} • Room {unit.unit_number}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          formData.components?.room_units?.includes(unit.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`} />
                      </div>
                    </div>
                  ))}
                  {roomUnits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No rooms available</p>
                  )}
                </CardContent>
              </Card>

              {/* Activities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {getComponentIcon('activities')}
                    Activities ({formData.components?.activities?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.components?.activities?.includes(activity.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-border'
                      }`}
                      onClick={() => handleComponentToggle('activities', activity.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{activity.title}</div>
                          {activity.price_amount && (
                            <div className="text-sm text-muted-foreground">₹{activity.price_amount}</div>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          formData.components?.activities?.includes(activity.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`} />
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No activities available</p>
                  )}
                </CardContent>
              </Card>

              {/* Meals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {getComponentIcon('meals')}
                    Meals ({formData.components?.meals?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meals.map((meal) => (
                    <div
                      key={meal.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.components?.meals?.includes(meal.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-border'
                      }`}
                      onClick={() => handleComponentToggle('meals', meal.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{meal.title}</div>
                          <div className="text-sm text-muted-foreground">₹{meal.price}</div>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          formData.components?.meals?.includes(meal.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`} />
                      </div>
                    </div>
                  ))}
                  {meals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No meals available</p>
                  )}
                </CardContent>
              </Card>

              {/* Spa Services */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {getComponentIcon('spa_services')}
                    Spa Services ({formData.components?.spa_services?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {spaServices.map((service) => (
                    <div
                      key={service.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.components?.spa_services?.includes(service.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-border'
                      }`}
                      onClick={() => handleComponentToggle('spa_services', service.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{service.title}</div>
                          <div className="text-sm text-muted-foreground">₹{service.price}</div>
                        </div>
                        <div className={`w-4 h-4 rounded border-2 ${
                          formData.components?.spa_services?.includes(service.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`} />
                      </div>
                    </div>
                  ))}
                  {spaServices.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No spa services available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cost Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Package Components Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{formData.components?.room_units?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Rooms</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{formData.components?.activities?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Activities</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{formData.components?.meals?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Meals</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{formData.components?.spa_services?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Spa Services</div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold">Total Component Cost</div>
                    <div className="text-3xl font-bold text-primary">₹{calculateTotalCost()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Featured Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    label="Featured Image"
                    value={formData.featured_image || ''}
                    onChange={(url) => setFormData(prev => ({ ...prev, featured_image: url }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banner Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    label="Banner Image"
                    value={formData.banner_image || ''}
                    onChange={(url) => setFormData(prev => ({ ...prev, banner_image: url }))}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Package Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Featured Package</Label>
                    <p className="text-sm text-muted-foreground">
                      Mark this package as featured to highlight it
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this package available for booking
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta_text">Call to Action Text</Label>
                  <Input
                    id="cta_text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                    placeholder="Book Now"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markup_percentage">Markup Percentage</Label>
                  <Input
                    id="markup_percentage"
                    type="number"
                    value={formData.markup_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    max="100"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Package Management</h1>
          <p className="text-muted-foreground">Manage your travel packages</p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden">
              <div className="relative h-48">
                <img
                  src={pkg.featured_image || pkg.banner_image || '/placeholder.svg'}
                  alt={pkg.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {pkg.is_featured && <Badge variant="secondary">Featured</Badge>}
                  <Badge variant={pkg.is_active ? 'default' : 'destructive'}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{pkg.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {pkg.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      {pkg.duration_days} days
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" />
                      Max {pkg.max_guests} guests
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{pkg.weekday_price}</div>
                    {pkg.weekend_price !== pkg.weekday_price && (
                      <div className="text-sm text-muted-foreground">
                        Weekend: ₹{pkg.weekend_price}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditForm(pkg)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(pkg.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Weekday Price</TableHead>
                <TableHead>Weekend Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={pkg.featured_image || pkg.banner_image || '/placeholder.svg'}
                        alt={pkg.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium">{pkg.title}</div>
                        <div className="text-sm text-muted-foreground">{pkg.subtitle}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pkg.package_type}</Badge>
                  </TableCell>
                  <TableCell>{pkg.duration_days} days</TableCell>
                  <TableCell>{pkg.max_guests}</TableCell>
                  <TableCell>₹{pkg.weekday_price}</TableCell>
                  <TableCell>₹{pkg.weekend_price}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {pkg.is_featured && <Badge variant="secondary">Featured</Badge>}
                      <Badge variant={pkg.is_active ? 'default' : 'destructive'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditForm(pkg)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(pkg.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default PackageManagement;