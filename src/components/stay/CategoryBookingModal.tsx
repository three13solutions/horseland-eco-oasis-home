import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

  if (!category) return null;

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
