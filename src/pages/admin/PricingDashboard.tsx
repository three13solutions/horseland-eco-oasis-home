import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Settings, DollarSign, Zap, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PricingDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['pricing-dashboard-stats'],
    queryFn: async () => {
      const [roomTypes, units, seasons, constraints, occupancyRules, leadTimeRules, channelRules, guestRules] = await Promise.all([
        supabase.from('room_types').select('id, name, base_price', { count: 'exact' }).eq('is_published', true),
        supabase.from('room_units').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('seasons').select('id, name, is_active', { count: 'exact' }).eq('is_active', true),
        supabase.from('pricing_constraints').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('occupancy_yield_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('lead_time_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('channel_rules').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('guest_composition_rules').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      const prices = roomTypes.data?.map(r => r.base_price).filter(Boolean) || [];
      
      return {
        totalCategories: roomTypes.count || 0,
        totalUnits: units.count || 0,
        activeSeasons: seasons.count || 0,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        activeRules: {
          constraints: constraints.count || 0,
          occupancy: occupancyRules.count || 0,
          leadTime: leadTimeRules.count || 0,
          channels: channelRules.count || 0,
          guests: guestRules.count || 0,
          total: (constraints.count || 0) + (occupancyRules.count || 0) + (leadTimeRules.count || 0) + (channelRules.count || 0) + (guestRules.count || 0),
        },
        currentSeason: seasons.data?.find(s => s.is_active)?.name || 'N/A',
      };
    },
  });

  const { data: warnings } = useQuery({
    queryKey: ['pricing-warnings'],
    queryFn: async () => {
      const warnings: string[] = [];
      
      // Check for categories without seasonal pricing
      const { data: roomTypes } = await supabase.from('room_types').select('id, name').eq('is_published', true);
      const { data: seasonalPricing } = await supabase.from('seasonal_pricing').select('room_type_id');
      
      const roomsWithPricing = new Set(seasonalPricing?.map(sp => sp.room_type_id) || []);
      const missingPricing = roomTypes?.filter(rt => !roomsWithPricing.has(rt.id)) || [];
      
      if (missingPricing.length > 0) {
        warnings.push(`${missingPricing.length} categories missing seasonal pricing`);
      }

      return warnings;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your pricing configuration and revenue optimization
        </p>
      </div>

      {/* Alerts */}
      {warnings && warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">Attention Required</div>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, i) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Room Categories</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalCategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active categories configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Room Units</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalUnits}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Individual units available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Price Range</CardDescription>
            <CardTitle className="text-2xl">
              ₹{stats?.minPrice.toLocaleString('en-IN')} - ₹{stats?.maxPrice.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Base price across categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Rules</CardDescription>
            <CardTitle className="text-3xl">{stats?.activeRules.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Dynamic pricing rules enabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/admin/pricing/config')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Settings className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Base Configuration</CardTitle>
                <CardDescription>Seasons, holidays & rounding</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Seasons</span>
                <Badge variant="secondary">{stats?.activeSeasons}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Season</span>
                <Badge>{stats?.currentSeason}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/admin/pricing/rates')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Base Pricing</CardTitle>
                <CardDescription>Category & unit rates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Categories</span>
                <Badge variant="secondary">{stats?.totalCategories}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Units</span>
                <Badge variant="secondary">{stats?.totalUnits}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/admin/pricing/rules')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Zap className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Dynamic Rules</CardTitle>
                <CardDescription>Revenue optimization</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Constraints</span>
                <Badge variant="secondary">{stats?.activeRules.constraints}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Occupancy Rules</span>
                <Badge variant="secondary">{stats?.activeRules.occupancy}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lead Time Rules</span>
                <Badge variant="secondary">{stats?.activeRules.leadTime}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common pricing management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/pricing/rates')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Update Seasonal Rates
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/pricing/config')}>
              <Calendar className="h-4 w-4 mr-2" />
              Manage Seasons & Holidays
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/pricing/rules?tab=preview')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Rate Card
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
