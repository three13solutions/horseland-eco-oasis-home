import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
            <div className="border rounded-lg p-1">
              <Calendar
                mode="range"
                selected={date}
                onSelect={setDate}
                initialFocus
                className={cn('pointer-events-auto')}
              />
            </div>
          </div>

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
              disabled={!date?.from || !date?.to || availableUnits === 0 || loading}
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
