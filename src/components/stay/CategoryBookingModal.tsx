import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RateVariantSelector } from '@/components/booking/RateVariantSelector';
import { PriceBreakdown } from '@/components/booking/PriceBreakdown';
import { useDynamicPricing, applyMealPlanAdjustment } from '@/hooks/useDynamicPricing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

import type { Category } from './CategoryCard';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
};

const CategoryBookingModal: React.FC<Props> = ({ open, onOpenChange, category }) => {
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [guests, setGuests] = React.useState<number>(2);
  const [extraMattress, setExtraMattress] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>('');
  const [availableUnits, setAvailableUnits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  const nights = date?.from && date?.to 
    ? Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const minGuests = 2; // Default minimum guests
  const totalGuests = guests + extraMattress;
  const guestsForPricing = Math.max(totalGuests, minGuests);
  
  const { data: variants = [], isLoading: variantsLoading } = useDynamicPricing({
    roomTypeId: category?.id,
    checkIn: date?.from,
    checkOut: date?.to,
    adultsCount: guests + extraMattress, // Using total guests as adults for backwards compatibility
    childrenCount: 0,
    infantsCount: 0,
    enabled: !!date?.from && !!date?.to && availableUnits > 0
  });

  const checkAvailability = async () => {
    if (!category?.id || !date?.from || !date?.to) {
      setAvailableUnits(0);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_room_availability', {
        p_room_type_id: category.id,
        p_check_in: date.from.toISOString().split('T')[0],
        p_check_out: date.to.toISOString().split('T')[0]
      });

      if (error) throw error;
      
      setAvailableUnits(data?.[0]?.available_units || 0);
    } catch (error) {
      toast.error("Failed to check availability");
      setAvailableUnits(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAvailability();
  }, [category?.id, date?.from, date?.to]);

  if (!category) return null;

  // Calculate occupancy limits based on bed configuration
  const baseOccupancy = Math.min(category.maxGuests, 4); // Assume standard bed configs support up to 4
  const maxExtraMattress = category.maxGuests - baseOccupancy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{category.name}</DialogTitle>
          <DialogDescription>{category.tagline}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Max occupancy</div>
                <div className="font-semibold">{category.maxGuests} guests</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Budget</div>
                <div className="font-semibold text-primary">{category.budget}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Bed configuration</div>
                <div className="font-medium">{category.bedConfigurations.join(' · ')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Location</div>
                <div className="font-medium">{category.viewLocations.join(' · ')}</div>
              </div>
            </div>
            {date?.from && date?.to && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Available Units:
                  </span>
                  <span className={`text-sm font-bold ${availableUnits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {loading ? "Checking..." : availableUnits}
                  </span>
                </div>
                {availableUnits === 0 && !loading && (
                  <p className="text-xs text-red-600 mt-1">
                    No units available for selected dates
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Guest Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base">Guest Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guests" className="text-sm font-medium">Number of Guests</Label>
                <Select value={guests.toString()} onValueChange={(value) => setGuests(Number(value))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: baseOccupancy }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {maxExtraMattress > 0 && (
                <div>
                  <Label htmlFor="extra-mattress" className="text-sm font-medium">Extra Mattress</Label>
                  <Select value={extraMattress.toString()} onValueChange={(value) => setExtraMattress(Number(value))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select extra mattress" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: maxExtraMattress + 1 }, (_, i) => i).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num === 0 ? 'None' : `${num} ${num === 1 ? 'Mattress' : 'Mattresses'}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground mt-1">
                    Max total: {category.maxGuests} guests
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Select Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1.5 justify-start text-left font-normal",
                        !date?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? format(date.from, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-2 shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={date?.from}
                      onSelect={(newDate) => {
                        setDate(prev => {
                          const newRange = { from: newDate, to: prev?.to };
                          // Clear checkout if new check-in is after current checkout
                          if (newDate && prev?.to && newDate >= prev.to) {
                            return { from: newDate, to: undefined };
                          }
                          return newRange;
                        });
                      }}
                      disabled={(checkDate) => checkDate < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1.5 justify-start text-left font-normal",
                        !date?.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.to ? format(date.to, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-2 shadow-2xl" align="start">
                    <Calendar
                      mode="range"
                      selected={date?.from ? { from: date.from, to: date?.to } : undefined}
                      onSelect={(range) => {
                        if (range?.to) {
                          setDate(range);
                        } else if (range?.from && !range?.to) {
                          // Single click sets the checkout date
                          setDate({ from: date?.from, to: range.from });
                        }
                      }}
                      defaultMonth={date?.from}
                      disabled={(checkDate) => {
                        const today = new Date(new Date().setHours(0, 0, 0, 0));
                        return !date?.from || checkDate <= date.from || checkDate < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Rate Variant Selector */}
          {date?.from && date?.to && availableUnits > 0 && variants.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Select Rate Plan</h3>
              
              {totalGuests < minGuests && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This room accommodates a minimum of {minGuests} guests. Pricing is calculated for {minGuests} guests.
                  </AlertDescription>
                </Alert>
              )}
              
              <RateVariantSelector
                variants={variants}
                selectedVariant={selectedVariant}
                onSelect={setSelectedVariant}
                nights={nights}
                adultsCount={guestsForPricing}
                childrenCount={0}
              />
              
              {selectedVariant && (() => {
                const { adjustedTotal } = applyMealPlanAdjustment(
                  selectedVariant.total_price,
                  selectedVariant.meal_plan_code,
                  guestsForPricing,
                  0,
                  nights
                );
                return (
                  <PriceBreakdown
                    roomRate={adjustedTotal}
                    mealCost={0}
                    policyAdjustment={0}
                    nights={nights}
                    guestCount={totalGuests}
                    mealPlanName={selectedVariant.meal_plan_name}
                    includedMeals={selectedVariant.included_meals || []}
                  />
                );
              })()}
            </div>
          )}

          {/* Special Requests */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-semibold">Special Requests</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or notes for your stay..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={() => onOpenChange(false)} 
              className="sm:flex-1"
              disabled={!date?.from || !date?.to || availableUnits === 0 || loading || !selectedVariant}
            >
              {!selectedVariant && date?.from && date?.to && availableUnits > 0 
                ? 'Select a Rate Plan' 
                : 'Continue to Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryBookingModal;
