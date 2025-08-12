import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Grid, List, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '@/components/ImageUpload';

interface SpaService {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  duration: number | null;
  price: number;
  tags: any;
  booking_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SpaManagement = () => {
  const [services, setServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInactive, setShowInactive] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    description: '',
    duration: '',
    price: '',
    tags: [] as string[]
  });

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
        tags: Array.isArray(service.tags) ? service.tags : []
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
      description: '',
      duration: '',
      price: '',
      tags: []
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        title: formData.title,
        image: formData.image || null,
        description: formData.description || null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        price: parseFloat(formData.price),
        tags: formData.tags,
        booking_required: true,
        is_active: true
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

      setDialogOpen(false);
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
      description: service.description || '',
      duration: service.duration?.toString() || '',
      price: service.price.toString(),
      tags: service.tags || []
    });
    setEditingId(service.id);
    setDialogOpen(true);
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
    
    const matchesToggle = showInactive || service.is_active;
    
    return matchesSearch && matchesStatus && matchesToggle;
  });

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/admin')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">Spa Services Management</h1>
              <p className="text-muted-foreground font-body">Manage your spa services and treatments</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Spa Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Spa Service' : 'Add New Spa Service'}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Service Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="image">Service Image URL</Label>
                  <Input
                    id="image"
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Benefits/Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    })}
                    placeholder="Stress Relief, Muscle Relaxation, etc."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Update Service' : 'Create Service'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
            <div className="flex items-center gap-2">
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={(pressed) => setViewMode(pressed ? 'grid' : 'list')}
              >
                <Grid className="w-4 h-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={(pressed) => setViewMode(pressed ? 'list' : 'grid')}
              >
                <List className="w-4 h-4" />
              </Toggle>
            </div>

            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search spa services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Toggle
              pressed={showInactive}
              onPressedChange={setShowInactive}
            >
              <Eye className="w-4 h-4" />
            </Toggle>
          </div>
        </div>

        {/* Services Grid/List */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No spa services found.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Spa Service
            </Button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredServices.map((service) => (
              <Card key={service.id} className={`${viewMode === 'list' ? 'p-4' : ''}`}>
                <CardContent className={viewMode === 'grid' ? 'p-0' : 'p-0'}>
                  {viewMode === 'grid' ? (
                    <div className="space-y-4">
                      {service.image && (
                        <div className="relative">
                          <img 
                            src={service.image} 
                            alt={service.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                          <Badge 
                            variant={service.is_active ? "default" : "secondary"}
                            className="absolute top-2 right-2"
                          >
                            {service.is_active ? 'Active' : 'Inactive'}
                          </Badge>
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
                            {service.tags.slice(0, 3).map((tag, index) => (
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
    </div>
  );
};

export default SpaManagement;