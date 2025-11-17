import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Coffee, UtensilsCrossed, Home, CreditCard, XCircle } from 'lucide-react';
import { useDynamicPricing, RateVariant } from '@/hooks/useDynamicPricing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  hero_image?: string;
  gallery: any;
  max_guests: number;
  features: any;
  base_price: number;
  is_published: boolean;
  seasonal_pricing: any;
  availability_calendar: any;
  created_at: string;
  updated_at: string;
}

interface AvailableRoomCardProps {
  roomType: RoomType;
  availableCount: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  onSelectRoom: (roomType: RoomType, variant?: RateVariant) => void;
  getFeatureIcon: (feature: string) => JSX.Element;
}

export const AvailableRoomCard: React.FC<AvailableRoomCardProps> = ({
  roomType,
  availableCount,
  checkIn,
  checkOut,
  guests,
  nights,
  onSelectRoom,
  getFeatureIcon
}) => {
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('all_meals_inclusive');
  const [selectedCancellationPolicy, setSelectedCancellationPolicy] = useState<string>('refundable_credit');

  // Fetch dynamic pricing with all rules applied
  const { data: rateVariants, isLoading } = useDynamicPricing({
    roomTypeId: roomType.id,
    checkIn: checkIn ? new Date(checkIn) : undefined,
    checkOut: checkOut ? new Date(checkOut) : undefined,
    adultsCount: guests,
    childrenCount: 0,
    infantsCount: 0,
    bookingChannel: 'direct',
    enabled: !!checkIn && !!checkOut
  });

  // Get meal plans and cancellation policies from variants
  const mealPlans = useMemo(() => {
    if (!rateVariants || rateVariants.length === 0) return [];
    const unique = new Map();
    rateVariants.forEach(v => {
      if (!unique.has(v.meal_plan_code)) {
        unique.set(v.meal_plan_code, {
          code: v.meal_plan_code,
          name: v.meal_plan_name,
          description: v.meal_plan_description,
          icon: v.meal_plan_code === 'all_meals_inclusive' ? UtensilsCrossed :
                v.meal_plan_code === 'breakfast_and_dinner' ? Coffee : Home
        });
      }
    });
    return Array.from(unique.values());
  }, [rateVariants]);

  const cancellationPolicies = useMemo(() => {
    if (!rateVariants || rateVariants.length === 0) return [];
    const unique = new Map();
    rateVariants.forEach(v => {
      if (!unique.has(v.cancellation_policy_code)) {
        unique.set(v.cancellation_policy_code, {
          code: v.cancellation_policy_code,
          name: v.cancellation_policy_name,
          description: 'View terms',
          icon: v.cancellation_policy_code === 'non_refundable' ? XCircle : CreditCard
        });
      }
    });
    return Array.from(unique.values());
  }, [rateVariants]);

  // Get selected variant from fetched data
  const selectedVariant = useMemo(() => {
    if (!rateVariants || rateVariants.length === 0) return null;
    return rateVariants.find(v => 
      v.meal_plan_code === selectedMealPlan && 
      v.cancellation_policy_code === selectedCancellationPolicy
    );
  }, [rateVariants, selectedMealPlan, selectedCancellationPolicy]);

  const handleSelectRoom = () => {
    if (selectedVariant) {
      onSelectRoom(roomType, selectedVariant);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Room Image */}
          <div className="md:col-span-1">
            <img
              src={roomType.hero_image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'}
              alt={roomType.name}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="mt-3">
              <Badge variant="secondary" className="mr-2">
                {availableCount} Available
              </Badge>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Room Info */}
            <div>
              <h3 className="text-xl font-semibold mb-2">{roomType.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{roomType.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Up to {roomType.max_guests} guests</span>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>Loading pricing options...</AlertDescription>
              </Alert>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {roomType.features && Object.entries(roomType.features).map(([key, value]) => {
                if (typeof value === 'boolean' && value) {
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {getFeatureIcon(key)}
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            <Separator />

            {/* Meal Plan Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Meal Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {mealPlans.map((plan) => {
                  const Icon = plan.icon;
                  return (
                    <button
                      key={plan.code}
                      onClick={() => setSelectedMealPlan(plan.code)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedMealPlan === plan.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <div className="text-xs font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cancellation Policy Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Cancellation Policy</label>
              <div className="grid grid-cols-2 gap-2">
                {cancellationPolicies.map((policy) => {
                  const Icon = policy.icon;
                  return (
                    <button
                      key={policy.code}
                      onClick={() => setSelectedCancellationPolicy(policy.code)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedCancellationPolicy === policy.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <div className="text-xs font-medium">{policy.name}</div>
                      <div className="text-xs text-muted-foreground">{policy.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            {selectedVariant ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold">₹{Math.round(selectedVariant.price_per_night).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">per night</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ₹{Math.round(selectedVariant.price_per_night / Math.max(guests, 2)).toLocaleString()}/guest/night
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Total for {nights} {nights === 1 ? 'night' : 'nights'}</div>
                    <div className="text-xl font-semibold">₹{Math.round(selectedVariant.total_price).toLocaleString()}</div>
                  </div>
                </div>

                <Button onClick={handleSelectRoom} className="w-full" size="lg" disabled={isLoading}>
                  Select Room & Add Services
                </Button>
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {isLoading ? 'Loading pricing...' : 'Select meal plan and cancellation policy to view pricing'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
