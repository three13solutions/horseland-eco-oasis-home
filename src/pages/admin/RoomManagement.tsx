import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Upload, ArrowLeft, Users, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface RoomType {
  id: string;
  name: string;
  hero_image: string | null;
  gallery: any;
  max_guests: number;
  features: any;
  description: string | null;
  base_price: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const ROOM_FEATURES = [
  'AC', 'Forest View', 'Balcony', 'Private Bathroom', 'TV', 'Mini Fridge', 
  'Tea/Coffee Maker', 'Room Service', 'Wifi', 'Ceiling Fan', 'Wardrobe', 'Desk'
];

const RoomManagement = () => {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    hero_image: '',
    gallery: [] as string[],
    max_guests: 2,
    features: [] as string[],
    description: '',
    base_price: 0,
    is_published: true,
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hero_image: '',
      gallery: [],
      max_guests: 2,
      features: [],
      description: '',
      base_price: 0,
      is_published: true,
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: RoomType) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      hero_image: room.hero_image || '',
      gallery: room.gallery || [],
      max_guests: room.max_guests,
      features: room.features || [],
      description: room.description || '',
      base_price: Number(room.base_price),
      is_published: room.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const roomData = {
        ...formData,
        gallery: formData.gallery.filter(url => url.trim() !== ''),
      };

      let error;
      if (editingRoom) {
        ({ error } = await supabase
          .from('room_types')
          .update(roomData)
          .eq('id', editingRoom.id));
      } else {
        ({ error } = await supabase
          .from('room_types')
          .insert([roomData]));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Room ${editingRoom ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      loadRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({
        title: "Error",
        description: "Failed to save room",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      const { error } = await supabase
        .from('room_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room deleted successfully",
      });

      loadRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  const togglePublish = async (room: RoomType) => {
    try {
      const { error } = await supabase
        .from('room_types')
        .update({ is_published: !room.is_published })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Room ${!room.is_published ? 'published' : 'unpublished'}`,
      });

      loadRooms();
    } catch (error) {
      console.error('Error updating room:', error);
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    }
  };

  const handleFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, features: [...prev.features, feature] }));
    } else {
      setFormData(prev => ({ ...prev, features: prev.features.filter(f => f !== feature) }));
    }
  };

  const addGalleryImage = () => {
    setFormData(prev => ({ ...prev, gallery: [...prev.gallery, ''] }));
  };

  const updateGalleryImage = (index: number, url: string) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.map((item, i) => i === index ? url : item)
    }));
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-xl font-serif font-semibold">Room Management</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                <DialogDescription>
                  {editingRoom ? 'Update room details' : 'Create a new room type'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Room Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Deluxe Forest View"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_guests">Max Guests *</Label>
                    <Input
                      id="max_guests"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.max_guests}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price per Night (₹) *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero_image">Hero Image URL</Label>
                  <Input
                    id="hero_image"
                    value={formData.hero_image}
                    onChange={(e) => setFormData(prev => ({ ...prev, hero_image: e.target.value }))}
                    placeholder="https://example.com/room-image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gallery Images</Label>
                  {formData.gallery.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => updateGalleryImage(index, e.target.value)}
                        placeholder="https://example.com/gallery-image.jpg"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeGalleryImage(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addGalleryImage}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Gallery Image
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Room Features</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ROOM_FEATURES.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature}
                          checked={formData.features.includes(feature)}
                          onCheckedChange={(checked) => handleFeatureChange(feature, checked as boolean)}
                        />
                        <Label htmlFor={feature} className="text-sm">{feature}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed room description..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                  />
                  <Label htmlFor="is_published">Publish room</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingRoom ? 'Update Room' : 'Create Room')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Users className="w-4 h-4" />
                      Up to {room.max_guests} guests
                      <span className="mx-2">•</span>
                      <IndianRupee className="w-4 h-4" />
                      ₹{room.base_price}/night
                    </CardDescription>
                  </div>
                  <Badge variant={room.is_published ? "default" : "secondary"}>
                    {room.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {room.hero_image && (
                  <img 
                    src={room.hero_image} 
                    alt={room.name}
                    className="w-full h-32 object-cover rounded-lg mb-4"
                  />
                )}
                
                {room.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {room.features.slice(0, 3).map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {room.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{room.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => togglePublish(room)}
                  >
                    {room.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(room.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RoomManagement;