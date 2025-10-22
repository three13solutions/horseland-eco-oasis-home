import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Calculator, Info } from 'lucide-react';

// Import existing components to reuse their logic
import SeasonRules from './SeasonRules';
import RoundingRule from './RoundingRule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function BaseConfiguration() {
  const [activeTab, setActiveTab] = useState('seasons');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Base Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Foundation settings: seasons, holidays, day types, and price rounding
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="seasons" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Seasons & Holidays
          </TabsTrigger>
          <TabsTrigger value="daytypes" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Day Types
          </TabsTrigger>
          <TabsTrigger value="rounding" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Rounding Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seasons" className="mt-6">
          <SeasonRules />
        </TabsContent>

        <TabsContent value="daytypes" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Day Types</CardTitle>
              <CardDescription>
                Pricing is configured for two day types: Weekday (Mon-Thu) and Weekend (Fri-Sun + Holidays)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">M-T</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-lg">Weekday Pricing</div>
                    <div className="text-muted-foreground text-sm mt-1">
                      Applied to Monday through Thursday bookings
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                      <strong>Use Case:</strong> Typically lower rates to maintain occupancy during business travel periods and off-peak times.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">F-S</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-lg">Weekend Pricing</div>
                    <div className="text-muted-foreground text-sm mt-1">
                      Applied to Friday through Sunday, plus all holidays and long weekends configured in the Seasons & Holidays tab
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                      <strong>Use Case:</strong> Premium rates for leisure travelers and high-demand periods. Holidays automatically use weekend pricing.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">How It Works</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    1. Configure seasonal periods in the <strong>Seasons & Holidays</strong> tab
                  </p>
                  <p>
                    2. Set weekday and weekend prices for each season in <strong>Base Pricing → Category Pricing</strong>
                  </p>
                  <p>
                    3. The system automatically applies the correct rate based on the booking date
                  </p>
                  <p>
                    4. Holidays are automatically treated as weekends for pricing purposes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Strategy Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <div className="font-medium mb-1">💡 Dynamic Pricing</div>
                <p className="text-muted-foreground">
                  Use the <strong>Dynamic Rules</strong> section to apply multipliers on top of these base rates based on occupancy, lead time, and more.
                </p>
              </div>
              <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20">
                <div className="font-medium mb-1">📊 Revenue Optimization</div>
                <p className="text-muted-foreground">
                  Set higher weekend rates during peak seasons and competitive weekday rates to maximize overall revenue and occupancy.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounding" className="mt-6">
          <RoundingRule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
