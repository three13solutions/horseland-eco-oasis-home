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
      : [{ id: '1', type: '', quantity: 1 }]
  );

  const calculateMaxOccupancy = (configs: BedConfig[]) => {
    return configs.reduce((total, config) => {
      if (config.type && BED_TYPES[config.type as keyof typeof BED_TYPES]) {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }
      return total;
    }, 0);
  };

  useEffect(() => {
    const maxOccupancy = calculateMaxOccupancy(bedConfigs);
    onConfigChange(maxOccupancy, bedConfigs);
  }, [bedConfigs, onConfigChange]);

  const addBedConfig = () => {
    setBedConfigs([...bedConfigs, { 
      id: Date.now().toString(), 
      type: '', 
      quantity: 1 
    }]);
  };

  const removeBedConfig = (id: string) => {
    if (bedConfigs.length > 1) {
      setBedConfigs(bedConfigs.filter(config => config.id !== id));
    }
  };

  const updateBedConfig = (id: string, field: 'type' | 'quantity', value: string | number) => {
    setBedConfigs(bedConfigs.map(config => 
      config.id === id 
        ? { ...config, [field]: value }
        : config
    ));
  };

  const maxOccupancy = calculateMaxOccupancy(bedConfigs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Bed Configuration</Label>
        <div className="text-sm text-muted-foreground">
          Max Occupancy: <span className="font-medium text-foreground">{maxOccupancy} guests</span>
        </div>
      </div>

      <div className="space-y-3">
        {bedConfigs.map((config, index) => (
          <div key={config.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="flex-1">
              <Select 
                value={config.type} 
                onValueChange={(value) => updateBedConfig(config.id, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bed type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BED_TYPES).map(([key, bedType]) => (
                    <SelectItem key={key} value={key}>
                      {bedType.label} ({bedType.capacity} person{bedType.capacity > 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-24">
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
              disabled={bedConfigs.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button 
        variant="outline" 
        onClick={addBedConfig}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Bed Type
      </Button>
    </div>
  );
}