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
  const [existingGuest, setExistingGuest] = useState<any>(null);
  const [showGuestMatch, setShowGuestMatch] = useState(false);
  
  // Addon services state
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('no-package');
  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [availableSpaServices, setAvailableSpaServices] = useState<any[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<any[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
  const [selectedSpaServices, setSelectedSpaServices] = useState<any[]>([]);
  
  const { toast } = useToast();

  // Load addon services and packages
  useEffect(() => {
    const loadData = async () => {
      try {
        const [packagesRes, mealsRes, activitiesRes, spaRes] = await Promise.all([
          supabase.from('packages').select('*').eq('is_active', true),
          supabase.from('meals').select('*').eq('is_active', true),
          supabase.from('activities').select('*').eq('is_active', true),
          supabase.from('spa_services').select('*').eq('is_active', true)
        ]);

        if (packagesRes.data) setAvailablePackages(packagesRes.data);
        if (mealsRes.data) setAvailableMeals(mealsRes.data);
        if (activitiesRes.data) setAvailableActivities(activitiesRes.data);
        if (spaRes.data) setAvailableSpaServices(spaRes.data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);
    
    if (!packageId || packageId === 'no-package') {
      // Clear all selections if no package is selected
      setSelectedMeals([]);
      setSelectedActivities([]);
      setSelectedSpaServices([]);
      return;
    }

    // Find the selected package
    const selectedPkg = availablePackages.find(pkg => pkg.id === packageId);
    if (!selectedPkg?.components) return;

    const components = selectedPkg.components;
    
    // Auto-populate meals
    if (components.meals && Array.isArray(components.meals)) {
      const packageMeals = components.meals.map((mealId: string) => {
        const meal = availableMeals.find(m => m.id === mealId);
        return meal ? { ...meal, quantity: 1, name: meal.title } : null;
      }).filter(Boolean);
      setSelectedMeals(packageMeals);
    }

    // Auto-populate activities
    if (components.activities && Array.isArray(components.activities)) {
      const packageActivities = components.activities.map((activityId: string) => {
        const activity = availableActivities.find(a => a.id === activityId);
        return activity ? { ...activity, quantity: 1, name: activity.title, price: activity.price_amount || 0 } : null;
      }).filter(Boolean);
      setSelectedActivities(packageActivities);
    }

    // Auto-populate spa services
    if (components.spa_services && Array.isArray(components.spa_services)) {
      const packageSpaServices = components.spa_services.map((spaId: string) => {
        const spa = availableSpaServices.find(s => s.id === spaId);
        return spa ? { ...spa, quantity: 1, name: spa.title } : null;
      }).filter(Boolean);
      setSelectedSpaServices(packageSpaServices);
    }

    // Update total amount based on package price
    if (selectedPkg.weekday_price) {
      setTotalAmount(selectedPkg.weekday_price);
    }
  };

  const normalizePhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '');
    // Remove country code if present (91 for India)
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.substring(2);
    }
    return digitsOnly;
  };

  const findExistingGuest = async (email?: string, phone?: string) => {
    if (!email && !phone) return null;

    console.log('Searching for existing guest with:', { email, phone });

    try {
      if (email && email.trim()) {
        console.log('Checking email:', email.trim());
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .eq('email', email.trim())
          .limit(1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          console.log('Found guest by email:', data[0]);
          return data[0];
        }
      }
      
      if (phone && phone.trim()) {
        const normalizedPhone = normalizePhoneNumber(phone.trim());
        console.log('Checking phone. Original:', phone, 'Normalized:', normalizedPhone);
        
        // Search for guests with phone numbers that normalize to the same value
        const { data: allGuests, error } = await supabase
          .from('guests')
          .select('*')
          .not('phone', 'is', null);
        
        if (error) throw error;
        
        const matchingGuest = allGuests?.find(guest => {
          if (!guest.phone) return false;
          const guestNormalizedPhone = normalizePhoneNumber(guest.phone);
          console.log('Comparing normalized phones:', normalizedPhone, 'vs', guestNormalizedPhone);
          return guestNormalizedPhone === normalizedPhone;
        });
        
        if (matchingGuest) {
          console.log('Found guest by phone:', matchingGuest);
          return matchingGuest;
        }
      }

      console.log('No existing guest found');
      return null;
    } catch (error) {
      console.error('Error finding existing guest:', error);
      return null;
    }
  };

  const checkForExistingGuest = async (email?: string, phone?: string) => {
    console.log('checkForExistingGuest called with:', { email, phone });
    
    // Check individually for email or phone
    let guest = null;
    
    if (email && email.trim()) {
      console.log('Checking for existing guest by email...');
      guest = await findExistingGuest(email.trim());
    }
    
    if (!guest && phone && phone.trim()) {
      console.log('Checking for existing guest by phone...');
      guest = await findExistingGuest(undefined, phone.trim());
    }
    
    if (guest) {
      console.log('Found existing guest:', guest);
      setExistingGuest(guest);
      setShowGuestMatch(true);
      // Auto-populate guest name if it matches
      if (!guestName.trim()) {
        setGuestName(`${guest.first_name} ${guest.last_name}`);
      }
      
      toast({
        title: "Existing Guest Found",
        description: `Found existing guest: ${guest.first_name} ${guest.last_name}. This booking will be linked to their profile.`,
      });
    } else {
      console.log('No existing guest found');
      setExistingGuest(null);
      setShowGuestMatch(false);
    }
  };

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
    
    alert('MANUAL BOOKING MODAL DETECTED - This alert confirms which form you are using');
    
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Guest Email:', guestEmail);
    console.log('Guest Phone:', guestPhone);
    
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

    // MANDATORY check for existing guest before creating booking
    console.log('=== CHECKING FOR EXISTING GUEST ===');
    try {
      let existingGuestCheck = null;
      
      // Check by email first
      if (guestEmail && guestEmail.trim()) {
        console.log('Checking email:', guestEmail.trim());
        const { data: emailGuests, error: emailError } = await supabase
          .from('guests')
          .select('*')
          .eq('email', guestEmail.trim())
          .limit(1);
          
        if (emailError) {
          console.error('Email check error:', emailError);
        } else if (emailGuests && emailGuests.length > 0) {
          existingGuestCheck = emailGuests[0];
          console.log('Found existing guest by email:', existingGuestCheck);
        }
      }
      
      // Check by phone if no email match
      if (!existingGuestCheck && guestPhone && guestPhone.trim()) {
        console.log('Checking phone:', guestPhone.trim());
        const normalizedInputPhone = normalizePhoneNumber(guestPhone.trim());
        console.log('Normalized input phone:', normalizedInputPhone);
        
        const { data: allGuests, error: phoneError } = await supabase
          .from('guests')
          .select('*')
          .not('phone', 'is', null);
          
        if (phoneError) {
          console.error('Phone check error:', phoneError);
        } else if (allGuests) {
          console.log('All guests with phones:', allGuests.length);
          existingGuestCheck = allGuests.find(guest => {
            if (!guest.phone) return false;
            const normalizedGuestPhone = normalizePhoneNumber(guest.phone);
            console.log('Comparing:', normalizedInputPhone, 'vs', normalizedGuestPhone);
            return normalizedInputPhone === normalizedGuestPhone;
          });
          
          if (existingGuestCheck) {
            console.log('Found existing guest by phone:', existingGuestCheck);
          }
        }
      }
      
      // If we found an existing guest, show confirmation and link
      if (existingGuestCheck) {
        setExistingGuest(existingGuestCheck);
        setShowGuestMatch(true);
        
        toast({
          title: "Existing Guest Found!",
          description: `This booking will be linked to ${existingGuestCheck.first_name} ${existingGuestCheck.last_name}`,
        });
        
        console.log('Will link to existing guest:', existingGuestCheck.id);
      } else {
        console.log('No existing guest found - will create new booking');
      }
      
    } catch (error) {
      console.error('Error during guest check:', error);
      toast({
        title: "Warning",
        description: "Could not check for existing guests, but proceeding with booking creation",
        variant: "destructive",
      });
    }

    setIsSubmitting(true);
    
    try {
      console.log('=== CREATING BOOKING ===');
      // Check if we need to link to existing guest
      let guestId = null;
      if (existingGuest) {
        guestId = existingGuest.id;
        console.log('Linking to existing guest ID:', guestId);
      } else {
        console.log('No existing guest to link to');
      }

      const bookingData = {
        booking_id: generateBookingId(),
        room_unit_id: roomUnitId,
        package_id: (selectedPackage && selectedPackage !== 'no-package') ? selectedPackage : null,
        guest_id: guestId,
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
        check_in: format(checkInDate, 'yyyy-MM-dd'),
        check_out: format(checkOutDate, 'yyyy-MM-dd'),
        guests_count: guestsCount,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        selected_meals: selectedMeals,
        selected_activities: selectedActivities,
        selected_spa_services: selectedSpaServices,
      };

      console.log('Booking data to insert:', bookingData);
      
      const { error } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('Booking created successfully');

      toast({
        title: "Booking Created",
        description: `Manual booking ${bookingData.booking_id} created successfully${existingGuest ? ' and linked to existing guest' : ''}`,
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
      setSelectedPackage('no-package');
      setSelectedMeals([]);
      setSelectedActivities([]);
      setSelectedSpaServices([]);
      setExistingGuest(null);
      setShowGuestMatch(false);
      
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
                    onBlur={async (e) => {
                      console.log('Email field blurred with value:', e.target.value);
                      // Check for existing guest when user leaves the email field
                      if (e.target.value.trim()) {
                        await checkForExistingGuest(e.target.value.trim());
                      }
                    }}
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
                    onBlur={async (e) => {
                      console.log('Phone field blurred with value:', e.target.value);
                      // Check for existing guest when user leaves the phone field
                      if (e.target.value.trim()) {
                        await checkForExistingGuest(undefined, e.target.value.trim());
                      }
                    }}
                    placeholder="+91 98765 43210"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Existing Guest Match Alert */}
            {showGuestMatch && existingGuest && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Existing Guest Found</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Found existing guest: <strong>{existingGuest.first_name} {existingGuest.last_name}</strong>
                    </p>
                    {existingGuest.email && (
                      <p className="text-xs text-blue-600">📧 {existingGuest.email}</p>
                    )}
                    {existingGuest.phone && (
                      <p className="text-xs text-blue-600">📞 {existingGuest.phone}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-2">
                      This booking will be automatically linked to the existing guest profile.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGuestMatch(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}

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
                <Label htmlFor="packageSelect">Package (Optional)</Label>
                <Select value={selectedPackage} onValueChange={handlePackageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-package">No Package</SelectItem>
                    {availablePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.title} - ₹{pkg.weekday_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">

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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Add-on Services</h3>
              {selectedPackage && selectedPackage !== 'no-package' && (
                <Badge variant="secondary" className="text-xs">
                  Auto-populated from package
                </Badge>
              )}
            </div>
            
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