import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Home, AlertTriangle, Upload, LayoutGrid, List, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BulkUnitsDialog } from "@/components/admin/BulkUnitsDialog";

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
}

interface RoomType {
  id: string;
  name: string;
}

export default function RoomUnitsManagement() {
  const navigate = useNavigate();
  const { roomTypeId } = useParams<{ roomTypeId: string }>();
  const [units, setUnits] = useState<RoomUnit[]>([]);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<RoomUnit | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    unit_number: "",
    unit_name: "",
    floor_number: "",
    area_sqft: "",
    status: "available",
    special_features: "",
    notes: ""
  });

  useEffect(() => {
    if (roomTypeId) {
      loadRoomType();
      loadUnits();
    }
  }, [roomTypeId]);

  const loadRoomType = async () => {
    if (!roomTypeId) return;
    
    const { data, error } = await supabase
      .from("room_types")
      .select("id, name")
      .eq("id", roomTypeId)
      .single();

    if (error) {
      toast.error("Failed to load room type");
      return;
    }

    setRoomType(data);
  };

  const loadUnits = async () => {
    if (!roomTypeId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("room_units")
      .select("*")
      .eq("room_type_id", roomTypeId)
      .order("unit_number");

    if (error) {
      toast.error("Failed to load room units");
      setLoading(false);
      return;
    }

    const processedData = (data || []).map(unit => ({
      ...unit,
      special_features: Array.isArray(unit.special_features) ? unit.special_features : []
    }));
    setUnits(processedData);
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      unit_number: "",
      unit_name: "",
      floor_number: "",
      area_sqft: "",
      status: "available",
      special_features: "",
      notes: ""
    });
    setEditingUnit(null);
  };

  const handleEdit = (unit: RoomUnit) => {
    setEditingUnit(unit);
    setFormData({
      unit_number: unit.unit_number,
      unit_name: unit.unit_name || "",
      floor_number: unit.floor_number?.toString() || "",
      area_sqft: unit.area_sqft?.toString() || "",
      status: unit.status,
      special_features: unit.special_features.join(", "),
      notes: unit.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTypeId) return;

    const unitData = {
      room_type_id: roomTypeId,
      unit_number: formData.unit_number,
      unit_name: formData.unit_name || null,
      floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
      status: formData.status,
      special_features: formData.special_features 
        ? formData.special_features.split(",").map(f => f.trim()).filter(f => f)
        : [],
      notes: formData.notes || null,
    };

    try {
      if (editingUnit) {
        const { error } = await supabase
          .from("room_units")
          .update(unitData)
          .eq("id", editingUnit.id);

        if (error) throw error;
        toast.success("Room unit updated successfully");
      } else {
        const { error } = await supabase
          .from("room_units")
          .insert([unitData]);

        if (error) throw error;
        toast.success("Room unit created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      loadUnits();
    } catch (error: any) {
      toast.error(error.message || "Failed to save room unit");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room unit?")) return;

    const { error } = await supabase
      .from("room_units")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete room unit");
      return;
    }

    toast.success("Room unit deleted successfully");
    loadUnits();
  };

  const toggleStatus = async (unit: RoomUnit) => {
    const newStatus = unit.status === "available" ? "maintenance" : "available";
    
    const { error } = await supabase
      .from("room_units")
      .update({ status: newStatus })
      .eq("id", unit.id);

    if (error) {
      toast.error("Failed to update unit status");
      return;
    }

    toast.success(`Unit status updated to ${newStatus}`);
    loadUnits();
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

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.unit_name && unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase()));
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
          <Button
            variant="outline"
            onClick={() => navigate("/admin/room-management")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Room Types
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Room Units Management</h1>
            <p className="text-muted-foreground">{roomType?.name} - Individual Units</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Add
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Unit
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "Edit Room Unit" : "Add New Room Unit"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit_number">Unit Number *</Label>
                  <Input
                    id="unit_number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                    placeholder="e.g., 101, A1, etc."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit_name">Unit Name</Label>
                  <Input
                    id="unit_name"
                    value={formData.unit_name}
                    onChange={(e) => setFormData({...formData, unit_name: e.target.value})}
                    placeholder="e.g., Garden View Suite"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floor_number">Floor Number</Label>
                  <Input
                    id="floor_number"
                    type="number"
                    value={formData.floor_number}
                    onChange={(e) => setFormData({...formData, floor_number: e.target.value})}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="area_sqft">Area (sq ft)</Label>
                  <Input
                    id="area_sqft"
                    type="number"
                    step="0.01"
                    value={formData.area_sqft}
                    onChange={(e) => setFormData({...formData, area_sqft: e.target.value})}
                    placeholder="350"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
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

              <div>
                <Label htmlFor="special_features">Special Features</Label>
                <Input
                  id="special_features"
                  value={formData.special_features}
                  onChange={(e) => setFormData({...formData, special_features: e.target.value})}
                  placeholder="Balcony, Garden View, Premium Location (comma separated)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any special notes about this unit..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUnit ? "Update Unit" : "Create Unit"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        
        <BulkUnitsDialog
          isOpen={isBulkDialogOpen}
          onOpenChange={setIsBulkDialogOpen}
          roomTypeId={roomTypeId!}
          onUnitsAdded={loadUnits}
        />
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="out_of_order">Out of Order</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-1 border rounded-md">
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className="rounded-r-none"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

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

              {unit.special_features.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {unit.special_features.map((feature, index) => (
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
                    onClick={() => handleEdit(unit)}
                    className="h-8 px-2"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={unit.status === "available" ? "outline" : "default"}
                    onClick={() => toggleStatus(unit)}
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
                  onClick={() => handleDelete(unit.id)}
                  className="h-8 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Number</TableHead>
                <TableHead>Unit Name</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.unit_number}</TableCell>
                  <TableCell>{unit.unit_name || '-'}</TableCell>
                  <TableCell>{unit.floor_number || '-'}</TableCell>
                  <TableCell>{unit.area_sqft ? `${unit.area_sqft} sq ft` : '-'}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(unit.status)}>
                      {unit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {unit.special_features.slice(0, 2).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {unit.special_features.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{unit.special_features.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(unit)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={unit.status === "available" ? "outline" : "default"}
                        onClick={() => toggleStatus(unit)}
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
                        onClick={() => handleDelete(unit.id)}
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
      )}

      {filteredUnits.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No room units found</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding some room units for this room type.
            </p>
            <Button onClick={() => {resetForm(); setIsDialogOpen(true);}}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Unit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}