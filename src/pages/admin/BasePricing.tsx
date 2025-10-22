import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, Home, GitCompare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Import existing components to reuse their logic
import CategoryPricing from './CategoryPricing';
import UnitPricing from './UnitPricing';

export default function BasePricing() {
  const [activeTab, setActiveTab] = useState('categories');

  const { data: comparisonData } = useQuery({
    queryKey: ['pricing-comparison'],
    queryFn: async () => {
      const { data: units } = await supabase
        .from('room_units')
        .select(`
          id,
          unit_number,
          unit_name,
          custom_pricing,
          room_types (
            name,
            seasonal_pricing,
            base_price
          )
        `)
        .eq('is_active', true)
        .order('unit_number');

      const unitsWithCustom = units?.filter(u => u.custom_pricing !== null).length || 0;
      const totalUnits = units?.length || 0;
      
      return {
        unitsWithCustom,
        totalUnits,
        units: units || [],
      };
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Base Pricing</h1>
        <p className="text-muted-foreground mt-2">
          Configure base rates for room categories and individual units
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Category Pricing
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Unit Pricing
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoryPricing />
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <UnitPricing />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Comparison Overview</CardTitle>
              <CardDescription>
                Compare category base pricing with unit-specific custom pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Units</div>
                  <div className="text-2xl font-bold">{comparisonData?.totalUnits || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Custom Pricing</div>
                  <div className="text-2xl font-bold text-primary">{comparisonData?.unitsWithCustom || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Using Category Rates</div>
                  <div className="text-2xl font-bold">{(comparisonData?.totalUnits || 0) - (comparisonData?.unitsWithCustom || 0)}</div>
                </div>
              </div>

              <div className="space-y-3">
                {comparisonData?.units.map((unit: any) => (
                  <div key={unit.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">
                            {unit.unit_name || `Unit ${unit.unit_number}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {unit.room_types?.name}
                          </div>
                        </div>
                      </div>
                      {unit.custom_pricing ? (
                        <Badge variant="default">Custom Pricing</Badge>
                      ) : (
                        <Badge variant="secondary">Category Pricing</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {(['peak', 'shoulder', 'monsoon', 'off_peak'] as const).map((season) => {
                        const customPrice = unit.custom_pricing?.[season];
                        const categoryPrice = unit.room_types?.seasonal_pricing?.[season] || unit.room_types?.base_price;
                        const usingCustom = customPrice !== null && customPrice !== undefined;
                        
                        return (
                          <div key={season} className="space-y-1">
                            <div className="text-xs text-muted-foreground capitalize">
                              {season.replace('_', ' ')}
                            </div>
                            <div className={`font-semibold ${usingCustom ? 'text-primary' : ''}`}>
                              ₹{(usingCustom ? customPrice : categoryPrice)?.toLocaleString('en-IN') || 'N/A'}
                            </div>
                            {usingCustom && categoryPrice && (
                              <div className="text-xs text-muted-foreground line-through">
                                ₹{categoryPrice.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Custom Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded">
                <div className="font-medium mb-1">When to Use Custom Pricing</div>
                <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                  <li>Premium units with better views or amenities</li>
                  <li>Rooms requiring maintenance (temporary price reduction)</li>
                  <li>Promotional pricing for specific units</li>
                  <li>Testing different price points for similar rooms</li>
                </ul>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <div className="font-medium mb-1">Best Practices</div>
                <ul className="space-y-1 text-muted-foreground ml-4 list-disc">
                  <li>Use category pricing as the baseline for consistency</li>
                  <li>Only override at unit level when necessary</li>
                  <li>Document reasons for custom pricing in unit management</li>
                  <li>Review custom pricing regularly to ensure accuracy</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
