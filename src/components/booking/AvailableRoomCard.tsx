import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Coffee, UtensilsCrossed, Home, CreditCard, XCircle, Check } from 'lucide-react';
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
  const [selectedCancellationPolicy, setSelectedCancellationPolicy] = useState<string>('refundable_credit');

  const minGuests = 2; // Default minimum guests for room types
  const guestsForPricing = Math.max(guests, minGuests);

  // Get unique meal plans and cancellation policies from static config
  const mealPlans = [
    { code: 'all_meals_inclusive', name: 'All Meals Inclusive', description: 'Breakfast, Lunch & Dinner', icon: UtensilsCrossed },
    { code: 'breakfast_and_dinner', name: 'Breakfast & Dinner', description: 'Half Board', icon: Coffee },
    { code: 'room_only', name: 'Room Only', description: 'No Meals', icon: Home }
  ];

  const cancellationPolicies = [
    { code: 'refundable_credit', name: 'Credit Voucher', description: 'Refundable as credit', icon: CreditCard },
    { code: 'non_refundable', name: 'Non-Refundable', description: 'Best price, no refund', icon: XCircle }
  ];

  // Calculate display price using meal plan adjustment from the base rate
  const displayPrice = useMemo(() => {
    const baseRate = roomType.base_price;
    
    const { adjustedPerNight } = applyMealPlanAdjustment(
      baseRate,
      selectedMealPlan,
      guestsForPricing,
      0, // No separate children count in this component
      1 // per night calculation
    );
    
    return adjustedPerNight;
  }, [selectedMealPlan, guestsForPricing, roomType.base_price]);

  const totalPrice = useMemo(() => {
    const baseRate = roomType.base_price * nights;
    
    const { adjustedTotal } = applyMealPlanAdjustment(
      baseRate,
      selectedMealPlan,
      guestsForPricing,
      0, // No separate children count in this component
      nights
    );
    
    return adjustedTotal;
  }, [selectedMealPlan, guestsForPricing, nights, roomType.base_price]);

  const handleSelectRoom = () => {
    const variant = {
      meal_plan_code: selectedMealPlan,
      cancellation_policy_code: selectedCancellationPolicy,
      total_price: totalPrice,
      price_per_night: displayPrice
    };
    onSelectRoom(roomType, variant);
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
            
            <div className="space-y-4">
              {/* Meal Plan Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Select Meal Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {mealPlans.map(mp => {
                    const Icon = mp.icon;
                    const isSelected = selectedMealPlan === mp.code;
                    return (
                      <button
                        key={mp.code}
                        onClick={() => setSelectedMealPlan(mp.code)}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 bg-background'
                        }`}
                      >
                        {isSelected && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                        )}
                        <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-xs font-medium">{mp.name}</div>
                        <div className="text-[10px] text-muted-foreground">{mp.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Cancellation Policy Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Cancellation Policy</label>
                <div className="grid grid-cols-2 gap-2">
                  {cancellationPolicies.map(cp => {
                    const Icon = cp.icon;
                    const isSelected = selectedCancellationPolicy === cp.code;
                    return (
                      <button
                        key={cp.code}
                        onClick={() => setSelectedCancellationPolicy(cp.code)}
                        className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50 bg-background'
                        }`}
                      >
                        {isSelected && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                        )}
                        <Icon className={`h-5 w-5 mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-xs font-medium">{cp.name}</div>
                        <div className="text-[10px] text-muted-foreground">{cp.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="flex flex-col items-end">
                <div className="text-2xl font-bold">
                  ₹{Math.round(displayPrice / guestsForPricing).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">/guest/night</div>
              </div>
              
              {guests < minGuests && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 inline-block">
                  Minimum {minGuests} guests required
                </div>
              )}
              
              {nights > 0 && (
                <div className="text-lg font-semibold mt-2">
                  Total: ₹{totalPrice.toLocaleString()} <span className="text-sm text-muted-foreground font-normal">/night</span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Base price adjusts with meal plan
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Room will be automatically assigned upon booking
              </p>
              <Button 
                onClick={handleSelectRoom}
                className="w-full"
              >
                Select Room & Add Services
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
