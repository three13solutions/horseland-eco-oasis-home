import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, MapPin, Wifi, Coffee, Car, Utensils, Plus, Minus, Bed, CarFront, Sparkles, Package, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Navigation from '@/components/Navigation';
import DynamicFooter from '@/components/DynamicFooter';
import { PaymentModal } from '@/components/PaymentModal';
import { RateVariantSelector } from '@/components/booking/RateVariantSelector';
import { PriceBreakdown } from '@/components/booking/PriceBreakdown';
import { AvailableRoomCard } from '@/components/booking/AvailableRoomCard';
import { useDynamicPricing } from '@/hooks/useDynamicPricing';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateBookingAmount } from '@/lib/razorpay';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  hero_image?: string;
  gallery: any;
  max_guests: number;
  features: any;
  base_price: number;
  is_published: boolean;
  seasonal_pricing: any;
  availability_calendar: any;
  created_at: string;
  updated_at: string;
}

interface AvailableRoom {
  roomType: RoomType;
  availableCount: number;
}

interface Addon {
  id: string;
  title: string;
  price: number;
  description?: string;
  image?: string;
  duration?: string;
  type: 'meal' | 'activity' | 'spa';
}

interface SelectedAddon extends Addon {
  quantity: number;
}

interface GuestDetails {
  name: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';
  email: string;
  phone: string;
  idType: 'passport' | 'aadhar' | 'driving_license' | 'voter_id' | '';
  idNumber: string;
  specialRequests: string;
}

interface GuestMeal {
  guestNumber: number;
  dietaryPreference: 'vegetarian' | 'non-vegetarian' | 'jain';
  mealTypeQuantities: { [key: string]: number }; // meal type to quantity mapping
}

interface PickupService {
  id: string;
  from: 'mumbai' | 'pune' | 'property';
  to: 'property' | 'mumbai' | 'pune';
  direction: 'pickup' | 'drop' | 'two-way';
  carType: 'sedan' | 'suv' | 'luxury';
  price: number;
  type: 'transport';
}

interface BeddingOption {
  id: string;
  title: string;
  price: number;
  type: 'bedding';
}

