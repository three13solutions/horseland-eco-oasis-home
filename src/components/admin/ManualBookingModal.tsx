import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, User, Mail, Phone, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomUnitId: string;
  roomName: string;
  preSelectedDates?: {
    checkIn: Date;
    checkOut: Date;
  };
  onBookingCreated?: () => void;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
  isOpen,
  onClose,
  roomUnitId,
  roomName,
  preSelectedDates,
  onBookingCreated
}) => {
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(preSelectedDates?.checkIn);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(preSelectedDates?.checkOut);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed'>('pending');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Addon services state
  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [availableSpaServices, setAvailableSpaServices] = useState<any[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
  const [selectedSpaServices, setSelectedSpaServices] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Load addon services
  useEffect(() => {
    const loadAddonServices = async () => {
      try {
        const [mealsRes, activitiesRes, spaRes] = await Promise.all([
          supabase.from('meals').select('*').eq('is_active', true),
          supabase.from('activities').select('*').eq('is_active', true),
          supabase.from('spa_services').select('*').eq('is_active', true)
        ]);

        if (mealsRes.data) setAvailableMeals(mealsRes.data);
        if (activitiesRes.data) setAvailableActivities(activitiesRes.data);
        if (spaRes.data) setAvailableSpaServices(spaRes.data);
      } catch (error) {
        console.error('Error loading addon services:', error);
      }
    };

    if (isOpen) {
      loadAddonServices();
    }
  }, [isOpen]);

  const generateBookingId = () => {
    const prefix = 'BK';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const addAddonToBooking = (type: 'meals' | 'activities' | 'spa_services', addon: any) => {
    const addonWithQuantity = { ...addon, quantity: 1, name: addon.title };
    
    switch (type) {
      case 'meals':
        setSelectedMeals(prev => [...prev, addonWithQuantity]);
        break;
      case 'activities':
        setSelectedActivities(prev => [...prev, { ...addonWithQuantity, price: addon.price_amount || 0 }]);
        break;
      case 'spa_services':
        setSelectedSpaServices(prev => [...prev, addonWithQuantity]);
        break;
    }
  };

  const removeAddonFromBooking = (type: 'meals' | 'activities' | 'spa_services', index: number) => {
    switch (type) {
      case 'meals':
        setSelectedMeals(prev => prev.filter((_, i) => i !== index));
        break;
      case 'activities':
        setSelectedActivities(prev => prev.filter((_, i) => i !== index));
        break;
      case 'spa_services':
        setSelectedSpaServices(prev => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const updateAddonQuantity = (type: 'meals' | 'activities' | 'spa_services', index: number, quantity: number) => {
    switch (type) {
      case 'meals':
        setSelectedMeals(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
        break;
      case 'activities':
        setSelectedActivities(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
        break;
      case 'spa_services':
        setSelectedSpaServices(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkInDate || !checkOutDate) {
      toast({
        title: "Error",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    if (!guestName.trim()) {
      toast({
        title: "Error",
        description: "Please enter guest name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const bookingData = {
        booking_id: generateBookingId(),
        room_unit_id: roomUnitId,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
        check_in: format(checkInDate, 'yyyy-MM-dd'),
        check_out: format(checkOutDate, 'yyyy-MM-dd'),
        guests_count: guestsCount,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        notes: notes.trim() || null,
      };

      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) throw error;

      toast({
        title: "Booking Created",
        description: `Manual booking ${bookingData.booking_id} created successfully`,
      });

      // Reset form
      setCheckInDate(undefined);
      setCheckOutDate(undefined);
      setGuestName('');
      setGuestEmail('');
      setGuestPhone('');
      setGuestsCount(2);
      setPaymentStatus('pending');
      setTotalAmount(0);
      setNotes('');
      setSelectedMeals([]);
      setSelectedActivities([]);
      setSelectedSpaServices([]);
      
      onClose();
      if (onBookingCreated) {
        onBookingCreated();
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="manual-booking-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Manual Booking - {roomName}
          </DialogTitle>
        </DialogHeader>
        <div id="manual-booking-description" className="sr-only">
          Create a manual booking for {roomName} with guest information and payment details
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkInDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={setCheckInDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOutDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={setCheckOutDate}
                    disabled={(date) => !checkInDate || date <= checkInDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Guest Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guestPhone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestsCount">Number of Guests</Label>
                <Input
                  id="guestsCount"
                  type="number"
                  min="1"
                  max="10"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(value: 'pending' | 'confirmed') => setPaymentStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed/Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Add-on Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add-on Services (Optional)</h3>
            
            {/* Meals */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-orange-600">🍽️ Meals</Label>
              {selectedMeals.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedMeals.map((meal, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-md">
                      <span className="flex-1 text-sm">{meal.name}</span>
                      <Input
                        type="number"
                        min="1"
                        value={meal.quantity}
                        onChange={(e) => updateAddonQuantity('meals', index, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">₹{(meal.price * meal.quantity).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAddonFromBooking('meals', index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Select onValueChange={(value) => {
                const meal = availableMeals.find(m => m.id === value);
                if (meal) addAddonToBooking('meals', meal);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Add meals" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {availableMeals.map((meal) => (
                    <SelectItem key={meal.id} value={meal.id}>
                      {meal.title} - ₹{meal.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activities */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-green-600">🏃 Activities</Label>
              {selectedActivities.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedActivities.map((activity, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                      <span className="flex-1 text-sm">{activity.name}</span>
                      <Input
                        type="number"
                        min="1"
                        value={activity.quantity}
                        onChange={(e) => updateAddonQuantity('activities', index, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">₹{(activity.price * activity.quantity).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAddonFromBooking('activities', index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Select onValueChange={(value) => {
                const activity = availableActivities.find(a => a.id === value);
                if (activity) addAddonToBooking('activities', activity);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Add activities" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {availableActivities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title} - ₹{activity.price_amount || 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spa Services */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-purple-600">🧘 Spa Services</Label>
              {selectedSpaServices.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedSpaServices.map((spa, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                      <span className="flex-1 text-sm">{spa.name}</span>
                      <Input
                        type="number"
                        min="1"
                        value={spa.quantity}
                        onChange={(e) => updateAddonQuantity('spa_services', index, parseInt(e.target.value) || 1)}
                        className="w-16 h-8"
                      />
                      <span className="text-sm">₹{(spa.price * spa.quantity).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAddonFromBooking('spa_services', index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Select onValueChange={(value) => {
                const spa = availableSpaServices.find(s => s.id === value);
                if (spa) addAddonToBooking('spa_services', spa);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Add spa services" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {availableSpaServices.map((spa) => (
                    <SelectItem key={spa.id} value={spa.id}>
                      {spa.title} - ₹{spa.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};