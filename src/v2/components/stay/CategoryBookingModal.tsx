import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { applyMealPlanAdjustment } from '@/hooks/useDynamicPricing';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

import type { Category } from './CategoryCard';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
};

const MEAL_PLANS = [
  { code: 'all_meals_inclusive', name: 'Full Board' },
  { code: 'breakfast_and_dinner', name: 'Half Board' },
  { code: 'room_only', name: 'Room Only' },
];

const CategoryBookingModal: React.FC<Props> = ({ open, onOpenChange, category }) => {
  const navigate = useNavigate();
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [guests, setGuests] = React.useState<number>(2);
  const [extraMattress, setExtraMattress] = React.useState<number>(0);
  const [notes, setNotes] = React.useState<string>('');
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('all_meals_inclusive');

  // Popover states for auto-advance
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [guestSelectorOpen, setGuestSelectorOpen] = useState(false);

  const nights = date?.from && date?.to
    ? Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const minGuests = 2;
  const totalGuests = guests + extraMattress;
  const guestsForPricing = Math.max(totalGuests, minGuests);

  // Static availability: we no longer verify via RPC. Assume units are available;
  // the actual availability check happens on the shared V1 booking / search page.
  const availableUnits = category ? 1 : 0;

  const priceEstimate = useMemo(() => {
    if (!category || !nights) return null;
    const { adjustedTotal } = applyMealPlanAdjustment(
      category.basePrice * nights,
      selectedMealPlan,
      guestsForPricing,
      0,
      nights
    );
    return adjustedTotal;
  }, [category, nights, selectedMealPlan, guestsForPricing]);

  if (!category) return null;

  // Calculate occupancy limits based on bed configuration
  const baseOccupancy = Math.min(category.maxGuests, 4);
  const maxExtraMattress = category.maxGuests - baseOccupancy;

  const handleContinue = () => {
    onOpenChange(false);

    if (date?.from && date?.to) {
      const searchParams = new URLSearchParams({
        checkIn: date.from.toISOString().split('T')[0],
        checkOut: date.to.toISOString().split('T')[0],
        guests: totalGuests.toString(),
        adults: guests.toString(),
        children: '0',
        roomTypeId: category.id,
        mealPlan: selectedMealPlan,
      });
      navigate(`/booking?${searchParams.toString()}`);
    } else {
      navigate(`/search-availability?roomTypeId=${category.id}`);
    }
  };

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
                <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
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
                          if (newDate && prev?.to && newDate >= prev.to) {
                            return { from: newDate, to: undefined };
                          }
                          return newRange;
                        });
                        if (newDate) {
                          setCheckInOpen(false);
                          setTimeout(() => setCheckOutOpen(true), 100);
                        }
                      }}
                      disabled={(checkDate) => checkDate < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm font-medium">Check-out</Label>
                <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
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
                          setCheckOutOpen(false);
                          setTimeout(() => setGuestSelectorOpen(true), 100);
                        } else if (range?.from && !range?.to) {
                          setDate({ from: date?.from, to: range.from });
                          setCheckOutOpen(false);
                          setTimeout(() => setGuestSelectorOpen(true), 100);
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

          {/* Rate Plan Selector (static meal plans) */}
          {date?.from && date?.to && (
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

              <div className="grid grid-cols-3 gap-2">
                {MEAL_PLANS.map((mp) => (
                  <button
                    key={mp.code}
                    onClick={() => setSelectedMealPlan(mp.code)}
                    className={cn(
                      'relative p-2 rounded-lg border-2 transition-all text-left',
                      selectedMealPlan === mp.code
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-background'
                    )}
                  >
                    <div className="text-xs font-medium">{mp.name}</div>
                  </button>
                ))}
              </div>

              {priceEstimate !== null && (
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated total ({nights} night{nights > 1 ? 's' : ''})</span>
                    <span className="font-semibold">₹{priceEstimate.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
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
              onClick={handleContinue}
              className="sm:flex-1"
              disabled={!date?.from || !date?.to || availableUnits === 0}
            >
              Continue to Booking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryBookingModal;
