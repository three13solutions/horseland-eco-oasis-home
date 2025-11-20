import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type Filters = {
  roomType: string | null;
  guests: '1-2' | '3' | '4-6' | '6+' | null;
  bed: '1 double' | '2 doubles' | 'double + sofa‑cum‑bed' | 'loft bed present' | null;
  audience: 'Couple' | 'Family with kids' | 'Friends / Group' | null;
  budget: 'Budget' | 'Mid-range' | 'Premium' | null;
  view:
    | 'Balcony'
    | 'Pool view (window)'
    | 'No view / private and snug'
    | 'Near pool'
    | 'Near playground'
    | 'Near sports courts'
    | 'Highest point'
    | 'Near entrance'
    | null;
  features: Array<
    | 'Loft layout'
    | 'Interconnected'
    | 'Cabin/cottage style'
    | 'Basement/cave style'
    | 'Windowless/private'
    | 'Air‑conditioned'
    | 'Non‑AC'
  >;
  noise: 'Lively zone' | 'Moderate' | 'Quiet' | null;
};

type Props = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  roomTypeOptions?: Array<{ id: string; name: string }>;
};

const CategoryFilters: React.FC<Props> = ({ filters, setFilters, roomTypeOptions = [] }) => {
  const reset = () =>
    setFilters({
      roomType: null,
      guests: null,
      bed: null,
      audience: null,
      budget: null,
      view: null,
      features: [],
      noise: null,
    });

  const FilterPill = ({ 
    label, 
    value, 
    options, 
    onChange 
  }: { 
    label: string; 
    value: string | null; 
    options: string[]; 
    onChange: (v: string | null) => void 
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}:</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <Badge
            key={opt}
            variant={value === opt ? "default" : "secondary"}
            className="cursor-pointer hover:bg-primary/80 text-xs px-2 py-1"
            onClick={() => onChange(value === opt ? null : opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Find your perfect stay</h2>
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
            Clear all
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {roomTypeOptions.length > 0 && (
            <FilterPill
              label="Room Type"
              value={filters.roomType}
              options={roomTypeOptions.map(rt => rt.name)}
              onChange={(v) => {
                const selectedRoom = roomTypeOptions.find(rt => rt.name === v);
                setFilters({ ...filters, roomType: selectedRoom?.id || null });
              }}
            />
          )}
          
          <FilterPill
            label="Guests"
            value={filters.guests}
            options={['1-2', '3', '4-6', '6+']}
            onChange={(v) => setFilters({ ...filters, guests: v as any })}
          />
          
          <FilterPill
            label="Budget"
            value={filters.budget}
            options={['Budget', 'Mid-range', 'Premium']}
            onChange={(v) => setFilters({ ...filters, budget: v as any })}
          />
          
          <FilterPill
            label="Audience"
            value={filters.audience}
            options={['Couple', 'Family with kids', 'Friends / Group']}
            onChange={(v) => setFilters({ ...filters, audience: v as any })}
          />
          
          <FilterPill
            label="Bed Type"
            value={filters.bed}
            options={['1 double', '2 doubles', 'double + sofa‑cum‑bed', 'loft bed present']}
            onChange={(v) => setFilters({ ...filters, bed: v as any })}
          />
          
          <FilterPill
            label="Location"
            value={filters.view}
            options={['Balcony', 'Pool view', 'Near pool', 'Near playground', 'Highest point', 'Private']}
            onChange={(v) => setFilters({ ...filters, view: v as any })}
          />
          
          <FilterPill
            label="Noise"
            value={filters.noise}
            options={['Quiet', 'Moderate', 'Lively zone']}
            onChange={(v) => setFilters({ ...filters, noise: v as any })}
          />
        </div>
      </div>
    </div>
  );
};

export default CategoryFilters;
