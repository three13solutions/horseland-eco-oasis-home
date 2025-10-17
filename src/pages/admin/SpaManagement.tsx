import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Grid, List, X, Check, ChevronsUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MediaPicker } from '@/components/admin/MediaPicker';

interface SpaService {
  id: string;
  title: string;
  image: string | null;
  image_key: string | null;
  description: string | null;
  duration: number | null;
  price: number;
  category: string;
  tags: any;
  booking_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media_urls?: any;
  media_keys?: any;
}

// Available benefits/tags for spa services
const AVAILABLE_BENEFITS = [
  'beauty', 'wellness', 'relaxation', 'rejuvenation', 'therapeutic', 
  'anti-aging', 'detox', 'stress-relief', 'skin-care', 'body-care',
  'facial', 'massage', 'aromatherapy', 'deep-cleansing', 'moisturizing'
];

const SpaManagement = () => {
  const [services, setServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'massage' | 'therapy' | 'facials' | 'workouts'>('all');
  
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    image_key: '',
    description: '',
    duration: '',
    price: '',
    category: 'massage',
    tags: [] as string[],
    media_keys: [] as string[]
  });

  const [benefitsOpen, setBenefitsOpen] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spa_services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices((data || []).map(service => ({
        ...service,
        tags: Array.isArray(service.tags) ? service.tags : [],
        media_urls: Array.isArray(service.media_urls) ? service.media_urls : []
      })));
    } catch (error) {
      console.error('Error loading spa services:', error);
      toast({
        title: "Error",
        description: "Failed to load spa services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image: '',
      image_key: '',
      description: '',
      duration: '',
      price: '',
      category: 'massage',
      tags: [],
      media_keys: []
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        title: formData.title,
        image: formData.image || null,
        image_key: formData.image_key || null,
        description: formData.description || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        price: parseFloat(formData.price),
        category: formData.category,
        tags: formData.tags,
        booking_required: true,
        is_active: true,
        media_keys: formData.media_keys
      };

      if (editingId) {
        const { error } = await supabase
          .from('spa_services')
          .update(serviceData)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Spa service updated successfully" });
      } else {
        const { error } = await supabase
          .from('spa_services')
          .insert([serviceData]);

        if (error) throw error;
        toast({ title: "Success", description: "Spa service created successfully" });
      }

      setShowForm(false);
      resetForm();
      loadServices();
    } catch (error) {
      console.error('Error saving spa service:', error);
      toast({
        title: "Error",
        description: "Failed to save spa service",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: SpaService) => {
    setFormData({
      title: service.title,
      image: service.image || '',
      image_key: service.image_key || '',
      description: service.description || '',
      duration: service.duration?.toString() || '',
      price: service.price.toString(),
      category: service.category || 'massage',
      tags: service.tags || [],
      media_keys: Array.isArray(service.media_keys) ? service.media_keys : []
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this spa service?')) return;

    try {
      const { error } = await supabase
        .from('spa_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Spa service deleted successfully" });
      loadServices();
    } catch (error) {
      console.error('Error deleting spa service:', error);
      toast({
        title: "Error",
        description: "Failed to delete spa service",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('spa_services')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Spa service ${!currentStatus ? 'activated' : 'deactivated'} successfully` 
      });
      loadServices();
    } catch (error) {
      console.error('Error updating spa service status:', error);
      toast({
        title: "Error",
        description: "Failed to update spa service status",
        variant: "destructive",
      });
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && service.is_active) ||
                         (statusFilter === 'inactive' && !service.is_active);
                         
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Spa Services
          </Button>
          <h1 className="text-2xl font-bold">
            {editingId ? 'Edit Spa Service' : 'Add New Spa Service'}
          </h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">Service Title*</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category*</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="massage">Massage</SelectItem>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="facials">Facials</SelectItem>
                      <SelectItem value="workouts">Workouts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">Price*</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <MediaPicker
                  label="Featured Image"
                  value={formData.image}
                  onChange={(url) => {
                    // Extract hardcoded_key from selected media
                    supabase
                      .from('gallery_images')
                      .select('hardcoded_key')
                      .eq('image_url', url)
                      .single()
                      .then(({ data }) => {
                        setFormData({ 
                          ...formData, 
                          image: url,
                          image_key: data?.hardcoded_key || ''
                        });
                      });
                  }}
                  categorySlug="spa"
                  folder="spa-media"
                />
              </div>

              <div>
                <Label>Additional Media Gallery (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select multiple images to create a gallery for this service
                </p>
                {/* TODO: Implement multi-select MediaPicker for gallery */}
                <p className="text-xs text-muted-foreground italic">
                  Multi-image gallery coming soon. For now, use featured image above.
                </p>
              </div>

              <div>
                <Label>Benefits/Tags</Label>
                <Popover open={benefitsOpen} onOpenChange={setBenefitsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={benefitsOpen}
                      className="w-full justify-between"
                    >
                      {formData.tags.length > 0
                        ? `${formData.tags.length} selected`
                        : "Select benefits..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search benefits..." />
                      <CommandList>
                        <CommandEmpty>No benefit found.</CommandEmpty>
                        <CommandGroup>
                          {AVAILABLE_BENEFITS.map((benefit) => (
                            <CommandItem
                              key={benefit}
                              onSelect={() => {
                                const isSelected = formData.tags.includes(benefit);
                                setFormData({
                                  ...formData,
                                  tags: isSelected
                                    ? formData.tags.filter(tag => tag !== benefit)
                                    : [...formData.tags, benefit]
                                });
                              }}
                            >
                              <Checkbox
                                checked={formData.tags.includes(benefit)}
                                className="mr-2"
                              />
                              {benefit}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <X 
                          className="ml-1 h-3 w-3 cursor-pointer" 
                          onClick={() => setFormData({
                            ...formData,
                            tags: formData.tags.filter(t => t !== tag)
                          })}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit">
                  {editingId ? 'Update Service' : 'Create Service'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading spa services...</p>
        </div>
      </div>
    );
  }

  // Count services with blob URLs
  const servicesWithBlobUrls = services.filter(s => s.image?.startsWith('blob:'));

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Spa Services Management</h1>
        </div>
        
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Spa Service
          </Button>
        )}
      </div>

      {/* Warning Banner for Blob URLs */}
      {servicesWithBlobUrls.length > 0 && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Badge variant="destructive" className="mt-0.5">
                {servicesWithBlobUrls.length}
              </Badge>
              <div>
                <h3 className="font-semibold mb-1">Invalid Images Detected</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {servicesWithBlobUrls.length} spa service{servicesWithBlobUrls.length > 1 ? 's have' : ' has'} temporary blob: URLs that won't display properly. 
                  These need to be re-uploaded from your computer. Look for the ⚠️ warning badge below.
                </p>
                <p className="text-xs text-muted-foreground">
                  Services affected: {servicesWithBlobUrls.map(s => s.title).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
            className="h-8 px-3"
          >
            All
          </Button>
          <Button
            variant={categoryFilter === 'massage' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('massage')}
            className="h-8 px-3"
          >
            Massage
          </Button>
          <Button
            variant={categoryFilter === 'therapy' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('therapy')}
            className="h-8 px-3"
          >
            Therapy
          </Button>
          <Button
            variant={categoryFilter === 'facials' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('facials')}
            className="h-8 px-3"
          >
            Facials
          </Button>
          <Button
            variant={categoryFilter === 'workouts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('workouts')}
            className="h-8 px-3"
          >
            Workouts
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
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
              placeholder="Search spa services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Services Grid/List */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No spa services found.</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Spa Service
          </Button>
        </div>
      ) : (
        <div className={viewMode === 'card' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredServices.map((service) => (
            <Card key={service.id} className={`${viewMode === 'list' ? 'p-4' : ''}`}>
              <CardContent className={viewMode === 'card' ? 'p-0' : 'p-0'}>
                {viewMode === 'card' ? (
                  <div className="space-y-4">
                     {service.image && (
                      <div className="relative">
                        <img 
                          src={service.image} 
                          alt={service.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          {service.image.startsWith('blob:') && (
                            <Badge variant="destructive" className="gap-1">
                              ⚠️ Invalid URL
                            </Badge>
                          )}
                          <Badge 
                            variant={service.is_active ? "default" : "secondary"}
                          >
                            {service.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-heading font-semibold text-lg mb-2">{service.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-4 mb-3 text-sm">
                        {service.duration && (
                          <span className="text-muted-foreground">
                            {service.duration} min
                          </span>
                        )}
                        <span className="font-semibold text-primary">₹{service.price}</span>
                      </div>
                      {service.tags && service.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {service.tags.slice(0, 3).map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {service.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{service.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(service)}
                          className="flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={service.is_active ? "secondary" : "default"}
                          onClick={() => toggleStatus(service.id, service.is_active)}
                        >
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4">
                    {service.image && (
                      <img 
                        src={service.image} 
                        alt={service.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold">{service.title}</h3>
                        {service.image?.startsWith('blob:') && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            ⚠️ Invalid URL
                          </Badge>
                        )}
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-1 line-clamp-1">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        {service.duration && (
                          <span className="text-muted-foreground">
                            {service.duration} min
                          </span>
                        )}
                        <span className="font-semibold text-primary">₹{service.price}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(service)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={service.is_active ? "secondary" : "default"}
                        onClick={() => toggleStatus(service.id, service.is_active)}
                      >
                        {service.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpaManagement;