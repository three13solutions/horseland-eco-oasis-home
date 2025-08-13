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
  category: 'fixed' | 'optional';
  maxAllowed?: number; // For optional beds, max that can be requested
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
  const [maxOccupancyLimit, setMaxOccupancyLimit] = useState(4); // Room's absolute max occupancy

  const calculateOccupancy = (configs: BedConfig[]) => {
    // Fixed beds capacity
    const fixedCapacity = configs
      .filter(config => config.category === 'fixed' && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }, 0);
    
    // Maximum possible optional capacity (if all optional beds are used)
    const maxOptionalCapacity = configs
      .filter(config => config.category === 'optional' && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        const maxAllowed = config.maxAllowed || config.quantity;
        return total + (bedCapacity * maxAllowed);
      }, 0);
    
    return {
      fixed: fixedCapacity,
      maxOptional: maxOptionalCapacity,
      maxTotal: fixedCapacity + maxOptionalCapacity
    };
  };

  useEffect(() => {
    const occupancy = calculateOccupancy(bedConfigs);
    onConfigChange(Math.min(occupancy.maxTotal, maxOccupancyLimit), bedConfigs);
  }, [bedConfigs, maxOccupancyLimit, onConfigChange]);

  const addBedConfig = () => {
    setBedConfigs([...bedConfigs, { 
      id: Date.now().toString(), 
      type: '', 
      quantity: 1,
      category: 'fixed'
    }]);
  };

  const removeBedConfig = (id: string) => {
    if (bedConfigs.length > 1) {
      setBedConfigs(bedConfigs.filter(config => config.id !== id));
    }
  };

  const updateBedConfig = (id: string, field: keyof BedConfig, value: string | number) => {
    setBedConfigs(bedConfigs.map(config => 
      config.id === id 
        ? { ...config, [field]: value }
        : config
    ));
  };

  const occupancy = calculateOccupancy(bedConfigs);
  const fixedBeds = bedConfigs.filter(config => config.category === 'fixed');
  const optionalBeds = bedConfigs.filter(config => config.category === 'optional');

  return (
    <div className="space-y-6">
      {/* Room Max Occupancy Setting */}
      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
        <Label className="text-sm font-medium">Room Max Occupancy Limit:</Label>
        <Input
          type="number"
          min="1"
          max="20"
          value={maxOccupancyLimit}
          onChange={(e) => setMaxOccupancyLimit(parseInt(e.target.value) || 4)}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">guests</span>
      </div>

      {/* Occupancy Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{occupancy.fixed}</div>
          <div className="text-sm text-muted-foreground">Fixed Beds</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">+{occupancy.maxOptional}</div>
          <div className="text-sm text-muted-foreground">Max Additional</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {Math.min(occupancy.maxTotal, maxOccupancyLimit)}
          </div>
          <div className="text-sm text-muted-foreground">Total Max</div>
        </div>
      </div>

      {/* Fixed Beds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-medium">Fixed Beds (Permanent)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addBedConfig}>
            <Plus className="h-4 w-4 mr-1" />
            Add Fixed Bed
          </Button>
        </div>
        
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
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeBedConfig(config.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Optional Beds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-medium">Optional Beds (Upon Request)</Label>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={() => setBedConfigs([...bedConfigs, { 
              id: Date.now().toString(), 
              type: '', 
              quantity: 1, 
              category: 'optional',
              maxAllowed: 1
            }])}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Optional Bed
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Set max quantity based on room space constraints. Guests can request up to the limit.
        </p>
        
        {optionalBeds.map((config) => (
          <div key={config.id} className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50">
            <div className="flex-1">
              <Select 
                value={config.type} 
                onValueChange={(value) => updateBedConfig(config.id, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select optional bed type" />
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
            
            <div className="w-24 text-center">
              <Label className="text-xs text-muted-foreground">Max Available</Label>
              <Input
                type="number"
                min="1"
                max="4"
                value={config.maxAllowed || config.quantity}
                onChange={(e) => updateBedConfig(config.id, 'maxAllowed', parseInt(e.target.value) || 1)}
                placeholder="Max"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeBedConfig(config.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-gray-50 rounded">
        <p><strong>Example:</strong> If you set "Roll-on Bed: Max 2" and "Floor Mattress: Max 1"</p>
        <p>Guests can request: 2 roll-on beds OR 1 mattress OR 1 roll-on + 1 mattress (space permitting)</p>
        <p>The system will ensure total occupancy doesn't exceed the room limit.</p>
      </div>
    </div>
  );
}