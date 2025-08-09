import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronDown } from 'lucide-react';

export type Filters = {
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
};

const CategoryFilters: React.FC<Props> = ({ filters, setFilters }) => {
  const [open, setOpen] = React.useState(true);

  const reset = () =>
    setFilters({
      guests: null,
      bed: null,
      audience: null,
      budget: null,
      view: null,
      features: [],
      noise: null,
    });

  return (
    <div className="max-w-6xl mx-auto px-4">
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-medium">Refine your stay</h2>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Filters
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent className="p-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Number of guests</div>
              <ToggleGroup
                type="single"
                value={filters.guests ?? ''}
                onValueChange={(v) => setFilters({ ...filters, guests: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {['1-2', '3', '4-6', '6+'].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Bed configuration</div>
              <ToggleGroup
                type="single"
                value={filters.bed ?? ''}
                onValueChange={(v) => setFilters({ ...filters, bed: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {['1 double', '2 doubles', 'double + sofa‑cum‑bed', 'loft bed present'].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Audience</div>
              <ToggleGroup
                type="single"
                value={filters.audience ?? ''}
                onValueChange={(v) => setFilters({ ...filters, audience: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {['Couple', 'Family with kids', 'Friends / Group'].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Budget</div>
              <ToggleGroup
                type="single"
                value={filters.budget ?? ''}
                onValueChange={(v) => setFilters({ ...filters, budget: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {['Budget', 'Mid-range', 'Premium'].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">View / location</div>
              <ToggleGroup
                type="single"
                value={filters.view ?? ''}
                onValueChange={(v) => setFilters({ ...filters, view: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {[
                  'Balcony',
                  'Pool view (window)',
                  'No view / private and snug',
                  'Near pool',
                  'Near playground',
                  'Near sports courts',
                  'Highest point',
                  'Near entrance',
                ].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Noise & activity</div>
              <ToggleGroup
                type="single"
                value={filters.noise ?? ''}
                onValueChange={(v) => setFilters({ ...filters, noise: (v || null) as any })}
                className="flex flex-wrap gap-2"
              >
                {['Lively zone', 'Moderate', 'Quiet'].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <div className="text-sm text-muted-foreground mb-2">Layout & features</div>
              <ToggleGroup
                type="multiple"
                value={filters.features as any}
                onValueChange={(vals) => setFilters({ ...filters, features: vals as any })}
                className="flex flex-wrap gap-2"
              >
                {[
                  'Loft layout',
                  'Interconnected',
                  'Cabin/cottage style',
                  'Basement/cave style',
                  'Windowless/private',
                  'Air‑conditioned',
                  'Non‑AC',
                ].map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="px-3">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end">
            <Button variant="default" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default CategoryFilters;
