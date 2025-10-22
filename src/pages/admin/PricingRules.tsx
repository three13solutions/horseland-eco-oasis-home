import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, Clock, Users, Radio, Zap, Trophy, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PricingConstraintsTab } from '@/components/admin/pricing-rules/PricingConstraintsTab';
import { OccupancyYieldTab } from '@/components/admin/pricing-rules/OccupancyYieldTab';
import { LeadTimeRulesTab } from '@/components/admin/pricing-rules/LeadTimeRulesTab';
import { GuestCompositionTab } from '@/components/admin/pricing-rules/GuestCompositionTab';
import { ChannelRulesTab } from '@/components/admin/pricing-rules/ChannelRulesTab';
import { TacticalOverridesTab } from '@/components/admin/pricing-rules/TacticalOverridesTab';
import { CompetitorRatesTab } from '@/components/admin/pricing-rules/CompetitorRatesTab';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PricingRules() {
  const [activeTab, setActiveTab] = useState('constraints');

  // Fetch active rule counts
  const { data: ruleCounts } = useQuery({
    queryKey: ['rule-counts'],
    queryFn: async () => {
      const [constraints, occupancy, leadTime, guests, channels] = await Promise.all([
        supabase.from('pricing_constraints').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('occupancy_yield_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('lead_time_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('guest_composition_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('channel_rules').select('id', { count: 'exact' }).eq('is_active', true),
      ]);
      
      return {
        constraints: constraints.count || 0,
        occupancy: occupancy.count || 0,
        leadTime: leadTime.count || 0,
        guests: guests.count || 0,
        channels: channels.count || 0,
      };
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dynamic Pricing Rules</h1>
        <p className="text-muted-foreground mt-2">
          Configure automated rules to optimize pricing based on market conditions
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Rules are applied in sequence: Constraints → Occupancy → Lead Time → Guest Composition → Channels → Tactical Overrides. 
          View the final computed rates in <strong>Live Rate Card</strong>.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="constraints" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Constraints</span>
            {ruleCounts && ruleCounts.constraints > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{ruleCounts.constraints}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Occupancy</span>
            {ruleCounts && ruleCounts.occupancy > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{ruleCounts.occupancy}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leadtime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Time</span>
            {ruleCounts && ruleCounts.leadTime > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{ruleCounts.leadTime}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Guests</span>
            {ruleCounts && ruleCounts.guests > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{ruleCounts.guests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
            {ruleCounts && ruleCounts.channels > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{ruleCounts.channels}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Overrides</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Competitors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="constraints" className="mt-6 space-y-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Price Boundaries</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Set minimum (floor) and maximum (ceiling) prices to protect margins and maintain positioning. These are hard limits that override all other rules.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <PricingConstraintsTab />
        </TabsContent>

        <TabsContent value="occupancy" className="mt-6 space-y-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Demand-Based Pricing</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Automatically adjust prices based on occupancy levels. Increase rates when demand is high, offer competitive pricing when availability is abundant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <OccupancyYieldTab />
        </TabsContent>

        <TabsContent value="leadtime" className="mt-6 space-y-4">
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Booking Window Adjustments</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Reward early bookers with discounts or capture last-minute premium. Adjust pricing based on days before check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <LeadTimeRulesTab />
        </TabsContent>

        <TabsContent value="guests" className="mt-6 space-y-4">
          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">Group Size Pricing</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    Configure charges for extra guests beyond base occupancy. Set different rates for adults, children, and infants.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <GuestCompositionTab />
        </TabsContent>

        <TabsContent value="channels" className="mt-6 space-y-4">
          <Card className="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Radio className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-cyan-900 dark:text-cyan-100">Distribution Channel Rules</h4>
                  <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">
                    Apply different pricing or adjustments for various booking channels (Direct, OTA, Corporate, etc.) to account for commissions and positioning.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <ChannelRulesTab />
        </TabsContent>

        <TabsContent value="overrides" className="mt-6 space-y-4">
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">Manual Price Overrides</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Set specific prices for particular dates or events that override all automated rules. Use for special events, maintenance, or strategic pricing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <TacticalOverridesTab />
        </TabsContent>

        <TabsContent value="competitors" className="mt-6 space-y-4">
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Market Intelligence</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Track competitor pricing to inform your strategy. Monitor market rates and adjust your positioning accordingly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <CompetitorRatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