const Booking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get search parameters
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = parseInt(searchParams.get('guests') || '2');
  const roomTypeId = searchParams.get('roomTypeId');
  const packageId = searchParams.get('packageId');
  const tabParam = searchParams.get('tab');
  
  // State
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCheckIn, setSearchCheckIn] = useState('');
  const [searchCheckOut, setSearchCheckOut] = useState('');
  const [searchGuests, setSearchGuests] = useState(guests.toString());
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [heroImage, setHeroImage] = useState<string>('');
  
  // Addon states
  const [meals, setMeals] = useState<Addon[]>([]);
  const [activities, setActivities] = useState<Addon[]>([]);
  const [selectedMealPlan, setSelectedMealPlan] = useState<'none' | 'half-board' | 'full-board'>('none');
  const [spaServices, setSpaServices] = useState<Addon[]>([]);
  const [showSpaInBooking, setShowSpaInBooking] = useState(false);
  const [showActivitiesInBooking, setShowActivitiesInBooking] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: '',
    gender: '',
    email: '',
    phone: '',
    idType: '',
    idNumber: '',
    specialRequests: ''
  });
  const [selectedPickup, setSelectedPickup] = useState<PickupService | null>(null);
  const [selectedBedding, setSelectedBedding] = useState<BeddingOption[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');
  const [guestMeals, setGuestMeals] = useState<GuestMeal[]>([]);
  const [pickupServices, setPickupServices] = useState<PickupService[]>([]);
  
  // Pickup/Drop dropdown states
  const [transferType, setTransferType] = useState<'pickup' | 'drop' | 'two-way' | ''>('');
  const [transferLocation, setTransferLocation] = useState<'mumbai' | 'pune' | ''>('');
  const [transferCarType, setTransferCarType] = useState<'sedan' | 'suv' | 'luxury' | ''>('');
  
  // Additional services common to all guests
  const [serviceInRoomQuantity, setServiceInRoomQuantity] = useState(0);
  const [candleLightDinnerQuantity, setCandleLightDinnerQuantity] = useState(0);
  
  // Dynamic pricing state
  const [selectedRateVariant, setSelectedRateVariant] = useState<any>(null);
  
  // Fetch rate variants when room is selected (temporarily disabled)
  const { data: rateVariants = [], isLoading: variantsLoading } = useDynamicPricing({
    roomTypeId: selectedRoomType?.id,
    checkIn: checkIn ? new Date(checkIn) : undefined,
    checkOut: checkOut ? new Date(checkOut) : undefined,
    guestsCount: guests,
    enabled: false // Disabled until database function is set up
  });

  // Load package if packageId is present
  useEffect(() => {
    if (packageId) {
      loadPackageDetails(packageId);
    }
  }, [packageId]);

  const loadPackageDetails = async (pkgId: string) => {
    setPackageLoading(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', pkgId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      setSelectedPackage(data);
      
      // Clear dates and rooms to start fresh
      setSearchCheckIn('');
      setSearchCheckOut('');
      setSelectedRoomType(null);
      setShowBookingForm(false);
      
      toast({
        title: "Package Selected",
        description: `${data.title} - Please select your check-in and check-out dates to continue.`,
      });
    } catch (error) {
      console.error('Error loading package:', error);
      toast({
        title: "Error",
        description: "Failed to load package details",
        variant: "destructive",
      });
    } finally {
      setPackageLoading(false);
    }
  };

  // Initialize guest meals when guests count changes
  useEffect(() => {
    if (guests > 0 && guestMeals.length !== guests) {
      const newGuestMeals: GuestMeal[] = Array.from({ length: guests }, (_, i) => ({
        guestNumber: i + 1,
        dietaryPreference: 'vegetarian',
        mealTypeQuantities: {}
      }));
      setGuestMeals(newGuestMeals);
    }
  }, [guests]);

  // Load available rooms and addons
  useEffect(() => {
    if (checkIn && checkOut) {
      loadAvailableRooms();
    } else {
      setLoading(false);
    }
    loadAddons();
    loadHeroImage();
  }, [checkIn, checkOut, guests, roomTypeId]);

  // Load booking state from localStorage on mount
  useEffect(() => {
    const loadBookingData = () => {
      const savedBooking = localStorage.getItem('currentBooking');
      if (savedBooking) {
        try {
          const booking = JSON.parse(savedBooking);
          
          // Restore dates if not in URL
          if (!checkIn && booking.checkIn) {
            setSearchCheckIn(booking.checkIn);
            searchParams.set('checkIn', booking.checkIn);
          }
          if (!checkOut && booking.checkOut) {
            setSearchCheckOut(booking.checkOut);
            searchParams.set('checkOut', booking.checkOut);
          }
          if (!guests && booking.guests) {
            setSearchGuests(booking.guests.toString());
            searchParams.set('guests', booking.guests.toString());
          }
          
          // Restore selected room
          if (booking.selectedRoom) {
            setSelectedRoomType(booking.selectedRoom);
            setShowBookingForm(true);
          }
          
          // Combine all addons from different sources
          let allAddons: SelectedAddon[] = [];
          
          // Add regular addons
          if (booking.selectedAddons && booking.selectedAddons.length > 0) {
            allAddons = [...booking.selectedAddons];
          }
          
          // Add spa services if they exist
          if (booking.selectedSpaServices && booking.selectedSpaServices.length > 0) {
            const spaAddons = booking.selectedSpaServices.map((spa: any) => ({
              id: spa.id,
              title: spa.title,
              price: spa.price,
              duration: spa.duration,
              quantity: spa.quantity || 1,
              type: 'spa' as const
            }));
            allAddons = [...allAddons.filter(a => a.type !== 'spa'), ...spaAddons];
          }
          
          // Add activities if they exist
          if (booking.selectedActivities && booking.selectedActivities.length > 0) {
            const activityAddons = booking.selectedActivities.map((act: any) => ({
              id: act.id,
              title: act.title,
              price: act.price,
              quantity: act.quantity || 1,
              type: 'activity' as const
            }));
            allAddons = [...allAddons.filter(a => a.type !== 'activity'), ...activityAddons];
          }
          
          setSelectedAddons(allAddons);
          
          // Restore pickup/bedding
          if (booking.selectedPickup) {
            setSelectedPickup(booking.selectedPickup);
          }
          if (booking.selectedBedding) {
            setSelectedBedding(booking.selectedBedding);
          }
          
          // Update URL if dates were restored
          if ((!checkIn && booking.checkIn) || (!checkOut && booking.checkOut)) {
            setSearchParams(searchParams);
          }
        } catch (error) {
          console.error('Error loading saved booking:', error);
        }
      }
    };

    // Load on mount
    loadBookingData();

    // Listen for custom booking update event
    const handleBookingUpdate = () => {
      console.log('Booking updated event received');
      loadBookingData();
    };

    window.addEventListener('bookingUpdated', handleBookingUpdate);

    // Listen for visibility changes (when user returns to this tab/page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadBookingData();
      }
    };

    // Listen for window focus (when user returns to this window)
    const handleFocus = () => {
      loadBookingData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkIn, checkOut, guests]);

  // Save booking state to localStorage whenever it changes
  useEffect(() => {
    if (checkIn || checkOut || selectedRoomType || selectedAddons.length > 0) {
      const bookingData = {
        checkIn: checkIn || searchCheckIn,
        checkOut: checkOut || searchCheckOut,
        guests: guests || parseInt(searchGuests),
        selectedRoom: selectedRoomType,
        roomType: selectedRoomType,
        selectedAddons: selectedAddons.filter(a => a.type !== 'spa' && a.type !== 'activity'),
        selectedSpaServices: selectedAddons.filter(a => a.type === 'spa'),
        selectedActivities: selectedAddons.filter(a => a.type === 'activity'),
        selectedPickup,
        selectedBedding,
        guestDetails: guestDetails.name ? guestDetails : null,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('currentBooking', JSON.stringify(bookingData));
    }
  }, [checkIn, checkOut, guests, searchCheckIn, searchCheckOut, searchGuests, selectedRoomType, selectedAddons, selectedPickup, selectedBedding, guestDetails]);

  const loadHeroImage = async () => {
    try {
      const { data } = await supabase
        .from('pages')
        .select('hero_image')
        .eq('slug', 'booking')
        .eq('is_published', true)
        .maybeSingle();
      
      if (data?.hero_image) {
        setHeroImage(data.hero_image);
      }
    } catch (error) {
      console.error('Error loading hero image:', error);
    }
  };

  const loadAvailableRooms = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('room_types')
        .select('*')
        .eq('is_published', true)
        .gte('max_guests', guests)
        .order('base_price');

      if (roomTypeId) {
        query = query.eq('id', roomTypeId);
      }

      const { data: roomTypes, error: roomTypesError } = await query;

      if (roomTypesError) {
        console.error('Error loading room types:', roomTypesError);
        toast({
          title: "Error",
          description: "Failed to load room types",
          variant: "destructive",
        });
        return;
      }

      const availableRoomsData: AvailableRoom[] = [];

      for (const roomType of roomTypes || []) {
        const { data: availabilityData, error: availabilityError } = await supabase
          .rpc('check_room_availability', {
            p_room_type_id: roomType.id,
            p_check_in: checkIn,
            p_check_out: checkOut
          });

        if (availabilityError) {
          console.error('Error checking availability:', availabilityError);
          continue;
        }

        if (availabilityData && availabilityData.length > 0) {
          const availableCount = availabilityData[0].available_units;

          if (availableCount > 0) {
            availableRoomsData.push({
              roomType,
              availableCount
            });
          }
        }
      }

      setAvailableRooms(availableRoomsData);
      
      // Auto-select room if roomTypeId is in URL and room is available
      if (roomTypeId && availableRoomsData.length > 0 && !selectedRoomType) {
        const roomToSelect = availableRoomsData.find(r => r.roomType.id === roomTypeId);
        if (roomToSelect) {
          setSelectedRoomType(roomToSelect.roomType);
          setShowBookingForm(true);
        }
      }
    } catch (error) {
      console.error('Error loading available rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load available rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAddons = async () => {
    try {
      // Load meals
      const { data: mealsData } = await supabase
        .from('meals')
        .select('*')
        .eq('is_active', true)
        .order('title');

      // Load settings for spa and activities visibility
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .in('setting_key', ['show_spa_in_booking', 'show_activities_in_booking']);
      
      const showSpa = settingsData?.find(s => s.setting_key === 'show_spa_in_booking')?.setting_value === 'true';
      const showActivities = settingsData?.find(s => s.setting_key === 'show_activities_in_booking')?.setting_value === 'true';
      
      setShowSpaInBooking(showSpa);
      setShowActivitiesInBooking(showActivities);

      // Load activities if enabled
      const { data: activitiesData } = showActivities ? await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('title') : { data: null };

      // Load spa services if enabled
      const { data: spaData } = showSpa ? await supabase
        .from('spa_services')
        .select('*')
        .eq('is_active', true)
        .order('title') : { data: null };

      // Load transport/pickup addons
      const { data: transportData } = await supabase
        .from('addons')
        .select('*')
        .eq('category', 'transport')
        .eq('is_active', true)
        .order('name');

      setMeals(mealsData?.map(m => ({ 
        id: m.id,
        title: m.title,
        price: m.price,
        description: m.description,
        image: m.featured_media,
        type: 'meal' as const,
        meal_type: m.meal_type,
        variant: m.variant
      } as any)) || []);
      
      setActivities(activitiesData?.map(a => ({ 
        id: a.id,
        title: a.title,
        price: a.price_amount || 0,
        description: a.description,
        image: a.image,
        category: (Array.isArray(a.activity_tags) && a.activity_tags.length > 0) ? a.activity_tags[0] : 'other',
        type: 'activity' as const 
      })) || []);
      
      setSpaServices(spaData?.map(s => ({ 
        id: s.id,
        title: s.title,
        price: s.price,
        description: s.description,
        image: s.image,
        category: s.category,
        type: 'spa' as const 
      })) || []);

      // Map transport addons to pickup services format
      if (transportData && transportData.length > 0) {
        const services: PickupService[] = transportData.map(t => {
          // Parse the name to extract direction, location, and car type
          // Expected format: "Pickup - Mumbai - Sedan", "Drop - Pune - SUV", "Two Way - Mumbai - Sedan"
          const nameParts = t.name.split(' - ').map(p => p.trim().toLowerCase());
          
          let direction: 'pickup' | 'drop' | 'two-way' = 'pickup';
          let location: 'mumbai' | 'pune' = 'mumbai';
          let carType: 'sedan' | 'suv' | 'luxury' = 'sedan';
          
          if (nameParts[0].includes('pickup')) direction = 'pickup';
          else if (nameParts[0].includes('drop')) direction = 'drop';
          else if (nameParts[0].includes('two way') || nameParts[0].includes('twoway')) direction = 'two-way';
          
          if (nameParts[1]?.includes('mumbai')) location = 'mumbai';
          else if (nameParts[1]?.includes('pune')) location = 'pune';
          
          if (nameParts[2]?.includes('sedan')) carType = 'sedan';
          else if (nameParts[2]?.includes('suv')) carType = 'suv';
          else if (nameParts[2]?.includes('luxury')) carType = 'luxury';
          
          return {
            id: t.id,
            from: direction === 'drop' ? 'property' : location,
            to: direction === 'drop' ? location : 'property',
            direction,
            carType,
            price: Number(t.price) || 0,
            type: 'transport'
          };
        });
        
        setPickupServices(services);
      } else {
        // Fallback to hardcoded services if no data in database
        setPickupServices(getDefaultPickupServices());
      }
    } catch (error) {
      console.error('Error loading addons:', error);
      // Set fallback services on error
      setPickupServices(getDefaultPickupServices());
    }
  };

  const handleSearch = () => {
    if (!searchCheckIn || !searchCheckOut) {
      toast({
        title: "Missing Information",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    // Check if dates have changed
    const datesChanged = searchCheckIn !== checkIn || searchCheckOut !== checkOut;
    
    if (datesChanged) {
      // Clear room and addon selections when dates change
      setSelectedRoomType(null);
      setSelectedAddons([]);
      setSelectedPickup(null);
      setSelectedBedding([]);
      setShowBookingForm(false);
      
      // Clear localStorage booking data
      localStorage.removeItem('currentBooking');
      
      toast({
        title: "Dates Updated",
        description: "Please select your room again for the new dates",
      });
    }

    const newSearchParams = new URLSearchParams();
    newSearchParams.set('checkIn', searchCheckIn);
    newSearchParams.set('checkOut', searchCheckOut);
    newSearchParams.set('guests', searchGuests);
    
    navigate(`/booking?${newSearchParams.toString()}`);
  };

  const handleSelectRoom = (roomType: RoomType, variant?: any) => {
    setSelectedRoomType(roomType);
    if (variant) {
      setSelectedRateVariant(variant);
    }
    setShowBookingForm(true);
  };

  const handleClearBooking = () => {
    if (confirm('Are you sure you want to clear your booking? All selections will be lost.')) {
      // Clear all selections
      setSelectedRoomType(null);
      setSelectedAddons([]);
      setSelectedPickup(null);
      setSelectedBedding([]);
      setShowBookingForm(false);
      setShowGuestDetails(false);
      setGuestDetails({
        name: '',
        gender: '',
        email: '',
        phone: '',
        idType: '',
        idNumber: '',
        specialRequests: ''
      });
      
      // Clear localStorage
      localStorage.removeItem('currentBooking');
      
      // Show success message
      toast({
        title: "Booking Cleared",
        description: "Your booking has been cleared. You can start a new booking.",
      });
    }
  };

  const addAddon = (addon: Addon) => {
    // Validate that dates and room are selected
    if (!checkIn || !checkOut) {
      toast({
        title: "Missing Information",
        description: "Please select check-in and check-out dates first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRoomType) {
      toast({
        title: "Missing Information",
        description: "Please select a room first",
        variant: "destructive",
      });
      return;
    }

    const existingAddon = selectedAddons.find(a => a.id === addon.id);
    if (existingAddon) {
      setSelectedAddons(prev => 
        prev.map(a => a.id === addon.id ? { ...a, quantity: a.quantity + 1 } : a)
      );
    } else {
      setSelectedAddons(prev => [...prev, { ...addon, quantity: 1 }]);
    }
  };

  const removeAddon = (addonId: string) => {
    setSelectedAddons(prev => {
      const addon = prev.find(a => a.id === addonId);
      if (addon && addon.quantity > 1) {
        return prev.map(a => a.id === addonId ? { ...a, quantity: a.quantity - 1 } : a);
      } else {
        return prev.filter(a => a.id !== addonId);
      }
    });
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // Validate that dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid dates:', { checkIn, checkOut });
      return 0;
    }
    
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, nights); // Ensure non-negative
  };

  const calculateTotal = () => {
    if (!selectedRoomType) return 0;
    const nights = calculateNights();
    
    // Use variant pricing if selected, otherwise fall back to base price
    const roomTotal = selectedRateVariant 
      ? selectedRateVariant.total_price 
      : selectedRoomType.base_price * nights;
    
    const addonsTotal = selectedAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0);
    const pickupTotal = selectedPickup ? selectedPickup.price : 0;
    const beddingTotal = selectedBedding.reduce((total, bed) => total + bed.price, 0);
    
    // Only add meal plan total if no rate variant is selected (variants include meals)
    const mealsTotal = selectedRateVariant ? 0 : calculateMealPlanTotal();
    
    return roomTotal + addonsTotal + pickupTotal + beddingTotal + mealsTotal;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('wifi')) return <Wifi className="h-4 w-4" />;
    if (lowerFeature.includes('coffee') || lowerFeature.includes('tea')) return <Coffee className="h-4 w-4" />;
    if (lowerFeature.includes('parking')) return <Car className="h-4 w-4" />;
    if (lowerFeature.includes('dining') || lowerFeature.includes('kitchen')) return <Utensils className="h-4 w-4" />;
    return <MapPin className="h-4 w-4" />;
  };

  const getFilteredMeals = () => {
    // Return all meals since dietary preference is no longer collected in guest details
    return meals;
  };

  const getFilteredMealsByPreference = (preference: 'vegetarian' | 'non-vegetarian' | 'jain') => {
    return meals.filter(meal => {
      const mealTitle = meal.title.toLowerCase();
      const mealDesc = meal.description?.toLowerCase() || '';
      
      switch (preference) {
        case 'vegetarian':
          return mealTitle.includes('veg') || mealDesc.includes('vegetarian');
        case 'non-vegetarian':
          return mealTitle.includes('non-veg') || mealTitle.includes('chicken') || 
                 mealTitle.includes('mutton') || mealTitle.includes('fish') || 
                 mealDesc.includes('non-vegetarian');
        case 'jain':
          return mealTitle.includes('jain') || mealDesc.includes('jain');
        default:
          return true;
      }
    });
  };

  // Helper function to map dietary preference to database variant
  const mapDietaryPreferenceToVariant = (preference: 'vegetarian' | 'non-vegetarian' | 'jain'): string => {
    const mapping: Record<string, string> = {
      'vegetarian': 'veg',
      'non-vegetarian': 'non_veg',
      'jain': 'jain'
    };
    return mapping[preference] || preference;
  };

  // Helper function to get meal price from database
  const getMealPrice = (mealType: string, variant: 'vegetarian' | 'non-vegetarian' | 'jain'): number => {
    // Default to vegetarian pricing
    const dbVariant = mapDietaryPreferenceToVariant(variant);
    const meal = meals.find(m => {
      const mealData = m as any;
      return mealData.meal_type === mealType && mealData.variant === dbVariant;
    });
    return meal?.price || 0;
  };

  // Helper function to get meal type from arrangement key
  const getMealTypeFromArrangement = (arrangement: string): string | null => {
    if (arrangement.includes('Breakfast')) return 'breakfast';
    if (arrangement.includes('Lunch')) return 'lunch';
    if (arrangement.includes('HighTea')) return 'high_tea';
    if (arrangement.includes('Dinner')) return 'dinner';
    return null;
  };

  // Helper function to calculate total meals for a specific meal type
  const getTotalMealsForType = (guest: GuestMeal, mealType: string): number => {
    let total = guest.mealTypeQuantities[mealType] || 0;
    // Meal service to the room and candle light dinner are separate services, not counted per meal type
    return total;
  };

  const handleMealQuantityChange = (guestIndex: number, mealType: string, change: number) => {
    const nights = calculateNights();
    
    setGuestMeals(prev => {
      const updated = [...prev];
      const guest = updated[guestIndex];
      const currentQty = guest.mealTypeQuantities[mealType] || 0;
      const newQty = currentQty + change;
      
      // Calculate total for this meal type (buffet + special arrangements)
      const currentTotal = getTotalMealsForType(guest, mealType);
      const newTotal = currentTotal + change;
      
      // Check if total for this meal type would exceed max nights
      if (newTotal > nights) {
        toast({
          title: "Meal Type Limit Reached",
          description: `Total meals for this type cannot exceed ${nights} days. You've already selected ${currentTotal} meal(s) for this type.`,
          variant: "destructive"
        });
        return prev;
      }
      
      if (newQty === 0) {
        delete guest.mealTypeQuantities[mealType];
      } else {
        guest.mealTypeQuantities[mealType] = Math.max(0, newQty);
      }
      
      return updated;
    });
  };

  // Helper to calculate total meals selected across all guests
  const getTotalMealsAcrossAllGuests = () => {
    return guestMeals.reduce((total, guest) => {
      return total + Object.values(guest.mealTypeQuantities).reduce((sum, qty) => sum + qty, 0);
    }, 0);
  };

  const handleServiceInRoomChange = (change: number) => {
    const totalMeals = getTotalMealsAcrossAllGuests();
    const newQty = serviceInRoomQuantity + change;
    
    // Check if total would exceed total meals selected
    if (newQty > totalMeals) {
      toast({
        title: "Limit Reached",
        description: `Meal Service to the Room cannot exceed ${totalMeals} total meals selected`,
        variant: "destructive"
      });
      return;
    }
    
    setServiceInRoomQuantity(Math.max(0, newQty));
  };

  const handleCandleLightDinnerChange = (change: number) => {
    const nights = calculateNights();
    const newQty = candleLightDinnerQuantity + change;
    
    // Check if total would exceed max nights
    if (newQty > nights) {
      toast({
        title: "Limit Reached",
        description: `Candle light dinner cannot exceed ${nights} nights`,
        variant: "destructive"
      });
      return;
    }
    
    setCandleLightDinnerQuantity(Math.max(0, newQty));
  };

  const handleGuestDietaryChange = (guestIndex: number, preference: 'vegetarian' | 'non-vegetarian' | 'jain') => {
    setGuestMeals(prev => {
      const updated = [...prev];
      updated[guestIndex].dietaryPreference = preference;
      return updated;
    });
  };

  const handleMealPlanSelect = (guestIndex: number, plan: 'none' | 'breakfast-only' | 'all-meals') => {
    const nights = calculateNights();
    
    setGuestMeals(prev => {
      const updated = [...prev];
      const guest = updated[guestIndex];
      
      if (plan === 'none') {
        // Clear all meal selections
        guest.mealTypeQuantities = {};
      } else if (plan === 'breakfast-only') {
        // Set only breakfast to max nights
        guest.mealTypeQuantities = {
          breakfast: nights
        };
      } else if (plan === 'all-meals') {
        // Set all meals to max nights
        guest.mealTypeQuantities = {
          breakfast: nights,
          lunch: nights,
          high_tea: nights,
          dinner: nights
        };
      }
      
      return updated;
    });
    
    toast({
      title: "Meal Plan Applied",
      description: plan === 'none' ? "Meal selections cleared" : 
                   plan === 'breakfast-only' ? `Breakfast selected for all ${nights} days` :
                   `All meals selected for all ${nights} days`,
    });
  };

  const handleAddonChange = (addonId: string, newQuantity: number) => {
    setSelectedAddons(prev => {
      const existing = prev.find(a => a.id === addonId);
      
      if (newQuantity <= 0) {
        // Remove the addon
        return prev.filter(a => a.id !== addonId);
      }
      
      if (existing) {
        // Update quantity
        return prev.map(a => a.id === addonId ? { ...a, quantity: newQuantity } : a);
      } else {
        // Add new addon
        const addon = [...spaServices, ...activities].find(a => a.id === addonId);
        if (addon) {
          return [...prev, { ...addon, quantity: newQuantity }];
        }
        return prev;
      }
    });
  };

  const calculateMealPlanTotal = () => {
    if (selectedMealPlan === 'none') return 0;
    
    const nights = calculateNights();
    // Default to vegetarian pricing for meal plan calculation
    const breakfastPrice = getMealPrice('breakfast', 'vegetarian') || 0;
    const lunchPrice = getMealPrice('lunch', 'vegetarian') || 0;
    const highTeaPrice = getMealPrice('high_tea', 'vegetarian') || 0;
    const dinnerPrice = getMealPrice('dinner', 'vegetarian') || 0;
    
    if (selectedMealPlan === 'half-board') {
      return (breakfastPrice + dinnerPrice) * guests * nights;
    }
    
    if (selectedMealPlan === 'full-board') {
      return (breakfastPrice + lunchPrice + highTeaPrice + dinnerPrice) * guests * nights;
    }
    
    return 0;
  };

  // Default/fallback pickup services
  const getDefaultPickupServices = (): PickupService[] => [
    // Pickup only
    { id: 'pickup-mumbai-sedan', from: 'mumbai', to: 'property', direction: 'pickup', carType: 'sedan', price: 4000, type: 'transport' },
    { id: 'pickup-mumbai-suv', from: 'mumbai', to: 'property', direction: 'pickup', carType: 'suv', price: 5000, type: 'transport' },
    { id: 'pickup-pune-sedan', from: 'pune', to: 'property', direction: 'pickup', carType: 'sedan', price: 2500, type: 'transport' },
    { id: 'pickup-pune-suv', from: 'pune', to: 'property', direction: 'pickup', carType: 'suv', price: 3000, type: 'transport' },
    
    // Drop only
    { id: 'drop-mumbai-sedan', from: 'property', to: 'mumbai', direction: 'drop', carType: 'sedan', price: 4000, type: 'transport' },
    { id: 'drop-mumbai-suv', from: 'property', to: 'mumbai', direction: 'drop', carType: 'suv', price: 5000, type: 'transport' },
    { id: 'drop-pune-sedan', from: 'property', to: 'pune', direction: 'drop', carType: 'sedan', price: 2500, type: 'transport' },
    { id: 'drop-pune-suv', from: 'property', to: 'pune', direction: 'drop', carType: 'suv', price: 3000, type: 'transport' },
    
    // Two-way
    { id: 'twoway-mumbai-sedan', from: 'mumbai', to: 'mumbai', direction: 'two-way', carType: 'sedan', price: 7500, type: 'transport' },
    { id: 'twoway-mumbai-suv', from: 'mumbai', to: 'mumbai', direction: 'two-way', carType: 'suv', price: 9500, type: 'transport' },
    { id: 'twoway-pune-sedan', from: 'pune', to: 'pune', direction: 'two-way', carType: 'sedan', price: 4500, type: 'transport' },
    { id: 'twoway-pune-suv', from: 'pune', to: 'pune', direction: 'two-way', carType: 'suv', price: 5500, type: 'transport' }
  ];

  // Find matching pickup service based on dropdown selections
  const getMatchingPickupService = () => {
    if (!transferType || !transferLocation || !transferCarType) return null;
    
    return pickupServices.find(service => 
      service.direction === transferType &&
      (transferType === 'drop' ? service.to === transferLocation : service.from === transferLocation) &&
      service.carType === transferCarType
    );
  };

  // Update selected pickup when dropdowns change
  useEffect(() => {
    const matchingService = getMatchingPickupService();
    if (matchingService) {
      setSelectedPickup(matchingService);
    } else {
      setSelectedPickup(null);
    }
  }, [transferType, transferLocation, transferCarType]);

  const beddingOptions: BeddingOption[] = [
    { id: 'extra-bed-1', title: 'Extra Bed', price: 500, type: 'bedding' },
    { id: 'extra-mattress-1', title: 'Extra Mattress', price: 300, type: 'bedding' },
    { id: 'baby-crib-1', title: 'Baby Crib', price: 200, type: 'bedding' }
  ];

  // Group services by category
  const spaServicesByCategory = React.useMemo(() => {
    const categories = {
      massage: { label: 'Massage', services: [] as Addon[] },
      therapy: { label: 'Therapy', services: [] as Addon[] },
      facials: { label: 'Facials', services: [] as Addon[] },
      workouts: { label: 'Workouts', services: [] as Addon[] }
    };
    
    spaServices.forEach(service => {
      const category = (service as any).category || 'massage';
      if (categories[category as keyof typeof categories]) {
        categories[category as keyof typeof categories].services.push(service);
      }
    });
    
    return Object.entries(categories).filter(([_, data]) => data.services.length > 0);
  }, [spaServices]);

  // Group activities by category
  const activitiesByCategory = React.useMemo(() => {
    const categoryMap: Record<string, { label: string; activities: Addon[] }> = {};
    
    activities.forEach(activity => {
      const category = (activity as any).category || 'other';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          label: category.charAt(0).toUpperCase() + category.slice(1),
          activities: []
        };
      }
      categoryMap[category].activities.push(activity);
    });
    
    return Object.entries(categoryMap).filter(([_, data]) => data.activities.length > 0);
  }, [activities]);

  const needsExtraBedding = selectedRoomType && guests > selectedRoomType.max_guests;

  // Set active tab from URL parameter or default
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (!activeTab) {
      setActiveTab(needsExtraBedding ? "bedding" : "pickup");
    }
  }, [tabParam, needsExtraBedding]);

  useEffect(() => {
    if (needsExtraBedding && !activeTab) {
      setActiveTab("bedding");
    }
  }, [needsExtraBedding]);

  const handleProceedToPayment = () => {
    console.log('Proceed to Payment clicked', { 
      selectedRoomType: selectedRoomType?.name, 
      showPaymentModal,
      hasGuestName: !!guestDetails.name,
      hasGuestEmail: !!guestDetails.email,
      hasGuestPhone: !!guestDetails.phone
    });
    
    if (!selectedRoomType) {
      toast({
        title: "Room Not Selected",
        description: "Please select a room to continue with payment",
        variant: "destructive",
      });
      return;
    }
    
    // Validate required guest details
    const missingFields = [];
    if (!guestDetails.name?.trim()) missingFields.push("Full Name");
    if (!guestDetails.email?.trim()) missingFields.push("Email");
    if (!guestDetails.phone?.trim()) missingFields.push("Phone Number");
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Information",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
        duration: 5000,
      });
      
      // Scroll to guest details section
      const guestDetailsElement = document.querySelector('[data-guest-details]');
      if (guestDetailsElement) {
        guestDetailsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    console.log('All validations passed, opening payment modal...');
    console.log('Payment details:', {
      roomName: selectedRoomType?.name,
      roomPrice: selectedRoomType?.base_price,
      nights,
      guestName: guestDetails.name,
      guestEmail: guestDetails.email,
      guestPhone: guestDetails.phone
    });
    setShowPaymentModal(true);
    console.log('setShowPaymentModal(true) called');
  };

  const handlePaymentSuccess = async (paymentId: string, orderId: string) => {
    try {
      // Split name into first and last name
      const nameParts = guestDetails.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // First, create or find the guest
      let guestId: string | null = null;
      
      // Try to find existing guest by email or phone
      const { data: existingGuests } = await supabase
        .from('guests')
        .select('id')
        .or(`email.eq.${guestDetails.email},phone.eq.${guestDetails.phone}`)
        .limit(1);

      if (existingGuests && existingGuests.length > 0) {
        guestId = existingGuests[0].id;
        
        // Update existing guest with new information
        await supabase
          .from('guests')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: guestDetails.email,
            phone: guestDetails.phone,
            gender: guestDetails.gender || null,
          })
          .eq('id', guestId);
      } else {
        // Create new guest
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            email: guestDetails.email,
            phone: guestDetails.phone,
            gender: guestDetails.gender || null,
          }])
          .select()
          .single();

        if (guestError) {
          console.error('Error creating guest:', guestError);
          throw guestError;
        }
        
        guestId = newGuest.id;
      }

      // If ID details are provided, save identity document
      if (guestId && guestDetails.idType && guestDetails.idNumber) {
        await supabase
          .from('guest_identity_documents')
          .insert([{
            guest_id: guestId,
            document_type: guestDetails.idType,
            document_number: guestDetails.idNumber,
            is_verified: false
          }]);
      }

      // Save booking to database with meal plan information
      const bookingData = {
        booking_id: `BOOK_${Date.now()}`,
        guest_id: guestId,
        guest_name: guestDetails.name,
        guest_email: guestDetails.email,
        guest_phone: guestDetails.phone,
        room_type_id: selectedRoomType?.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guests,
        total_amount: calculateTotal(),
        payment_status: 'completed',
        payment_id: paymentId,
        payment_order_id: orderId,
        payment_method: 'razorpay',
        // Store meal plan information
        meal_plan_code: selectedMealPlan === 'none' ? 'room_only' : selectedMealPlan === 'half-board' ? 'half_board' : 'full_board',
        meal_cost: calculateMealPlanTotal(),
        // Store variant data if available
        cancellation_policy_code: selectedRateVariant?.cancellation_policy_code || 'flexible',
        room_cost: selectedRateVariant?.room_rate || (selectedRoomType!.base_price * calculateNights()),
        rate_breakdown: selectedRateVariant ? {
          meal_plan_name: selectedRateVariant.meal_plan_name,
          cancellation_policy_name: selectedRateVariant.cancellation_policy_name,
          included_meals: selectedRateVariant.included_meals,
          policy_adjustment: selectedRateVariant.policy_adjustment,
          total_nights: calculateNights()
        } : {
          meal_plan: selectedMealPlan,
          meal_cost: calculateMealPlanTotal(),
          total_nights: calculateNights()
        },
        selected_meals: [],
        selected_activities: selectedAddons.filter(a => a.type === 'activity').map(a => ({
          id: a.id,
          title: a.title,
          price: a.price,
          quantity: a.quantity
        })),
        selected_spa_services: selectedAddons.filter(a => a.type === 'spa').map(a => ({
          id: a.id,
          title: a.title,
          price: a.price,
          quantity: a.quantity
        })),
        notes: guestDetails.specialRequests
      };

      const { data: bookingResult, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        console.error('Error saving booking:', error);
        toast({
          title: "Booking Error",
          description: "Payment successful but booking couldn't be saved. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Create payment record
      const roomPrice = selectedRateVariant ? selectedRateVariant.price_per_night : (selectedRoomType!.base_price);
      const addonTotal = selectedAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0) + 
                        (selectedPickup ? selectedPickup.price : 0) + 
                        selectedBedding.reduce((total, bed) => total + bed.price, 0);
      
      const paymentBreakdown = calculateBookingAmount(
        roomPrice,
        calculateNights(),
        addonTotal
      );

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingResult.id,
          invoice_id: null,
          amount: paymentBreakdown.totalAmount,
          payment_method: 'razorpay',
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          status: 'completed',
          payment_date: new Date().toISOString(),
          transaction_reference: paymentId
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Continue anyway - booking was successful
      }

      toast({
        title: "Booking Confirmed!",
        description: `Your booking has been confirmed. Payment ID: ${paymentId}`,
      });

      // Clear booking data from localStorage after successful booking
      localStorage.removeItem('currentBooking');

      // Redirect to confirmation page or home
      navigate('/');
    } catch (error) {
      console.error('Error processing booking:', error);
      toast({
        title: "Booking Error",
        description: "An error occurred while processing your booking. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleProceedToGuestDetails = () => {
    // Validate that dates and room are selected
    if (!checkIn || !checkOut) {
      toast({
        title: "Missing Information",
        description: "Please select check-in and check-out dates first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRoomType) {
      toast({
        title: "Missing Information",
        description: "Please select a room first",
        variant: "destructive",
      });
      return;
    }

    setShowGuestDetails(true);
  };

  const nights = calculateNights();

  if (showBookingForm && selectedRoomType) {
    return (
      <div className="min-h-screen bg-background">
          <Navigation />
        
        {/* Banner */}
        <section className="relative h-64 bg-gradient-to-r from-primary to-accent">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-6xl mx-auto px-4 text-white">
              <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Complete Your Booking</h1>
              <p className="text-lg opacity-90">{selectedRoomType.name} • {formatDate(checkIn)} - {formatDate(checkOut)}</p>
            </div>
          </div>
        </section>

        {/* Booking Form */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Room & Addons Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Selected Room */}
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Room</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedRoomType.hero_image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=200&q=80'}
                        alt={selectedRoomType.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedRoomType.name}</h3>
                        <p className="text-sm text-muted-foreground">Up to {selectedRoomType.max_guests} guests</p>
                        {!selectedRateVariant && (
                          <p className="text-sm text-muted-foreground mt-1">Starting from ₹{selectedRoomType.base_price.toLocaleString()}/night</p>
                        )}
                      </div>
                      <Button variant="outline" onClick={() => {
                        setShowBookingForm(false);
                        setSelectedRateVariant(null);
                      }}>
                        Change Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Rate Plan Selection */}
                {rateVariants.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Rate Plan</CardTitle>
                      <p className="text-sm text-muted-foreground">Choose your meal plan and cancellation policy</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {variantsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading rate options...</div>
                      ) : (
                        <>
                          <RateVariantSelector
                            variants={rateVariants}
                            selectedVariant={selectedRateVariant}
                            onSelect={setSelectedRateVariant}
                            nights={calculateNights()}
                          />
                          
                          {selectedRateVariant && (
                            <PriceBreakdown
                              roomRate={selectedRateVariant.room_rate}
                              mealCost={selectedRateVariant.meal_cost}
                              policyAdjustment={selectedRateVariant.policy_adjustment}
                              nights={calculateNights()}
                              guestCount={guests}
                              mealPlanName={selectedRateVariant.meal_plan_name}
                              includedMeals={selectedRateVariant.included_meals || []}
                            />
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!selectedRateVariant && rateVariants.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Please select a rate plan above to continue with your booking
                    </p>
                  </div>
                )}

                {/* Addons Selection - Removed wrapper, sections are now direct and collapsible */}
                
                {/* Select Meal Plans - Direct, No Tab */}
                {(!selectedRateVariant || selectedRateVariant.meal_cost === 0) && (
                  <Collapsible defaultOpen={true}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div className="text-left">
                            <CardTitle>Select Meal Plans</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Select a meal plan that will apply to all guests for the entire stay ({calculateNights()} nights)
                            </p>
                          </div>
                          <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedMealPlan === 'none' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedMealPlan('none')}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                  selectedMealPlan === 'none' ? 'border-primary' : 'border-muted-foreground'
                                }`}>
                                  {selectedMealPlan === 'none' && (
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">No Meals</h4>
                                  <p className="text-sm text-muted-foreground">Room only - no meals included</p>
                                </div>
                              </div>
                            </div>

                            <div 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedMealPlan === 'half-board' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedMealPlan('half-board')}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                  selectedMealPlan === 'half-board' ? 'border-primary' : 'border-muted-foreground'
                                }`}>
                                  {selectedMealPlan === 'half-board' && (
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">Half Board</h4>
                                  <p className="text-sm text-muted-foreground">Breakfast & Dinner included for all guests</p>
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-primary">
                                      {(() => {
                                        const breakfastPrice = getMealPrice('breakfast', 'vegetarian') || 0;
                                        const dinnerPrice = getMealPrice('dinner', 'vegetarian') || 0;
                                        const totalPerNight = (breakfastPrice + dinnerPrice) * guests;
                                        const totalAllNights = totalPerNight * calculateNights();
                                        return `₹${totalAllNights.toLocaleString()} total`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedMealPlan === 'full-board' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedMealPlan('full-board')}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                                  selectedMealPlan === 'full-board' ? 'border-primary' : 'border-muted-foreground'
                                }`}>
                                  {selectedMealPlan === 'full-board' && (
                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">Full Board</h4>
                                  <p className="text-sm text-muted-foreground">Breakfast, Lunch, Hi Tea & Dinner included for all guests</p>
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium text-primary">
                                      {(() => {
                                        const breakfastPrice = getMealPrice('breakfast', 'vegetarian') || 0;
                                        const lunchPrice = getMealPrice('lunch', 'vegetarian') || 0;
                                        const hiTeaPrice = getMealPrice('hi-tea', 'vegetarian') || 0;
                                        const dinnerPrice = getMealPrice('dinner', 'vegetarian') || 0;
                                        const totalPerNight = (breakfastPrice + lunchPrice + hiTeaPrice + dinnerPrice) * guests;
                                        const totalAllNights = totalPerNight * calculateNights();
                                        return `₹${totalAllNights.toLocaleString()} total`;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {selectedRateVariant && selectedRateVariant.meal_cost > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Your selected rate plan includes: <strong>{selectedRateVariant.meal_plan_name}</strong>
                      {selectedRateVariant.included_meals.length > 0 && (
                        <span className="block mt-1 text-xs">
                          ({selectedRateVariant.included_meals.join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Spa Services - Collapsible */}
                {showSpaInBooking && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-left">Spa Services</CardTitle>
                          <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          {spaServicesByCategory.length > 0 ? (
                            <div className="space-y-6">
                              {spaServicesByCategory.map(([category, data]) => (
                                <div key={category}>
                                  <h3 className="text-lg font-semibold mb-3">{data.label}</h3>
                                  <div className="grid gap-4">
                                    {data.services.map((service) => {
                                      const isSelected = selectedAddons.find(a => a.id === service.id);
                                      const quantity = isSelected?.quantity || 0;
                                      return (
                                        <div key={service.id} className="p-4 border rounded-lg">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                              <h4 className="font-medium">{service.title}</h4>
                                              <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>₹{service.price}</span>
                                                {service.duration && <span>• {service.duration}</span>}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleAddonChange(service.id, Math.max(0, quantity - 1))}
                                                disabled={quantity === 0}
                                              >
                                                <Minus className="h-4 w-4" />
                                              </Button>
                                              <span className="w-8 text-center font-medium">{quantity}</span>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleAddonChange(service.id, quantity + 1)}
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-8 border rounded-lg bg-muted/20">
                              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-muted-foreground">No spa services available at this time</p>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Activities - Collapsible */}
                {showActivitiesInBooking && (
                  <Collapsible defaultOpen={false}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-left">Activities</CardTitle>
                          <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          {activitiesByCategory.length > 0 ? (
                            <div className="space-y-6">
                              {activitiesByCategory.map(([category, data]) => (
                                <div key={category}>
                                  <h3 className="text-lg font-semibold mb-3">{data.label}</h3>
                                  <div className="grid gap-4">
                                    {data.activities.map((activity) => {
                                      const isSelected = selectedAddons.find(a => a.id === activity.id);
                                      const quantity = isSelected?.quantity || 0;
                                      return (
                                        <div key={activity.id} className="p-4 border rounded-lg">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                              <h4 className="font-medium">{activity.title}</h4>
                                              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                {activity.price && activity.price > 0 ? (
                                                  <span>₹{activity.price}</span>
                                                ) : (
                                                  <span>Free</span>
                                                )}
                                                {activity.duration && (
                                                  <span>• {activity.duration}</span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleAddonChange(activity.id, Math.max(0, quantity - 1))}
                                                disabled={quantity === 0}
                                              >
                                                <Minus className="h-4 w-4" />
                                              </Button>
                                              <span className="w-8 text-center font-medium">{quantity}</span>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleAddonChange(activity.id, quantity + 1)}
                                              >
                                                <Plus className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-8 border rounded-lg bg-muted/20">
                              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-muted-foreground">No activities available at this time</p>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Request Transfers - Collapsible */}
                <Collapsible defaultOpen={false}>
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="text-left">
                          <CardTitle>Request Transfers</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Select pickup or drop service for your stay
                          </p>
                        </div>
                        <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* Transfer Type Dropdown */}
                        <div className="space-y-2">
                          <Label htmlFor="transfer-type" className="text-sm font-medium">
                            Transfer Type
                          </Label>
                          <select
                            id="transfer-type"
                            className="w-full p-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            value={transferType}
                            onChange={(e) => setTransferType(e.target.value as any)}
                          >
                            <option value="">Select type</option>
                            <option value="pickup">Pickup Only</option>
                            <option value="drop">Drop Only</option>
                            <option value="two-way">Two-Way (Pickup & Drop)</option>
                          </select>
                        </div>

                        {/* Location Dropdown */}
                        <div className="space-y-2">
                          <Label htmlFor="transfer-location" className="text-sm font-medium">
                            Location
                          </Label>
                          <select
                            id="transfer-location"
                            className="w-full p-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                            value={transferLocation}
                            onChange={(e) => setTransferLocation(e.target.value as any)}
                            disabled={!transferType}
                          >
                            <option value="">Select location</option>
                            <option value="mumbai">Mumbai</option>
                            <option value="pune">Pune</option>
                          </select>
                        </div>

                        {/* Car Type Dropdown */}
                        <div className="space-y-2">
                          <Label htmlFor="car-type" className="text-sm font-medium">
                            Car Type
                          </Label>
                          <select
                            id="car-type"
                            className="w-full p-3 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50"
                            value={transferCarType}
                            onChange={(e) => setTransferCarType(e.target.value as any)}
                            disabled={!transferLocation}
                          >
                            <option value="">Select car type</option>
                            <option value="sedan">Sedan</option>
                            <option value="suv">SUV</option>
                          </select>
                        </div>
                      </div>

                      {/* Selected Service Display */}
                      {selectedPickup && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {transferType === 'pickup' && <CarFront className="h-5 w-5 text-primary" />}
                                  {transferType === 'drop' && <CarFront className="h-5 w-5 text-primary rotate-180" />}
                                  {transferType === 'two-way' && <Car className="h-5 w-5 text-primary" />}
                                  <h4 className="font-semibold text-lg capitalize">
                                    {transferType === 'pickup' && `${transferLocation} → Property`}
                                    {transferType === 'drop' && `Property → ${transferLocation}`}
                                    {transferType === 'two-way' && `${transferLocation} ↔ Property`}
                                  </h4>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p className="capitalize">
                                    <span className="font-medium">Car Type:</span> {transferCarType}
                                  </p>
                                  <p className="capitalize">
                                    <span className="font-medium">Service:</span> {transferType === 'two-way' ? 'Round Trip' : 'One-way'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">
                                  ₹{selectedPickup.price.toLocaleString()}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTransferType('');
                                    setTransferLocation('');
                                    setTransferCarType('');
                                    setSelectedPickup(null);
                                  }}
                                  className="mt-2 text-destructive hover:text-destructive"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {!selectedPickup && transferType && transferLocation && transferCarType && (
                        <div className="text-center p-6 border rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">
                            No service found for this combination. Please try different options or contact us.
                          </p>
                        </div>
                      )}

                      {!transferType && (
                        <div className="text-center p-8 border rounded-lg bg-muted/20">
                          <CarFront className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">
                            Select transfer type, location, and car type to view available services
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
                
                  {/* Guest Details Form - Collapsible */}
                  <Collapsible defaultOpen={true}>
                    <Card data-guest-details>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div className="text-left">
                            <CardTitle>Guest Details</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Provide details of the primary guest making this reservation
                            </p>
                          </div>
                          <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name" className="flex items-center gap-1">
                            Full Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="name"
                            value={guestDetails.name}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                            required
                            className={!guestDetails.name?.trim() ? 'border-destructive/50' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <select
                            id="gender"
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                            value={guestDetails.gender}
                            onChange={(e) => setGuestDetails(prev => ({ 
                              ...prev, 
                              gender: e.target.value as GuestDetails['gender']
                            }))}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="phone" className="flex items-center gap-1">
                            Phone Number <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="phone"
                            value={guestDetails.phone}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Enter phone number"
                            required
                            className={!guestDetails.phone?.trim() ? 'border-destructive/50' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email" className="flex items-center gap-1">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={guestDetails.email}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                            required
                            className={!guestDetails.email?.trim() ? 'border-destructive/50' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="idType">ID Type</Label>
                          <select
                            id="idType"
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                            value={guestDetails.idType}
                            onChange={(e) => setGuestDetails(prev => ({ 
                              ...prev, 
                              idType: e.target.value as GuestDetails['idType']
                            }))}
                          >
                            <option value="">Select ID Type</option>
                            <option value="passport">Passport</option>
                            <option value="aadhar">Aadhar Card</option>
                            <option value="driving_license">Driving License</option>
                            <option value="voter_id">Voter ID</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="idNumber">ID Number</Label>
                          <Input
                            id="idNumber"
                            value={guestDetails.idNumber}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, idNumber: e.target.value }))}
                            placeholder="Enter ID number"
                          />
                        </div>
                      </div>
                    </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
                   
                   {/* Special Requests - Collapsible */}
                   <Collapsible defaultOpen={false}>
                     <Card>
                       <CollapsibleTrigger className="w-full">
                         <CardHeader className="flex flex-row items-center justify-between">
                           <div className="text-left">
                             <CardTitle>Special Requests</CardTitle>
                             <p className="text-sm text-muted-foreground">
                               Share any additional preferences to help us personalize your experience
                             </p>
                           </div>
                           <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                         </CardHeader>
                       </CollapsibleTrigger>
                       <CollapsibleContent>
                      <CardContent>
                        <Label htmlFor="special">Do you have any specific requirements? (Optional)</Label>
                        <textarea
                          id="special"
                          value={guestDetails.specialRequests}
                          onChange={(e) => setGuestDetails(prev => ({ ...prev, specialRequests: e.target.value }))}
                          placeholder="E.g., early check-in, room on ground floor, dietary restrictions, celebration arrangements..."
                          className="w-full mt-2 p-3 border rounded-md min-h-[100px] resize-y"
                        />
                      </CardContent>
                        </CollapsibleContent>
                       </Card>
                     </Collapsible>
              </div>

              {/* Booking Summary */}
              <div className="space-y-6">
                <Card data-booking-summary className="lg:sticky lg:top-4">
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Check-in:</span>
                        <span className="font-medium text-right">{formatDate(checkIn)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Check-out:</span>
                        <span className="font-medium text-right">{formatDate(checkOut)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Guests:</span>
                        <span className="font-medium">{guests}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Nights:</span>
                        <span className="font-medium">{nights}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {selectedRateVariant ? (
                        <>
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">Room ({nights} nights):</span>
                            <span className="font-semibold whitespace-nowrap">₹{selectedRateVariant.room_rate.toLocaleString()}</span>
                          </div>
                          {selectedRateVariant.meal_cost > 0 && (
                            <div className="flex justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">{selectedRateVariant.meal_plan_name}:</span>
                              <span className="font-semibold whitespace-nowrap">₹{selectedRateVariant.meal_cost.toLocaleString()}</span>
                            </div>
                          )}
                          {selectedRateVariant.policy_adjustment !== 0 && (
                            <div className="flex justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">{selectedRateVariant.cancellation_policy_name} Policy:</span>
                              <span className={`font-semibold whitespace-nowrap ${selectedRateVariant.policy_adjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {selectedRateVariant.policy_adjustment > 0 ? '+' : ''}₹{selectedRateVariant.policy_adjustment.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="text-muted-foreground">Room ({nights} nights):</span>
                          <span className="font-semibold whitespace-nowrap">₹{(selectedRoomType.base_price * nights).toLocaleString()}</span>
                        </div>
                      )}
                      
                          {selectedAddons.length > 0 && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium text-sm">Add-ons:</div>
                              {selectedAddons.map((addon) => (
                                <div key={addon.id} className="flex justify-between gap-2 text-sm">
                                  <span className="text-muted-foreground break-words">{addon.title} x{addon.quantity}</span>
                                  <span className="font-medium whitespace-nowrap">₹{(addon.price * addon.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {selectedPickup && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium text-sm">Transport Service:</div>
                              <div className="flex justify-between gap-2 text-sm">
                                <span className="text-muted-foreground break-words flex-1">
                                  {selectedPickup.direction === 'two-way' 
                                    ? `${selectedPickup.from} ↔ Property (${selectedPickup.carType})`
                                    : selectedPickup.direction === 'pickup'
                                    ? `Pickup from ${selectedPickup.from} (${selectedPickup.carType})`
                                    : `Drop to ${selectedPickup.to} (${selectedPickup.carType})`
                                  }
                                </span>
                                <span className="font-medium whitespace-nowrap">₹{selectedPickup.price.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedBedding.length > 0 && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium text-sm">Extra Bedding:</div>
                              {selectedBedding.map((bed) => (
                                <div key={bed.id} className="flex justify-between gap-2 text-sm">
                                  <span className="text-muted-foreground">{bed.title}</span>
                                  <span className="font-medium whitespace-nowrap">₹{bed.price.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {selectedAddons.length > 0 && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium text-sm">Add-ons:</div>
                              {selectedAddons.map((addon) => (
                                <div key={addon.id} className="flex justify-between gap-2 text-sm">
                                  <span className="text-muted-foreground">{addon.title} × {addon.quantity}</span>
                                  <span className="font-medium whitespace-nowrap">₹{(addon.price * addon.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {calculateMealPlanTotal() > 0 && (
                            <div className="space-y-2">
                              <Separator />
                                <div className="flex justify-between gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    {selectedMealPlan === 'half-board' ? 'Half Board (Breakfast & Dinner)' : 'Full Board (All Meals)'}
                                  </span>
                                  <span className="font-medium whitespace-nowrap">₹{calculateMealPlanTotal().toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-muted-foreground pl-4">
                                  {guests} guest(s) × {calculateNights()} night(s)
                                </div>
                            </div>
                          )}
                      
                          {selectedPickup && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="flex justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">Transfer Service:</span>
                                <span className="font-medium whitespace-nowrap">₹{selectedPickup.price.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          
                          <Separator />
                          
                          <div className="flex justify-between font-semibold text-base md:text-lg">
                            <span>Total:</span>
                            <span>₹{calculateTotal().toLocaleString()}</span>
                          </div>

                          <div className="space-y-2 pt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Button 
                                variant="destructive"
                                className="w-full text-xs md:text-sm h-10 md:h-11" 
                                onClick={handleClearBooking}
                              >
                                Clear Booking
                              </Button>
                              <Button 
                                className="w-full text-xs md:text-sm h-10 md:h-11" 
                                onClick={handleProceedToPayment}
                              >
                                Proceed to Payment
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            <DynamicFooter />
          </div>
        );
      }
    
      return (
        <div className="min-h-screen bg-background">
          <Navigation />
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroImage || '/lovable-uploads/6df7505d-8906-4590-b67e-a18c9f9da7f5.png'})`
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
              Find Your Perfect <span className="text-primary">Stay</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              Search and book your ideal mountain retreat
            </p>
          </div>
        </div>
      </section>
      
      {/* Search Bar */}
      <section className="bg-muted/30 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-in</Label>
                  <div className="relative">
                    <Input
                      id="checkIn"
                      type="date"
                      value={searchCheckIn}
                      onChange={(e) => setSearchCheckIn(e.target.value)}
                      className="pl-10"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check-out</Label>
                  <div className="relative">
                    <Input
                      id="checkOut"
                      type="date"
                      value={searchCheckOut}
                      onChange={(e) => setSearchCheckOut(e.target.value)}
                      className="pl-10"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guests">Guests</Label>
                  <div className="relative">
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      max="8"
                      value={searchGuests}
                      onChange={(e) => setSearchGuests(e.target.value)}
                      className="pl-10"
                    />
                    <Users className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button onClick={handleSearch} className="w-full">
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Search Summary */}
      {checkIn && checkOut && (
        <section className="py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(checkIn)} - {formatDate(checkOut)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {nights} night{nights !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {guests} guest{guests !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching for available rooms...</p>
            </div>
          ) : !checkIn || !checkOut ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-heading font-bold mb-4">Find Your Perfect Stay</h2>
              <p className="text-muted-foreground">Please select your check-in and check-out dates to see available rooms.</p>
            </div>
          ) : availableRooms.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-heading font-bold mb-4">No Rooms Available</h2>
              <p className="text-muted-foreground">Sorry, no rooms are available for your selected dates. Please try different dates.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-heading font-bold mb-2">Available Rooms</h2>
                <p className="text-muted-foreground">
                  {availableRooms.length} room type{availableRooms.length !== 1 ? 's' : ''} available for your dates
                </p>
              </div>

              <div className="space-y-6">
                {availableRooms.map(({ roomType, availableCount }) => (
                  <AvailableRoomCard
                    key={roomType.id}
                    roomType={roomType}
                    availableCount={availableCount}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    guests={guests}
                    nights={nights}
                    onSelectRoom={handleSelectRoom}
                    getFeatureIcon={getFeatureIcon}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal && !!selectedRoomType}
        onClose={() => {
          console.log('PaymentModal onClose called');
          setShowPaymentModal(false);
        }}
        onSuccess={handlePaymentSuccess}
        bookingDetails={{
          roomName: selectedRoomType?.name || '',
          roomPrice: selectedRateVariant ? selectedRateVariant.price_per_night : (selectedRoomType?.base_price || 0),
          nights: nights,
          addonTotal: selectedAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0) + 
                     (selectedPickup ? selectedPickup.price : 0) + 
                     selectedBedding.reduce((total, bed) => total + bed.price, 0),
          guestName: guestDetails.name,
          guestEmail: guestDetails.email,
          guestPhone: guestDetails.phone,
          checkIn: formatDate(checkIn),
          checkOut: formatDate(checkOut),
        }}
      />

      <DynamicFooter />
    </div>
  );
};

export default Booking;