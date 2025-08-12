import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, Plus } from 'lucide-react';

interface BulkUnitsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypeId: string;
  onUnitsAdded: () => void;
}

export function BulkUnitsDialog({ isOpen, onOpenChange, roomTypeId, onUnitsAdded }: BulkUnitsDialogProps) {
  const [mode, setMode] = useState<'bulk' | 'csv'>('bulk');
  const [bulkData, setBulkData] = useState({
    prefix: '',
    startNumber: 1,
    endNumber: 10,
    floor: '',
    areaSqft: '',
    status: 'available',
    features: '',
  });
  const [csvData, setCsvData] = useState('');

  const generateBulkUnits = async () => {
    const units = [];
    for (let i = bulkData.startNumber; i <= bulkData.endNumber; i++) {
      const unitNumber = bulkData.prefix ? `${bulkData.prefix}${i}` : i.toString();
      units.push({
        room_type_id: roomTypeId,
        unit_number: unitNumber,
        floor_number: bulkData.floor ? parseInt(bulkData.floor) : null,
        area_sqft: bulkData.areaSqft ? parseFloat(bulkData.areaSqft) : null,
        status: bulkData.status,
        special_features: bulkData.features 
          ? bulkData.features.split(',').map(f => f.trim()).filter(f => f)
          : [],
      });
    }

    try {
      const { error } = await supabase
        .from('room_units')
        .insert(units);

      if (error) throw error;

      toast.success(`${units.length} room units created successfully`);
      onUnitsAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room units');
    }
  };

  const processCsvData = async () => {
    try {
      const rows = csvData.trim().split('\n');
      const units = rows.slice(1).map(row => {
        const [unitNumber, unitName, floor, area, status, features] = row.split(',');
        return {
          room_type_id: roomTypeId,
          unit_number: unitNumber?.trim(),
          unit_name: unitName?.trim() || null,
          floor_number: floor?.trim() ? parseInt(floor.trim()) : null,
          area_sqft: area?.trim() ? parseFloat(area.trim()) : null,
          status: status?.trim() || 'available',
          special_features: features?.trim() 
            ? features.split(';').map(f => f.trim()).filter(f => f)
            : [],
        };
      }).filter(unit => unit.unit_number);

      const { error } = await supabase
        .from('room_units')
        .insert(units);

      if (error) throw error;

      toast.success(`${units.length} room units imported successfully`);
      onUnitsAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import room units');
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = 'unit_number,unit_name,floor_number,area_sqft,status,special_features\n101,Garden View Suite,1,350,available,Balcony;Garden View\n102,Forest Suite,1,340,available,Forest View';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'room_units_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Add Room Units</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={mode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setMode('bulk')}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Sequential Add
            </Button>
            <Button
              variant={mode === 'csv' ? 'default' : 'outline'}
              onClick={() => setMode('csv')}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              CSV Import
            </Button>
          </div>

          {mode === 'bulk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prefix">Unit Prefix</Label>
                  <Input
                    id="prefix"
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({...bulkData, prefix: e.target.value})}
                    placeholder="A, B, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="start">Start Number</Label>
                  <Input
                    id="start"
                    type="number"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({...bulkData, startNumber: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="end">End Number</Label>
                  <Input
                    id="end"
                    type="number"
                    value={bulkData.endNumber}
                    onChange={(e) => setBulkData({...bulkData, endNumber: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="floor">Floor Number</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={bulkData.floor}
                    onChange={(e) => setBulkData({...bulkData, floor: e.target.value})}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area (sq ft)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={bulkData.areaSqft}
                    onChange={(e) => setBulkData({...bulkData, areaSqft: e.target.value})}
                    placeholder="350"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={bulkData.status} onValueChange={(value) => setBulkData({...bulkData, status: value})}>
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
                <Label htmlFor="features">Common Features</Label>
                <Input
                  id="features"
                  value={bulkData.features}
                  onChange={(e) => setBulkData({...bulkData, features: e.target.value})}
                  placeholder="Balcony, Garden View (comma separated)"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={generateBulkUnits}>
                  Create {bulkData.endNumber - bulkData.startNumber + 1} Units
                </Button>
              </div>
            </div>
          )}

          {mode === 'csv' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Import room units from CSV file
                </p>
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div>
                <Label htmlFor="csv">CSV Data</Label>
                <Textarea
                  id="csv"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="unit_number,unit_name,floor_number,area_sqft,status,special_features&#10;101,Garden View Suite,1,350,available,Balcony;Garden View"
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={processCsvData}>
                  Import Units
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}