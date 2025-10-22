import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, Clock, Users, Radio, Zap, Trophy, Calendar } from 'lucide-react';
import { PricingConstraintsTab } from '@/components/admin/pricing-rules/PricingConstraintsTab';
import { OccupancyYieldTab } from '@/components/admin/pricing-rules/OccupancyYieldTab';
import { LeadTimeRulesTab } from '@/components/admin/pricing-rules/LeadTimeRulesTab';
import { GuestCompositionTab } from '@/components/admin/pricing-rules/GuestCompositionTab';
import { ChannelRulesTab } from '@/components/admin/pricing-rules/ChannelRulesTab';
import { TacticalOverridesTab } from '@/components/admin/pricing-rules/TacticalOverridesTab';
import { CompetitorRatesTab } from '@/components/admin/pricing-rules/CompetitorRatesTab';
import { RateCardPreviewTab } from '@/components/admin/pricing-rules/RateCardPreviewTab';

export default function PricingRules() {
  const [activeTab, setActiveTab] = useState('constraints');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing Rules Engine</h1>
        <p className="text-muted-foreground mt-2">
          Configure dynamic pricing rules for revenue optimization
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-2">
          <TabsTrigger value="constraints" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Constraints</span>
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Occupancy</span>
          </TabsTrigger>
          <TabsTrigger value="leadtime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Time</span>
          </TabsTrigger>
          <TabsTrigger value="guests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Guests</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Overrides</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Competitors</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Rate Card</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="constraints" className="mt-6">
          <PricingConstraintsTab />
        </TabsContent>

        <TabsContent value="occupancy" className="mt-6">
          <OccupancyYieldTab />
        </TabsContent>

        <TabsContent value="leadtime" className="mt-6">
          <LeadTimeRulesTab />
        </TabsContent>

        <TabsContent value="guests" className="mt-6">
          <GuestCompositionTab />
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          <ChannelRulesTab />
        </TabsContent>

        <TabsContent value="overrides" className="mt-6">
          <TacticalOverridesTab />
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          <CompetitorRatesTab />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <RateCardPreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
