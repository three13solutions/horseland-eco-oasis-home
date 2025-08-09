import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

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

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Max occupancy</div>
              <div className="font-medium">{category.maxGuests} guests</div>
            </div>
            <div>
              <div className="text-muted-foreground">Bed configuration</div>
              <div className="font-medium">{category.bedConfigurations.join(' · ')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Budget</div>
              <div className="font-medium">{category.budget}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Location</div>
              <div className="font-medium">{category.viewLocations.join(' · ')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guests" className="text-sm font-medium mb-2 block">Number of Guests</Label>
              <Select value={guests.toString()} onValueChange={(value) => setGuests(Number(value))}>
                <SelectTrigger>
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
                <Label htmlFor="extra-mattress" className="text-sm font-medium mb-2 block">Extra Mattress</Label>
                <Select value={extraMattress.toString()} onValueChange={(value) => setExtraMattress(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Extra mattress" />
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
                  Max occupancy: {category.maxGuests} guests
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">Select dates</div>
            <Calendar
              mode="range"
              selected={date}
              onSelect={setDate}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Special Requests / Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests or notes for your stay..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => onOpenChange(false)}>Continue to booking</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryBookingModal;
