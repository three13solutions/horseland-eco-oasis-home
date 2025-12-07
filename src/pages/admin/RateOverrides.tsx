import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, AlertTriangle } from "lucide-react";
import { TacticalOverridesTab } from "@/components/admin/pricing-rules/TacticalOverridesTab";

const RateOverrides = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rate Overrides</h1>
        <p className="text-muted-foreground">
          Manually override calculated rates for specific dates and room types
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Highest Priority:</strong> Rate overrides take precedence over all other pricing rules including base prices, seasonal adjustments, occupancy yield, lead time, and channel rules.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Manual Price Overrides</CardTitle>
              <CardDescription>
                Set fixed prices or adjustments for specific date ranges. Useful for special events, promotions, or exceptional circumstances.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TacticalOverridesTab />
        </CardContent>
      </Card>
    </div>
  );
};

export default RateOverrides;
