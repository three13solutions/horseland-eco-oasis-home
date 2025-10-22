import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Coffee, UtensilsCrossed, Soup } from 'lucide-react';
import type { RateVariant } from '@/hooks/useDynamicPricing';

interface RateVariantCardProps {
  variant: RateVariant;
  isSelected: boolean;
  onSelect: () => void;
  nights: number;
}

const getMealIcon = (mealType: string) => {
  switch (mealType) {
    case 'breakfast': return <Coffee className="h-4 w-4" />;
    case 'lunch': return <UtensilsCrossed className="h-4 w-4" />;
    case 'dinner': return <Soup className="h-4 w-4" />;
    default: return <UtensilsCrossed className="h-4 w-4" />;
  }
};

export const RateVariantCard: React.FC<RateVariantCardProps> = ({
  variant,
  isSelected,
  onSelect,
  nights
}) => {
  return (
    <Card 
      className={`relative ${isSelected ? 'ring-2 ring-primary' : ''} hover:shadow-lg transition-all cursor-pointer`}
      onClick={onSelect}
    >
      <div className="absolute top-3 right-3 flex gap-1 flex-wrap justify-end">
        {variant.is_featured && (
          <Badge>Most Popular</Badge>
        )}
        {variant.discount_percentage > 0 && (
          <Badge variant="destructive">Save {variant.discount_percentage}%</Badge>
        )}
      </div>

      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-1">{variant.meal_plan_name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{variant.cancellation_policy_name}</p>

        <div className="mb-4">
          <div className="text-3xl font-bold">₹{variant.total_price.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            ₹{Math.round(variant.price_per_night).toLocaleString()} per night × {nights} nights
          </div>
          {variant.savings > 0 && (
            <div className="text-sm text-green-600 font-medium mt-1">
              You save ₹{variant.savings.toLocaleString()}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {variant.included_meals && variant.included_meals.length > 0 ? (
            variant.included_meals.map((meal: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {getMealIcon(meal)}
                <Check className="h-4 w-4 text-green-600" />
                <span className="capitalize">{meal} included</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="h-4 w-4" />
              <span>No meals included</span>
            </div>
          )}
          
          <div className="flex items-start gap-2 text-sm">
            {variant.cancellation_terms?.refund_percentage === 0 ? (
              <>
                <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">Non-refundable</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{variant.cancellation_terms?.terms || 'Flexible cancellation'}</span>
              </>
            )}
          </div>
        </div>

        <Button 
          className="w-full" 
          variant={isSelected ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? 'Selected' : 'Select This Rate'}
        </Button>
      </CardContent>
    </Card>
  );
};
