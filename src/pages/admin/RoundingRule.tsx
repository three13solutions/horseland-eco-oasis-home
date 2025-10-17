import React, { useState, useEffect } from 'react';
import { Calculator, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type RoundingMethod = 'none' | 'nearest' | 'up' | 'down';

interface RoundingConfig {
  method: RoundingMethod;
  roundTo: number;
}

const defaultConfig: RoundingConfig = {
  method: 'nearest',
  roundTo: 10,
};

export default function RoundingRule() {
  const [config, setConfig] = useState<RoundingConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRoundingConfig();
  }, []);

  const loadRoundingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'rounding_rule')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setConfig(data.setting_value as unknown as RoundingConfig);
      }
    } catch (error) {
      console.error('Error loading rounding config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'rounding_rule',
          setting_value: config as any
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Rounding rule updated successfully",
      });
    } catch (error) {
      console.error('Error saving rounding config:', error);
      toast({
        title: "Error",
        description: "Failed to save rounding rule",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getExamplePrice = (original: number) => {
    if (config.method === 'none') return original;
    
    const roundTo = config.roundTo;
    switch (config.method) {
      case 'nearest':
        return Math.round(original / roundTo) * roundTo;
      case 'up':
        return Math.ceil(original / roundTo) * roundTo;
      case 'down':
        return Math.floor(original / roundTo) * roundTo;
      default:
        return original;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rounding Rule</h1>
          <p className="text-muted-foreground mt-2">
            Configure how prices are rounded throughout the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price Rounding Method</CardTitle>
          <CardDescription>
            Choose how final prices should be rounded for consistency and clarity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Rounding Method</Label>
            <RadioGroup
              value={config.method}
              onValueChange={(value) => setConfig({ ...config, method: value as RoundingMethod })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  No Rounding - Use exact calculated prices
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nearest" id="nearest" />
                <Label htmlFor="nearest" className="font-normal cursor-pointer">
                  Round to Nearest - Round to the closest value
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="up" id="up" />
                <Label htmlFor="up" className="font-normal cursor-pointer">
                  Round Up - Always round up to next value
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="down" id="down" />
                <Label htmlFor="down" className="font-normal cursor-pointer">
                  Round Down - Always round down to previous value
                </Label>
              </div>
            </RadioGroup>
          </div>

          {config.method !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="roundTo">Round to Multiple of</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₹</span>
                <Input
                  id="roundTo"
                  type="number"
                  min="1"
                  step="1"
                  value={config.roundTo}
                  onChange={(e) => setConfig({ ...config, roundTo: parseInt(e.target.value) || 1 })}
                  className="w-32"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Common values: 1, 5, 10, 50, 100
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Examples</h4>
            <div className="space-y-2 text-sm">
              {[2547, 3199, 4850].map(price => (
                <div key={price} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                  <span className="text-muted-foreground">₹{price}</span>
                  <span>→</span>
                  <span className="font-semibold">₹{getExamplePrice(price)}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Rounding Rule'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Price Rounding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Price rounding helps create clean, professional-looking prices that are easier for guests to understand and remember.
          </p>
          <div className="space-y-2">
            <div>
              <strong>No Rounding:</strong> Use exact calculated prices (e.g., ₹2,547)
            </div>
            <div>
              <strong>Round to Nearest:</strong> Most balanced approach (₹2,547 → ₹2,550)
            </div>
            <div>
              <strong>Round Up:</strong> Always rounds up, never shows lower price (₹2,547 → ₹2,550)
            </div>
            <div>
              <strong>Round Down:</strong> Always rounds down, guest-friendly pricing (₹2,547 → ₹2,540)
            </div>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="text-muted-foreground">
              <strong>Note:</strong> This rounding rule applies to all calculated prices throughout the booking system, including seasonal rates and custom unit pricing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
