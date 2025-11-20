import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PriceBreakdownProps {
  roomRate: number;
  mealCost: number;
  policyAdjustment: number;
  addonsTotal?: number;
  nights: number;
  guestCount: number;
  mealPlanName: string;
  includedMeals: string[];
  addons?: Array<{ name: string; quantity: number; price: number }>;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  roomRate,
  mealCost,
  policyAdjustment,
  addonsTotal = 0,
  nights,
  guestCount,
  mealPlanName,
  includedMeals,
  addons = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const roomSubtotal = roomRate;
  const mealSubtotal = mealCost;
  const subtotal = roomSubtotal + mealSubtotal + policyAdjustment;
  
  // Calculate GST based on per-night rate
  const perNightRate = roomSubtotal / nights;
  const gstRate = perNightRate <= 7500 ? 0.05 : 0.18; // 5% if ≤ ₹7,500, else 18%
  const gstAmount = subtotal * gstRate;
  const grandTotal = subtotal + addonsTotal + gstAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Price Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Room Rate ({nights} {nights === 1 ? 'night' : 'nights'})</span>
            <span className="font-medium">₹{roomSubtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pl-3">
            <span>≈ ₹{Math.round(roomSubtotal / guestCount).toLocaleString()} / person for {nights} {nights === 1 ? 'night' : 'nights'}</span>
          </div>
          {guestCount >= 2 && (
            <div className="text-xs text-muted-foreground pl-3">
              Minimum charge for {Math.max(2, guestCount)} {Math.max(2, guestCount) === 1 ? 'guest' : 'guests'}
            </div>
          )}
        </div>

        {mealCost > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span>{mealPlanName}</span>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <span className="font-medium">₹{mealSubtotal.toLocaleString()}</span>
            </div>
            
            <CollapsibleContent className="pt-2 pl-4 space-y-1">
              {includedMeals.map((meal, idx) => (
                <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                  <span className="capitalize">{meal} × {guestCount} {guestCount === 1 ? 'guest' : 'guests'} × {nights} {nights === 1 ? 'night' : 'nights'}</span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {policyAdjustment !== 0 && (
          <div className="flex justify-between text-sm">
            <span>{policyAdjustment < 0 ? 'Non-Refundable Discount' : 'Policy Charge'}</span>
            <span className={`font-medium ${policyAdjustment < 0 ? 'text-green-600' : ''}`}>
              {policyAdjustment < 0 ? '-' : '+'}₹{Math.abs(policyAdjustment).toLocaleString()}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-medium">
          <span>Room Subtotal</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>

        {addons.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="font-medium text-sm">Add-on Services</div>
              {addons.map((addon, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{addon.name} × {addon.quantity}</span>
                  <span>₹{(addon.price * addon.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            GST ({(gstRate * 100).toFixed(0)}%)
            <span className="text-xs ml-1">
              {gstRate === 0.05 ? '(Rate ≤ ₹7,500/night)' : '(Rate > ₹7,500/night)'}
            </span>
          </span>
          <span>₹{gstAmount.toLocaleString()}</span>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total Amount</span>
          <span className="text-primary">₹{grandTotal.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};
