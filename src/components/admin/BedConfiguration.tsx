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
  optionalGroup?: string; // For either/or choices like "Group A: Roll-on OR Mattress"
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
  const [nextGroupNumber, setNextGroupNumber] = useState(1);

  const calculateMaxOccupancy = (configs: BedConfig[]) => {
    const fixedCapacity = configs
      .filter(config => config.category === 'fixed' && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }, 0);
    
    // For optional beds, count each group once (either/or) plus individual optional beds
    const optionalGroups = new Set(configs
      .filter(config => config.category === 'optional' && config.optionalGroup)
      .map(config => config.optionalGroup));
    
    const groupedOptionalCapacity = Array.from(optionalGroups).reduce((total, group) => {
      const groupBeds = configs.filter(config => config.optionalGroup === group);
      const maxGroupCapacity = Math.max(...groupBeds.map(config => {
        if (config.type && BED_TYPES[config.type as keyof typeof BED_TYPES]) {
          const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
          return bedCapacity * config.quantity;
        }
        return 0;
      }));
      return total + maxGroupCapacity;
    }, 0);
    
    const individualOptionalCapacity = configs
      .filter(config => config.category === 'optional' && !config.optionalGroup && config.type && BED_TYPES[config.type as keyof typeof BED_TYPES])
      .reduce((total, config) => {
        const bedCapacity = BED_TYPES[config.type as keyof typeof BED_TYPES].capacity;
        return total + (bedCapacity * config.quantity);
      }, 0);
    
    return fixedCapacity + groupedOptionalCapacity + individualOptionalCapacity;
  };

  useEffect(() => {
    const maxOccupancy = calculateMaxOccupancy(bedConfigs);
    onConfigChange(maxOccupancy, bedConfigs);
  }, [bedConfigs, onConfigChange]);

  const addBedConfig = () => {
    setBedConfigs([...bedConfigs, { 
      id: Date.now().toString(), 
      type: '', 
      quantity: 1,
      category: 'fixed'
    }]);
  };
  
  const addOptionalGroup = () => {
    const groupName = `Group ${nextGroupNumber}`;
    const newBeds = [
      { 
        id: Date.now().toString(), 
        type: 'roll-on', 
        quantity: 1,
        category: 'optional' as const,
        optionalGroup: groupName
      },
      { 
        id: (Date.now() + 1).toString(), 
        type: 'mattress', 
        quantity: 1,
        category: 'optional' as const,
        optionalGroup: groupName
      }
    ];
    setBedConfigs([...bedConfigs, ...newBeds]);
    setNextGroupNumber(nextGroupNumber + 1);
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

  const maxOccupancy = calculateMaxOccupancy(bedConfigs);

  const getAvailableBedTypes = (category: string) => {
    if (category === 'fixed') {
      return Object.entries(BED_TYPES).filter(([key]) => !['roll-on', 'mattress'].includes(key));
    }
    return Object.entries(BED_TYPES);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Bed Configuration</Label>
        <div className="text-sm text-muted-foreground">
          Max Occupancy: <span className="font-medium text-foreground">{maxOccupancy} guests</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={addBedConfig}>
          <Plus className="h-4 w-4 mr-1" />
          Add Bed
        </Button>
        <Button variant="outline" size="sm" onClick={addOptionalGroup}>
          <Plus className="h-4 w-4 mr-1" />
          Add Either/Or Group
        </Button>
      </div>

      <div className="space-y-3">
        {bedConfigs.map((config) => (
          <div key={config.id} className={`flex items-center gap-3 p-3 border rounded-lg ${
            config.category === 'fixed' ? 'bg-primary/5' : 
            config.optionalGroup ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'
          }`}>
            {config.optionalGroup && (
              <div className="text-xs font-medium text-orange-600 min-w-[60px]">
                {config.optionalGroup}
              </div>
            )}
            
            <div className="w-32">
              <Select 
                value={config.category} 
                onValueChange={(value) => updateBedConfig(config.id, 'category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select 
                value={config.type} 
                onValueChange={(value) => updateBedConfig(config.id, 'type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bed type" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableBedTypes(config.category).map(([key, bedType]) => (
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
                max={config.category === 'optional' ? "3" : undefined}
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

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Fixed:</strong> Permanent beds in the unit</p>
        <p><strong>Optional:</strong> Available upon request</p>
        <p><strong>Either/Or Groups:</strong> Guest can choose one option from the group</p>
      </div>
    </div>
  );
}