import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, Coffee } from 'lucide-react';
import { useDynamicPricing, applyMealPlanAdjustment } from '@/hooks/useDynamicPricing';
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
  onSelectRoom: (roomType: RoomType, variant?: any) => void;
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
  const [selectedCancellationPolicy, setSelectedCancellationPolicy] = useState<string>('non_refundable');

  const minGuests = 2; // Default minimum guests for room types
  const guestsForPricing = Math.max(guests, minGuests);

  // Fetch dynamic pricing variants
  const { data: variants, isLoading } = useDynamicPricing({
    roomTypeId: roomType.id,
    checkIn: checkIn ? new Date(checkIn) : undefined,
    checkOut: checkOut ? new Date(checkOut) : undefined,
    adultsCount: guestsForPricing,
    childrenCount: 0,
    infantsCount: 0,
    enabled: !!(checkIn && checkOut)
  });

  // Get unique meal plans and cancellation policies
  const mealPlans = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    const unique = Array.from(new Set(variants.map(v => v.meal_plan_code)));
    return unique.map(code => {
      const variant = variants.find(v => v.meal_plan_code === code);
      return { code, name: variant?.meal_plan_name || code };
    });
  }, [variants]);

  const cancellationPolicies = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    const unique = Array.from(new Set(variants.map(v => v.cancellation_policy_code)));
    return unique.map(code => {
      const variant = variants.find(v => v.cancellation_policy_code === code);
      return { code, name: variant?.cancellation_policy_name || code };
    });
  }, [variants]);

  // Calculate display price based on selected meal plan and cancellation policy
  const selectedVariant = useMemo(() => {
    if (!variants || !selectedMealPlan || !selectedCancellationPolicy) return null;
    return variants.find(v => 
      v.meal_plan_code === selectedMealPlan && 
      v.cancellation_policy_code === selectedCancellationPolicy
    );
  }, [variants, selectedMealPlan, selectedCancellationPolicy]);
  
  let displayPrice = roomType.base_price;
  let totalPrice = displayPrice * nights;
  
  if (selectedVariant) {
    const { adjustedTotal, adjustedPerNight } = applyMealPlanAdjustment(
      selectedVariant.total_price,
      selectedVariant.meal_plan_code,
      guestsForPricing,
      0,
      nights
    );
    displayPrice = adjustedPerNight;
    totalPrice = adjustedTotal;
  }

  const handleSelectRoom = () => {
    onSelectRoom(roomType, selectedVariant);
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
          </div>

          {/* Room Details */}
          <div className="md:col-span-1 space-y-4">
            <div>
              <h3 className="text-xl font-heading font-bold">{roomType.name}</h3>
              {roomType.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {roomType.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Up to {roomType.max_guests} guests</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.isArray(roomType.features) ? 
                roomType.features.slice(0, 4).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    <span className="mr-1">{getFeatureIcon(feature)}</span>
                    {feature}
                  </Badge>
                )) :
                typeof roomType.features === 'string' ?
                  JSON.parse(roomType.features).slice(0, 4).map((feature: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <span className="mr-1">{getFeatureIcon(feature)}</span>
                      {feature}
                    </Badge>
                  )) : null
              }
            </div>

            <div className="text-sm text-green-600 font-medium">
              {availableCount} room{availableCount !== 1 ? 's' : ''} available
            </div>
          </div>

          {/* Pricing and Booking */}
          <div className="md:col-span-1 space-y-4">
            {guests < minGuests && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This room accommodates a minimum of {minGuests} guests. Pricing is calculated for {minGuests} guests.
                </AlertDescription>
              </Alert>
            )}
            
            {variants && variants.length > 0 && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Meal Plan</label>
                  <Select value={selectedMealPlan} onValueChange={setSelectedMealPlan}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select meal plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {mealPlans.map(mp => (
                        <SelectItem key={mp.code} value={mp.code} className="text-xs">
                          {mp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Cancellation Policy</label>
                  <Select value={selectedCancellationPolicy} onValueChange={setSelectedCancellationPolicy}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Refundable / Non-refundable" />
                    </SelectTrigger>
                    <SelectContent>
                      {cancellationPolicies.map(cp => (
                        <SelectItem key={cp.code} value={cp.code} className="text-xs">
                          {cp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedVariant && (
                  <div className="flex items-baseline gap-1 pt-1">
                    <Coffee className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Includes: {selectedVariant.included_meals.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="text-right space-y-2">
              <div className="text-2xl font-bold">
                ₹{displayPrice.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">per night</div>
              
              {guests >= 2 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 inline-block">
                  Charged for minimum {Math.max(2, guests)} {Math.max(2, guests) === 1 ? 'guest' : 'guests'}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                ≈ ₹{Math.round(displayPrice / Math.max(2, guests)).toLocaleString()} / person / night
              </div>
              
              {nights > 0 && (
                <div className="text-lg font-semibold mt-2">
                  Total: ₹{totalPrice.toLocaleString()}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Room will be automatically assigned upon booking
              </p>
              <Button 
                onClick={handleSelectRoom}
                className="w-full"
                disabled={variants && variants.length > 0 && (!selectedMealPlan || !selectedCancellationPolicy)}
              >
                {variants && variants.length > 0 && (!selectedMealPlan || !selectedCancellationPolicy) 
                  ? 'Select meal plan & policy'
                  : 'Select Room & Add Services'
                }
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
