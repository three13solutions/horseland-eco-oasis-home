import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

interface BedConfig {
  id: string;
  type: string;
  quantity: number;
  category: 'fixed' | 'extra'; // Fixed beds are permanent, extra beds are optional
}

interface BedConfigurationProps {
  onConfigChange: (maxOccupancy: number, bedConfigs: BedConfig[]) => void;
  initialConfig?: BedConfig[];
}

const BED_TYPES = {
  single: { label: 'Single Bed', capacity: 1 },
  double: { label: 'Double Bed', capacity: 2 },
  queen: { label: 'Queen Bed', capacity: 2 },
  king: { label: 'King Bed', capacity: 2 },
  'roll-on': { label: 'Roll-on Bed', capacity: 1 },
  mattress: { label: 'Floor Mattress', capacity: 1 },
  sofa: { label: 'Sofa Bed', capacity: 1 },
};

export function BedConfiguration({ onConfigChange, initialConfig = [] }: BedConfigurationProps) {
  const [bedConfigs, setBedConfigs] = useState<BedConfig[]>(
    initialConfig.length > 0 
      ? initialConfig 
      : [{ id: '1', type: '', quantity: 1, category: 'fixed' }]
  );

  const calculateMaxOccupancy = (configs: BedConfig[]) => {
    const fixedCapacity = configs
      .filter(config => config.category === 'fixed' && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }, 0);
    
    const extraCapacity = configs
      .filter(config => config.category === 'extra' && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }, 0);
    
    return fixedCapacity + extraCapacity;
  };

  useEffect(() => {
    const maxOccupancy = calculateMaxOccupancy(bedConfigs);
    onConfigChange(maxOccupancy, bedConfigs);
  }, [bedConfigs, onConfigChange]);

  const addBedConfig = (category: 'fixed' | 'extra' = 'fixed') => {
    setBedConfigs([...bedConfigs, { 
      id: Date.now().toString(), 
      type: '', 
      quantity: 1,
      category
    }]);
  };

  const removeBedConfig = (id: string) => {
    if (bedConfigs.length > 1) {
      setBedConfigs(bedConfigs.filter(config => config.id !== id));
    }
  };

  const updateBedConfig = (id: string, field: 'type' | 'quantity' | 'category', value: string | number) => {
    setBedConfigs(bedConfigs.map(config => 
      config.id === id 
        ? { ...config, [field]: value }
        : config
    ));
  };

  const maxOccupancy = calculateMaxOccupancy(bedConfigs);
  const fixedBeds = bedConfigs.filter(config => config.category === 'fixed');
  const extraBeds = bedConfigs.filter(config => config.category === 'extra');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Bed Configuration</Label>
        <div className="text-sm text-muted-foreground">
          Max Occupancy: <span className="font-medium text-foreground">{maxOccupancy} guests</span>
        </div>
      </div>

      {/* Fixed Beds Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-primary">Fixed Beds (Permanent)</Label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addBedConfig('fixed')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Fixed Bed
          </Button>
        </div>
        
        {fixedBeds.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No fixed beds configured</p>
        )}
        
        {fixedBeds.map((config) => (
          <div key={config.id} className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5">
            <div className="flex-1">
              <Select 
                value={config.type} 
                onValueChange={(value) => updateBedConfig(config.id, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bed type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BED_TYPES)
                    .filter(([key]) => !['roll-on', 'mattress'].includes(key))
                    .map(([key, bedType]) => (
                    <SelectItem key={key} value={key}>
                      {bedType.label} ({bedType.capacity} person{bedType.capacity > 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-20">
              <Input
                type="number"
                min="1"
                value={config.quantity}
                onChange={(e) => updateBedConfig(config.id, 'quantity', parseInt(e.target.value) || 1)}
                placeholder="Qty"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => removeBedConfig(config.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Extra Beds Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-orange-600">Extra Beds (Optional)</Label>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addBedConfig('extra')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Extra Bed Option
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          These beds can be added upon guest request (roll-on beds, floor mattresses, etc.)
        </p>
        
        {extraBeds.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No extra bed options configured</p>
        )}
        
        {extraBeds.map((config) => (
          <div key={config.id} className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50">
            <div className="flex-1">
              <Select 
                value={config.type} 
                onValueChange={(value) => updateBedConfig(config.id, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select extra bed type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BED_TYPES)
                    .filter(([key]) => ['roll-on', 'mattress', 'sofa'].includes(key))
                    .map(([key, bedType]) => (
                    <SelectItem key={key} value={key}>
                      {bedType.label} ({bedType.capacity} person{bedType.capacity > 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-20">
              <Input
                type="number"
                min="1"
                max="3"
                value={config.quantity}
                onChange={(e) => updateBedConfig(config.id, 'quantity', parseInt(e.target.value) || 1)}
                placeholder="Max"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => removeBedConfig(config.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}