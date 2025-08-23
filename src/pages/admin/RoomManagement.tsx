import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, IndianRupee, Home, Eye, Upload, LayoutGrid, List, Search, AlertTriangle, ArrowLeft, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { BulkUnitsDialog } from '@/components/admin/BulkUnitsDialog';
import { BedConfiguration } from '@/components/admin/BedConfiguration';

const ROOM_FEATURES = [
  'Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Balcony', 
  'Sea View', 'Mountain View', 'Room Service', 'Kitchenette', 'Jacuzzi',
  'Private Bathroom', 'Hair Dryer', 'Safe', 'Coffee Machine', 'Terrace'
];

interface RoomType {
  id: string;
  name: string;
  description?: string;
  hero_image?: string;
  gallery: string[];
  max_guests: number;
  features: string[];
  base_price: number;
  seasonal_pricing: any;
  availability_calendar: any;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface RoomUnit {
  id: string;
  room_type_id: string;
  unit_number: string;
  unit_name?: string | null;
  floor_number?: number | null;
  area_sqft?: number | null;
  status: string;
  special_features: any;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  room_types?: {
    name: string;
  };
}

export default function RoomManagement() {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [units, setUnits] = useState<RoomUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [editingUnit, setEditingUnit] = useState<RoomUnit | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'units'>('rooms');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hero_image: '',
    gallery: [''],
    max_guests: 2,
    features: [] as string[],
    base_price: 0,
    is_published: false,
  });

  const [unitFormData, setUnitFormData] = useState({
    room_type_id: '',
    unit_number: '',
    unit_name: '',
    floor_number: '',
    area_sqft: '',
    status: 'available',
    special_features: '',
    notes: ''
  });
  
  const [unitMaxOccupancy, setUnitMaxOccupancy] = useState(2);
  const [unitBedConfigs, setUnitBedConfigs] = useState<any[]>([]);
  
  // Bulk form state
  const [bulkData, setBulkData] = useState({
    prefix: '',
    startNumber: 1,
    endNumber: 10,
    floor: '',
    areaSqft: '',
    status: 'available',
    features: '',
  });
  const [bulkMaxOccupancy, setBulkMaxOccupancy] = useState(2);
  const [bulkBedConfigs, setBulkBedConfigs] = useState<any[]>([]);

  useEffect(() => {
    loadRooms();
    loadUnits();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = (data || []).map(room => ({
        ...room,
        gallery: Array.isArray(room.gallery) ? room.gallery.filter((url: any) => typeof url === 'string') : [],
        features: Array.isArray(room.features) ? room.features.filter((feature: any) => typeof feature === 'string') : []
      })) as RoomType[];

      setRooms(processedData);
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

  const loadUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('room_units')
        .select(`
          *,
          room_types(name)
        `)
        .order('unit_number');

      if (error) throw error;

      const processedData = (data || []).map(unit => ({
        ...unit,
        special_features: Array.isArray(unit.special_features) ? unit.special_features : []
      }));
      setUnits(processedData);
    } catch (error) {
      console.error('Error loading units:', error);
      toast({
        title: "Error",
        description: "Failed to load units",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hero_image: '',
      gallery: [''],
      max_guests: 2,
      features: [],
      base_price: 0,
      is_published: false,
    });
    setEditingRoom(null);
  };

  const resetUnitForm = () => {
    setUnitFormData({
      room_type_id: '',
      unit_number: '',
      unit_name: '',
      floor_number: '',
      area_sqft: '',
      status: 'available',
      special_features: '',
      notes: ''
    });
    setUnitMaxOccupancy(2);
    setUnitBedConfigs([]);
    setEditingUnit(null);
    setShowUnitForm(false);
  };

  const resetRoomForm = () => {
    setFormData({
      name: '',
      description: '',
      hero_image: '',
      gallery: [''],
      max_guests: 2,
      features: [],
      base_price: 0,
      is_published: false,
    });
    setEditingRoom(null);
    setShowRoomForm(true);
  };

  const handleEdit = (room: RoomType) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      hero_image: room.hero_image || '',
      gallery: room.gallery.length > 0 ? room.gallery : [''],
      max_guests: room.max_guests,
      features: room.features,
      base_price: Number(room.base_price),
      is_published: room.is_published,
    });
    setShowRoomForm(true);
  };

  const handleEditUnit = (unit: RoomUnit) => {
    setEditingUnit(unit);
    
    const reverseFloorMap: { [key: number]: string } = {
      [-1]: 'basement',
      [0]: 'ground',
      [1]: '1st',
      [2]: '2nd'
    };
    
    setUnitFormData({
      room_type_id: unit.room_type_id,
      unit_number: unit.unit_number,
      unit_name: unit.unit_name || '',
      floor_number: unit.floor_number !== null ? reverseFloorMap[unit.floor_number] || '' : '',
      area_sqft: unit.area_sqft?.toString() || '',
      status: unit.status,
      special_features: unit.special_features.join(', '),
      notes: unit.notes || ''
    });
    
    // Load existing bed configuration and max occupancy if available
    if ((unit as any).max_occupancy) {
      setUnitMaxOccupancy((unit as any).max_occupancy);
    }
    if ((unit as any).bed_configuration) {
      setUnitBedConfigs((unit as any).bed_configuration);
    } else {
      setUnitBedConfigs([]);
    }
    
    setShowUnitForm(true);
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

      setShowRoomForm(false);
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

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const floorMap: { [key: string]: number } = {
      'basement': -1,
      'ground': 0,
      '1st': 1,
      '2nd': 2
    };

    const unitData = {
      room_type_id: unitFormData.room_type_id,
      unit_number: unitFormData.unit_number,
      unit_name: unitFormData.unit_name || null,
      floor_number: unitFormData.floor_number ? floorMap[unitFormData.floor_number] ?? null : null,
      area_sqft: unitFormData.area_sqft ? parseFloat(unitFormData.area_sqft) : null,
      status: unitFormData.status,
      special_features: unitFormData.special_features 
        ? unitFormData.special_features.split(',').map(f => f.trim()).filter(f => f)
        : [],
      notes: unitFormData.notes || null,
      max_occupancy: unitMaxOccupancy,
      bed_configuration: unitBedConfigs,
    };

    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('room_units')
          .update(unitData)
          .eq('id', editingUnit.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Room unit updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('room_units')
          .insert([unitData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Room unit created successfully",
        });
      }

      loadUnits();
      resetUnitForm();
      setShowUnitForm(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save room unit",
        variant: "destructive",
      });
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

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room unit?')) return;

    const { error } = await supabase
      .from('room_units')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete room unit",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Room unit deleted successfully",
    });
    loadUnits();
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

  const toggleUnitStatus = async (unit: RoomUnit) => {
    const newStatus = unit.status === 'available' ? 'maintenance' : 'available';
    
    const { error } = await supabase
      .from('room_units')
      .update({ status: newStatus })
      .eq('id', unit.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update unit status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Unit status updated to ${newStatus}`,
    });
    loadUnits();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "out_of_order": return "bg-red-100 text-red-800";
      case "occupied": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'published' && room.is_published) ||
      (statusFilter === 'draft' && !room.is_published);
    return matchesSearch && matchesStatus;
  });

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.unit_name && unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (unit.room_types?.name && unit.room_types.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Room Management</h1>
        </div>
        
        {activeTab === 'rooms' && !showRoomForm && (
          <Button onClick={resetRoomForm} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Room Type
          </Button>
        )}
        
        {activeTab === 'units' && !showUnitForm && !showBulkForm && (
          <div className="flex items-center gap-2">
            <Button onClick={() => {resetUnitForm(); setShowUnitForm(true);}} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkForm(true)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Add
            </Button>
          </div>
        )}
      </div>
      
      {/* Room Form Section */}
      {activeTab === 'rooms' && showRoomForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingRoom ? "Edit Room Type" : "Add New Room Type"}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowRoomForm(false);
                  setEditingRoom(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Room Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Deluxe Room"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="base_price">Base Price (₹) *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({...formData, base_price: Number(e.target.value)})}
                    placeholder="2500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_guests">Max Guests *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({...formData, max_guests: Number(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hero_image">Hero Image URL</Label>
                  <Input
                    id="hero_image"
                    value={formData.hero_image}
                    onChange={(e) => setFormData({...formData, hero_image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the room..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Features</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {ROOM_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={feature}
                        checked={formData.features.includes(feature)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({...formData, features: [...formData.features, feature]});
                          } else {
                            setFormData({...formData, features: formData.features.filter(f => f !== feature)});
                          }
                        }}
                      />
                      <Label htmlFor={feature} className="text-sm">{feature}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Gallery Images</Label>
                {formData.gallery.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 mt-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newGallery = [...formData.gallery];
                        newGallery[index] = e.target.value;
                        setFormData({...formData, gallery: newGallery});
                      }}
                      placeholder="https://example.com/gallery-image.jpg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formData.gallery.length > 1) {
                          setFormData({
                            ...formData,
                            gallery: formData.gallery.filter((_, i) => i !== index)
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({...formData, gallery: [...formData.gallery, '']})}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
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
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowRoomForm(false);
                    setEditingRoom(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingRoom ? 'Update Room' : 'Create Room')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Unit Form Section */}
      {activeTab === 'units' && showUnitForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {editingUnit ? "Edit Room Unit" : "Add New Room Unit"}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                  onClick={() => {
                    setShowUnitForm(false);
                    setEditingUnit(null);
                  }}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnitSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="room_type_id">Room Type *</Label>
                  <Select 
                    value={unitFormData.room_type_id} 
                    onValueChange={(value) => setUnitFormData({...unitFormData, room_type_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit_number">Unit Number *</Label>
                  <Input
                    id="unit_number"
                    value={unitFormData.unit_number}
                    onChange={(e) => setUnitFormData({...unitFormData, unit_number: e.target.value})}
                    placeholder="e.g., 101, A1, etc."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit_name">Unit Name</Label>
                  <Input
                    id="unit_name"
                    value={unitFormData.unit_name}
                    onChange={(e) => setUnitFormData({...unitFormData, unit_name: e.target.value})}
                    placeholder="e.g., Garden View Suite"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={unitFormData.status} 
                    onValueChange={(value) => setUnitFormData({...unitFormData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="out_of_order">Out of Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="floor_number">Floor</Label>
                  <Select 
                    value={unitFormData.floor_number} 
                    onValueChange={(value) => setUnitFormData({...unitFormData, floor_number: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basement">Basement</SelectItem>
                      <SelectItem value="ground">Ground</SelectItem>
                      <SelectItem value="1st">1st Floor</SelectItem>
                      <SelectItem value="2nd">2nd Floor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="area_sqft">Area (sq ft)</Label>
                  <Input
                    id="area_sqft"
                    type="number"
                    step="0.01"
                    value={unitFormData.area_sqft}
                    onChange={(e) => setUnitFormData({...unitFormData, area_sqft: e.target.value})}
                    placeholder="350"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special_features">Special Features</Label>
                <Input
                  id="special_features"
                  value={unitFormData.special_features}
                  onChange={(e) => setUnitFormData({...unitFormData, special_features: e.target.value})}
                  placeholder="Balcony, Garden View, Premium Location (comma separated)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={unitFormData.notes}
                  onChange={(e) => setUnitFormData({...unitFormData, notes: e.target.value})}
                  placeholder="Any special notes about this unit..."
                />
              </div>

              <BedConfiguration 
                onConfigChange={(occupancy, configs) => {
                  setUnitMaxOccupancy(occupancy);
                  setUnitBedConfigs(configs);
                }}
                initialConfig={unitBedConfigs}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowUnitForm(false);
                    setEditingUnit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUnit ? "Update Unit" : "Create Unit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Form Section */}
      {activeTab === 'units' && showBulkForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bulk Add Room Units</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBulkForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Unit Prefix</Label>
                  <Input
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({...bulkData, prefix: e.target.value})}
                    placeholder="A, B, etc."
                  />
                </div>
                <div>
                  <Label>Start Number</Label>
                  <Input
                    type="number"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({...bulkData, startNumber: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>End Number</Label>
                  <Input
                    type="number"
                    value={bulkData.endNumber}
                    onChange={(e) => setBulkData({...bulkData, endNumber: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <BedConfiguration 
                onConfigChange={(occupancy, configs) => {
                  setBulkMaxOccupancy(occupancy);
                  setBulkBedConfigs(configs);
                }}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBulkForm(false)}>
                  Cancel
                </Button>
                <Button>
                  Create {bulkData.endNumber - bulkData.startNumber + 1} Units
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'rooms' | 'units')}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="rooms">Room Types</TabsTrigger>
            <TabsTrigger value="units">Room Units</TabsTrigger>
          </TabsList>
          
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
                placeholder={activeTab === 'rooms' ? 'Search room types...' : 'Search units...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Status</option>
              {activeTab === 'rooms' ? (
                <>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </>
              ) : (
                <>
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                  <option value="occupied">Occupied</option>
                </>
              )}
            </select>
          </div>
        </div>


        <TabsContent value="rooms">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('units')}
                        title="View Units"
                      >
                        <Home className="w-4 h-4" />
                      </Button>
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
          ) : viewMode === 'list' ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Name</TableHead>
                    <TableHead>Max Guests</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          {room.hero_image && (
                            <img 
                              src={room.hero_image} 
                              alt={room.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <span>{room.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{room.max_guests}</TableCell>
                      <TableCell>₹{room.base_price}</TableCell>
                      <TableCell>
                        <Badge variant={room.is_published ? "default" : "secondary"}>
                          {room.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab('units')}
                            title="View Units"
                          >
                            <Home className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                            <Edit className="w-4 h-4" />
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          
          {filteredRooms.length === 0 && !showRoomForm && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No room types found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by creating your first room type.
                </p>
                <Button onClick={resetRoomForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Room Type
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="units">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map((unit) => (
                <Card key={unit.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Unit {unit.unit_number}
                      </CardTitle>
                      <Badge className={getStatusColor(unit.status)}>
                        {unit.status}
                      </Badge>
                    </div>
                    {unit.unit_name && (
                      <p className="text-sm text-muted-foreground">{unit.unit_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {unit.room_types?.name}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {unit.floor_number && (
                        <div>
                          <span className="font-medium">Floor:</span> {unit.floor_number}
                        </div>
                      )}
                      {unit.area_sqft && (
                        <div>
                          <span className="font-medium">Area:</span> {unit.area_sqft} sq ft
                        </div>
                      )}
                    </div>

                    {unit.special_features && unit.special_features.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {unit.special_features.map((feature: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {unit.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{unit.notes}</p>
                      </div>
                    )}

                    <div className="flex justify-between pt-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUnit(unit)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={unit.status === "available" ? "outline" : "default"}
                          onClick={() => toggleUnitStatus(unit)}
                          className="h-8 px-2"
                        >
                          {unit.status === "available" ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Home className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="h-8 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Number</TableHead>
                    <TableHead>Unit Name</TableHead>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.unit_number}</TableCell>
                      <TableCell>{unit.unit_name || '-'}</TableCell>
                      <TableCell>{unit.room_types?.name}</TableCell>
                      <TableCell>{unit.floor_number || '-'}</TableCell>
                      <TableCell>{unit.area_sqft ? `${unit.area_sqft} sq ft` : '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(unit.status)}>
                          {unit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUnit(unit)}
                            className="h-8 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={unit.status === "available" ? "outline" : "default"}
                            onClick={() => toggleUnitStatus(unit)}
                            className="h-8 px-2"
                          >
                            {unit.status === "available" ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Home className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUnit(unit.id)}
                            className="h-8 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {filteredUnits.length === 0 && !showUnitForm && !showBulkForm && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No room units found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding some room units.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => {resetUnitForm(); setShowUnitForm(true);}}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Unit
                  </Button>
                  <Button variant="outline" onClick={() => setShowBulkForm(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Add Units
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}