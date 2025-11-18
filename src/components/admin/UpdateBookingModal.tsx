import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, Minus } from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpdateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => void;
}

interface AddonService {
  id: string;
  title: string;
  price: number;
  type: 'meal' | 'activity' | 'spa';
}

export function UpdateBookingModal({ isOpen, onClose, booking, onSuccess }: UpdateBookingModalProps) {
  const [newCheckOut, setNewCheckOut] = useState<Date | undefined>(undefined);
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: number }>({});
  const [availableAddons, setAvailableAddons] = useState<AddonService[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAvailableAddons();
  }, []);

  const loadAvailableAddons = async () => {
    try {
      // Load meals
      const { data: meals, error: mealsError } = await (supabase as any)
        .from('meals')
        .select('id, title, price')
        .eq('is_active', true);

      // Load activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, price_amount as price')
        .eq('is_active', true)
        .eq('price_type', 'paid');

      // Load spa services
      const { data: spa, error: spaError } = await supabase
        .from('spa_services')
        .select('id, title, price')
        .eq('is_active', true);

      const allAddons: AddonService[] = [];
      
      if (!mealsError && meals) {
        allAddons.push(...meals.map((meal: any) => ({ ...meal, type: 'meal' as const })));
      }
      
      if (!activitiesError && activities) {
        allAddons.push(...activities.map((activity: any) => ({ ...activity, type: 'activity' as const })));
      }
      
      if (!spaError && spa) {
        allAddons.push(...spa.map((service: any) => ({ ...service, type: 'spa' as const })));
      }

      setAvailableAddons(allAddons);
    } catch (error) {
      console.error('Error loading addon services:', error);
    }
  };

  const currentCheckOut = parseISO(booking.check_out);
  const extensionNights = newCheckOut ? differenceInDays(newCheckOut, currentCheckOut) : 0;
  const roomPricePerNight = booking.total_amount / differenceInDays(currentCheckOut, parseISO(booking.check_in));
  const extensionCost = extensionNights * roomPricePerNight;

  const addonsCost = Object.entries(selectedAddons).reduce((total, [addonId, quantity]) => {
    const addon = availableAddons.find(a => a.id === addonId);
    return total + (addon ? addon.price * quantity : 0);
  }, 0);

  const totalAdditionalCost = extensionCost + addonsCost;
  const newTotalAmount = booking.total_amount + totalAdditionalCost;

  const handleAddonQuantityChange = (addonId: string, change: number) => {
    setSelectedAddons(prev => {
      const currentQty = prev[addonId] || 0;
      const newQty = Math.max(0, currentQty + change);
      
      if (newQty === 0) {
        const { [addonId]: removed, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [addonId]: newQty };
    });
  };

  const handleUpdateBooking = async () => {
    setLoading(true);
    try {
      const updates: any = {};

      // Update check-out date if extended
      if (newCheckOut && extensionNights > 0) {
        updates.check_out = format(newCheckOut, 'yyyy-MM-dd');
      }

      // Update total amount
      if (totalAdditionalCost > 0) {
        updates.total_amount = newTotalAmount;
      }

      // Add new addons to existing ones
      if (Object.keys(selectedAddons).length > 0) {
        const existingMeals = Array.isArray(booking.selected_meals) ? booking.selected_meals : [];
        const existingActivities = Array.isArray(booking.selected_activities) ? booking.selected_activities : [];
        const existingSpa = Array.isArray(booking.selected_spa_services) ? booking.selected_spa_services : [];

        const newMeals = [...existingMeals];
        const newActivities = [...existingActivities];
        const newSpa = [...existingSpa];

        Object.entries(selectedAddons).forEach(([addonId, quantity]) => {
          const addon = availableAddons.find(a => a.id === addonId);
          if (!addon) return;

          const addonData = {
            id: addon.id,
            title: addon.title,
            price: addon.price,
            quantity
          };

          switch (addon.type) {
            case 'meal':
              newMeals.push(addonData);
              break;
            case 'activity':
              newActivities.push(addonData);
              break;
            case 'spa':
              newSpa.push(addonData);
              break;
          }
        });

        updates.selected_meals = newMeals;
        updates.selected_activities = newActivities;
        updates.selected_spa_services = newSpa;
      }

      // If there are additional costs, reset payment status to pending
      if (totalAdditionalCost > 0) {
        updates.payment_status = 'pending';
        updates.payment_method = null;
        updates.payment_id = null;
        updates.payment_order_id = null;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Booking Updated",
        description: totalAdditionalCost > 0 
          ? `Booking updated successfully. Additional amount of ₹${totalAdditionalCost.toLocaleString()} needs to be collected.`
          : "Booking updated successfully.",
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = extensionNights > 0 || Object.keys(selectedAddons).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Booking - {booking.booking_id}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="extend" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extend">Extend Stay</TabsTrigger>
            <TabsTrigger value="addons">Add Services</TabsTrigger>
          </TabsList>

          <TabsContent value="extend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extend Stay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Current Check-out</Label>
                    <p className="text-sm text-muted-foreground">{format(currentCheckOut, 'PPP')}</p>
                  </div>
                  <div>
                    <Label>New Check-out Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newCheckOut && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newCheckOut ? format(newCheckOut, "PPP") : "Select new date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-2 shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={newCheckOut}
                          onSelect={setNewCheckOut}
                          disabled={(date) => date <= currentCheckOut}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {extensionNights > 0 && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Extension: {extensionNights} night{extensionNights > 1 ? 's' : ''}</span>
                        <span>₹{extensionCost.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rate: ₹{roomPricePerNight.toLocaleString()} per night
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { type: 'meal', title: 'Meals', icon: '🍽️' },
                    { type: 'activity', title: 'Activities', icon: '🎯' },
                    { type: 'spa', title: 'Spa Services', icon: '💆' }
                  ].map(({ type, title, icon }) => {
                    const typeAddons = availableAddons.filter(addon => addon.type === type);
                    if (typeAddons.length === 0) return null;

                    return (
                      <Card key={type} className="border-l-4 border-l-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span>{icon}</span>
                            {title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {typeAddons.map((addon) => {
                            const quantity = selectedAddons[addon.id] || 0;
                            return (
                              <div
                                key={addon.id}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-lg border transition-all",
                                  quantity > 0 
                                    ? "border-primary/30 bg-primary/5" 
                                    : "border-border hover:border-primary/20"
                                )}
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{addon.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    ₹{addon.price.toLocaleString()} per {type === 'meal' ? 'serving' : 'session'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddonQuantityChange(addon.id, -1)}
                                      disabled={quantity === 0}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddonQuantityChange(addon.id, 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {quantity > 0 && (
                                    <div className="text-sm font-medium text-primary">
                                      ₹{(addon.price * quantity).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {hasChanges && (
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium">Update Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Total:</span>
                  <span>₹{booking.total_amount.toLocaleString()}</span>
                </div>
                {extensionCost > 0 && (
                  <div className="flex justify-between">
                    <span>Extension Cost:</span>
                    <span>₹{extensionCost.toLocaleString()}</span>
                  </div>
                )}
                {addonsCost > 0 && (
                  <div className="flex justify-between">
                    <span>Add-on Services:</span>
                    <span>₹{addonsCost.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>New Total:</span>
                  <span>₹{newTotalAmount.toLocaleString()}</span>
                </div>
                {totalAdditionalCost > 0 && (
                  <div className="flex justify-between text-primary font-medium">
                    <span>Additional Amount Due:</span>
                    <span>₹{totalAdditionalCost.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateBooking}
            disabled={!hasChanges || loading}
          >
            Update Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}