import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Plus, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type GuestSelectorProps = {
  totalGuests: number;
  onGuestsChange: (total: number, adults: number, children: number, infants?: number) => void;
  className?: string;
  variant?: 'default' | 'hero';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const GuestSelector: React.FC<GuestSelectorProps> = ({ 
  totalGuests, 
  onGuestsChange, 
  className,
  variant = 'default',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  // Initialize from totalGuests prop
  useEffect(() => {
    if (totalGuests > 0) {
      setAdults(Math.max(1, totalGuests));
      setChildren(0);
      setInfants(0);
    }
  }, []);

  const handleAdultsChange = (delta: number) => {
    const newAdults = Math.max(1, Math.min(20, adults + delta)); // Increased cap to 20
    setAdults(newAdults);
    onGuestsChange(newAdults + children, newAdults, children, infants);
  };

  const handleChildrenChange = (delta: number) => {
    const newChildren = Math.max(0, Math.min(15, children + delta)); // Increased cap to 15
    setChildren(newChildren);
    onGuestsChange(adults + newChildren, adults, newChildren, infants);
  };

  const handleInfantsChange = (delta: number) => {
    const newInfants = Math.max(0, Math.min(10, infants + delta)); // Increased cap to 10
    setInfants(newInfants);
    onGuestsChange(adults + children, adults, children, newInfants);
  };

  const total = adults + children;

  const guestBreakdown = [
    adults > 0 && `${adults} Adult${adults !== 1 ? 's' : ''}`,
    children > 0 && `${children} Child${children !== 1 ? 'ren' : ''}`,
    infants > 0 && `${infants} Infant${infants !== 1 ? 's' : ''}`
  ].filter(Boolean).join(', ');

  const buttonClasses = variant === 'hero' 
    ? "w-full h-12 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white rounded-xl justify-between text-left font-normal"
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
            {/* Adults */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Adults</div>
                <div className="text-xs text-muted-foreground">10+ Years</div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleAdultsChange(-1)}
                  disabled={adults <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{adults}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleAdultsChange(1)}
                  disabled={adults >= 20}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Children</div>
                <div className="text-xs text-muted-foreground">2-9 Years</div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleChildrenChange(-1)}
                  disabled={children <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{children}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleChildrenChange(1)}
                  disabled={children >= 15}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Infants */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">Infants</div>
                <div className="text-xs text-muted-foreground">0-2 Years (Free)</div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleInfantsChange(-1)}
                  disabled={infants <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{infants}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleInfantsChange(1)}
                  disabled={infants >= 10}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Adults (10+ years) pay full price. Children (2-9 years) are charged at half the adult rate.
              Infants (0-2 years) stay free.
              Please provide the right number of guests for the best options and prices.
            </p>
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