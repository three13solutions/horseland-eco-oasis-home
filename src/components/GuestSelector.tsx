import { guestHeadcount, guestOccupancy, legacyGuestCounts, type GuestCounts } from '@/lib/guest-counts';
import { guestTypeName } from '@/lib/guest-age-policy';
import { useGuestAgePolicy } from '@/hooks/useGuestAgePolicy';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Plus, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type GuestSelectorProps = {
  totalGuests: number;
  guestCounts?: GuestCounts;
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  onGuestsChange: (total: number, adults: number, children: number, infants?: number, counts?: GuestCounts) => void;
  className?: string;
  variant?: 'default' | 'hero';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const GuestSelector: React.FC<GuestSelectorProps> = ({ 
  totalGuests,
  guestCounts,
  adultsCount,
  childrenCount,
  infantsCount,
  onGuestsChange, 
  className,
  variant = 'default',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const agePolicy = useGuestAgePolicy();
  const [counts, setCounts] = useState<GuestCounts>(guestCounts ?? legacyGuestCounts(Math.max(1, adultsCount ?? totalGuests ?? 2), childrenCount ?? 0, infantsCount ?? 0));
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  useEffect(() => {
    setCounts(guestCounts ?? legacyGuestCounts(Math.max(1, adultsCount ?? totalGuests ?? 2), childrenCount ?? 0, infantsCount ?? 0));
  }, [guestCounts, totalGuests, adultsCount, childrenCount, infantsCount]);
  const changeCount = (key: string, delta: number) => {
    const minimum = key === 'adult' ? 1 : 0;
    const next = {...counts, [key]: Math.max(minimum, Math.min(100, (counts[key] ?? 0) + delta))};
    if (guestHeadcount(next) > 100) return;
    setCounts(next);
    onGuestsChange(guestOccupancy(next), next.adult ?? 0, next.child ?? 0, next.infant ?? 0, next);
  };
  const total = guestHeadcount(counts);
  const bands = agePolicy.data?.bands.filter(b => b.enabled !== false) ?? [];
  const guestBreakdown = bands.filter(b => (counts[b.key] ?? 0) > 0).map(b => `${counts[b.key]} ${guestTypeName(b)}`).join(', ');

  const buttonClasses = variant === 'hero' 
    ? "w-full h-12 bg-background/20 border-border/30 text-primary-foreground hover:bg-background/30 hover:text-primary-foreground rounded-xl justify-between text-left font-normal"
    : "w-full justify-between text-left h-10";

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(buttonClasses, className)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">
                    {total} {total === 1 ? 'Guest' : 'Guests'}
                  </span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
                </div>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          {guestBreakdown && (
            <TooltipContent side="top" className="bg-popover text-popover-foreground">
              <p className="text-sm">{guestBreakdown}</p>
            </TooltipContent>
          )}
        </Tooltip>
      <PopoverContent className="w-80 bg-background border shadow-lg z-50" align="start">
        <div className="space-y-4 p-2">
          <div className="space-y-3">
            {bands.map(band => <div key={band.key} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0"><div className="font-medium break-words">{guestTypeName(band)}</div><div className="text-xs text-muted-foreground">{agePolicy.label(band.key)}</div></div>
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label={`Remove ${guestTypeName(band)}`} disabled={(counts[band.key] ?? 0) <= (band.key==='adult'?1:0)} onClick={()=>changeCount(band.key,-1)}><Minus className="h-3 w-3"/></Button>
                <span className="w-8 text-center font-medium">{counts[band.key] ?? 0}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" aria-label={`Add ${guestTypeName(band)}`} disabled={total>=100} onClick={()=>changeCount(band.key,1)}><Plus className="h-3 w-3"/></Button>
              </div>
            </div>)}
            {agePolicy.isLoading&&<p className="text-sm text-muted-foreground">Loading guest types…</p>}
            {agePolicy.isError&&<p role="alert" className="text-sm text-destructive">Guest types could not be verified. <Button size="sm" variant="outline" onClick={()=>agePolicy.refetch()}>Retry</Button></p>}
            {Object.keys(counts).some(key=>counts[key]>0&&!bands.some(b=>b.key===key))&&agePolicy.data&&<p role="alert" className="text-sm text-destructive">Guest policies changed. Review your guest selection before booking.</p>}
          </div>

          <Button 
            className="w-full" 
            onClick={() => setIsOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    </TooltipProvider>
  );
};

export default GuestSelector;
