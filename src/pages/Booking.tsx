import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, MapPin, Wifi, Coffee, Car, Utensils, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NavigationV5 from '@/components/v5/NavigationV5';
import DynamicFooter from '@/components/DynamicFooter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  type: 'meal' | 'activity' | 'spa';
}

interface SelectedAddon extends Addon {
  quantity: number;
}

interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  dietaryPreference: 'vegetarian' | 'non-vegetarian' | 'jain' | 'no-preference';
  specialRequests: string;
}

interface PickupService {
  id: string;
  from: 'mumbai' | 'pune';
  to: 'property';
  price: number;
  type: 'pickup';
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
  
  // State
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCheckIn, setSearchCheckIn] = useState(checkIn);
  const [searchCheckOut, setSearchCheckOut] = useState(checkOut);
  const [searchGuests, setSearchGuests] = useState(guests.toString());
  
  // Addon states
  const [meals, setMeals] = useState<Addon[]>([]);
  const [activities, setActivities] = useState<Addon[]>([]);
  const [spaServices, setSpaServices] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
    dietaryPreference: 'no-preference',
    specialRequests: ''
  });
  const [selectedPickup, setSelectedPickup] = useState<PickupService | null>(null);

  // Load available rooms and addons
  useEffect(() => {
    if (checkIn && checkOut) {
      loadAvailableRooms();
    } else {
      setLoading(false);
    }
    loadAddons();
  }, [checkIn, checkOut, guests, roomTypeId]);

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

      // Load activities  
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('title');

      // Load spa services
      const { data: spaData } = await supabase
        .from('spa_services')
        .select('*')
        .eq('is_active', true)
        .order('title');

      setMeals(mealsData?.map(m => ({ 
        id: m.id,
        title: m.title,
        price: m.price,
        description: m.description,
        image: m.featured_media,
        type: 'meal' as const 
      })) || []);
      
      setActivities(activitiesData?.map(a => ({ 
        id: a.id,
        title: a.title,
        price: a.price_amount || 0,
        description: a.description,
        image: a.image,
        type: 'activity' as const 
      })) || []);
      
      setSpaServices(spaData?.map(s => ({ 
        id: s.id,
        title: s.title,
        price: s.price,
        description: s.description,
        image: s.image,
        type: 'spa' as const 
      })) || []);
    } catch (error) {
      console.error('Error loading addons:', error);
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

    const newSearchParams = new URLSearchParams();
    newSearchParams.set('checkIn', searchCheckIn);
    newSearchParams.set('checkOut', searchCheckOut);
    newSearchParams.set('guests', searchGuests);
    
    navigate(`/booking?${newSearchParams.toString()}`);
  };

  const handleSelectRoom = (roomType: RoomType) => {
    setSelectedRoomType(roomType);
    setShowBookingForm(true);
  };

  const addAddon = (addon: Addon) => {
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
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    if (!selectedRoomType) return 0;
    const nights = calculateNights();
    const roomTotal = selectedRoomType.base_price * nights;
    const addonsTotal = selectedAddons.reduce((total, addon) => total + (addon.price * addon.quantity), 0);
    const pickupTotal = selectedPickup ? selectedPickup.price : 0;
    return roomTotal + addonsTotal + pickupTotal;
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
    if (guestDetails.dietaryPreference === 'no-preference') return meals;
    
    return meals.filter(meal => {
      const mealTitle = meal.title.toLowerCase();
      const mealDesc = meal.description?.toLowerCase() || '';
      
      switch (guestDetails.dietaryPreference) {
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

  const pickupServices: PickupService[] = [
    { id: 'pickup-mumbai', from: 'mumbai', to: 'property', price: 5000, type: 'pickup' },
    { id: 'pickup-pune', from: 'pune', to: 'property', price: 3000, type: 'pickup' }
  ];

  const handleProceedToPayment = () => {
    if (!guestDetails.name || !guestDetails.email || !guestDetails.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all guest details",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Booking Confirmation",
      description: `Proceeding to payment for ${selectedRoomType?.name}. Total: ₹${calculateTotal().toLocaleString()}`,
    });
  };

  const handleProceedToGuestDetails = () => {
    setShowGuestDetails(true);
  };

  const nights = calculateNights();

  if (showBookingForm && selectedRoomType) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        
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
                        <p className="text-lg font-semibold">₹{selectedRoomType.base_price.toLocaleString()}/night</p>
                      </div>
                      <Button variant="outline" onClick={() => setShowBookingForm(false)}>
                        Change Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Addons Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add Services & Experiences</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <Tabs defaultValue="meals" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="meals">Meals</TabsTrigger>
                        <TabsTrigger value="pickup">Pickup/Drop</TabsTrigger>
                        <TabsTrigger value="activities">Activities</TabsTrigger>
                        <TabsTrigger value="spa">Spa</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="meals" className="space-y-4">
                        {guestDetails.dietaryPreference !== 'no-preference' && (
                          <div className="text-sm text-muted-foreground mb-4">
                            Showing {guestDetails.dietaryPreference.replace('-', ' ')} options only
                          </div>
                        )}
                        {getFilteredMeals().length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No meals available for your dietary preference
                          </div>
                        ) : (
                          getFilteredMeals().map((meal) => (
                          <div key={meal.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{meal.title}</h4>
                              <p className="text-sm text-muted-foreground">{meal.description}</p>
                              <p className="text-lg font-semibold">₹{meal.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAddon(meal.id)}
                                disabled={!selectedAddons.find(a => a.id === meal.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">
                                {selectedAddons.find(a => a.id === meal.id)?.quantity || 0}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addAddon(meal)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )))}
                      </TabsContent>
                      
                      <TabsContent value="pickup" className="space-y-4">
                        <div className="space-y-4">
                          {pickupServices.map((pickup) => (
                            <div key={pickup.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium capitalize">
                                    Pickup from {pickup.from}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    One-way transfer to the property
                                  </p>
                                  <p className="text-lg font-semibold">₹{pickup.price.toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="pickup"
                                    className="h-4 w-4"
                                    checked={selectedPickup?.id === pickup.id}
                                    onChange={() => setSelectedPickup(pickup)}
                                  />
                                  <label className="text-sm">Select</label>
                                </div>
                              </div>
                            </div>
                          ))}
                          {selectedPickup && (
                            <Button
                              variant="outline"
                              onClick={() => setSelectedPickup(null)}
                              className="w-full"
                            >
                              Remove Pickup Service
                            </Button>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="activities" className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{activity.title}</h4>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                              <p className="text-lg font-semibold">₹{activity.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAddon(activity.id)}
                                disabled={!selectedAddons.find(a => a.id === activity.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">
                                {selectedAddons.find(a => a.id === activity.id)?.quantity || 0}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addAddon(activity)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="spa" className="space-y-4">
                        {spaServices.map((spa) => (
                          <div key={spa.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{spa.title}</h4>
                              <p className="text-sm text-muted-foreground">{spa.description}</p>
                              <p className="text-lg font-semibold">₹{spa.price}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAddon(spa.id)}
                                disabled={!selectedAddons.find(a => a.id === spa.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">
                                {selectedAddons.find(a => a.id === spa.id)?.quantity || 0}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addAddon(spa)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Booking Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Check-in:</span>
                        <span>{formatDate(checkIn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check-out:</span>
                        <span>{formatDate(checkOut)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guests:</span>
                        <span>{guests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nights:</span>
                        <span>{nights}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Room ({nights} nights):</span>
                        <span>₹{(selectedRoomType.base_price * nights).toLocaleString()}</span>
                      </div>
                      
                          {selectedAddons.length > 0 && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium">Add-ons:</div>
                              {selectedAddons.map((addon) => (
                                <div key={addon.id} className="flex justify-between text-sm">
                                  <span>{addon.title} x{addon.quantity}</span>
                                  <span>₹{(addon.price * addon.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {selectedPickup && (
                            <div className="space-y-2">
                              <Separator />
                              <div className="font-medium">Pickup Service:</div>
                              <div className="flex justify-between text-sm">
                                <span>Pickup from {selectedPickup.from}</span>
                                <span>₹{selectedPickup.price.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                     </div>

                     <Separator />

                     <div className="flex justify-between font-semibold text-lg">
                       <span>Total:</span>
                       <span>₹{calculateTotal().toLocaleString()}</span>
                     </div>

                      {!showGuestDetails ? (
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleProceedToGuestDetails}
                        >
                          Proceed to Guest Details
                        </Button>
                      ) : (
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleProceedToPayment}
                        >
                          Proceed to Payment
                        </Button>
                      )}
                  </CardContent>
                </Card>
                
                {/* Guest Details Form */}
                {showGuestDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Guest Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={guestDetails.name}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={guestDetails.email}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            value={guestDetails.phone}
                            onChange={(e) => setGuestDetails(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dietary">Dietary Preference</Label>
                          <select
                            id="dietary"
                            className="w-full p-2 border rounded-md"
                            value={guestDetails.dietaryPreference}
                            onChange={(e) => setGuestDetails(prev => ({ 
                              ...prev, 
                              dietaryPreference: e.target.value as GuestDetails['dietaryPreference']
                            }))}
                          >
                            <option value="no-preference">No Preference</option>
                            <option value="vegetarian">Vegetarian</option>
                            <option value="non-vegetarian">Non-Vegetarian</option>
                            <option value="jain">Jain</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={guestDetails.address}
                          onChange={(e) => setGuestDetails(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Enter address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="special">Special Requests</Label>
                        <Input
                          id="special"
                          value={guestDetails.specialRequests}
                          onChange={(e) => setGuestDetails(prev => ({ ...prev, specialRequests: e.target.value }))}
                          placeholder="Any special requirements or requests"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
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
      <NavigationV5 />
      
      {/* Banner */}
      <section className="relative h-64 bg-gradient-to-r from-primary to-accent">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-6xl mx-auto px-4 text-white">
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Find Your Perfect Stay</h1>
            <p className="text-lg opacity-90">Search and book your ideal mountain retreat</p>
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
                  <Card key={roomType.id}>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Room Image */}
                        <div className="md:col-span-1">
                          <img
                            src={roomType.hero_image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'}
                            alt={roomType.name}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>

                        {/* Room Details */}
                        <div className="md:col-span-1 space-y-4">
                          <div>
                            <h3 className="text-xl font-heading font-bold">{roomType.name}</h3>
                            {roomType.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {roomType.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Up to {roomType.max_guests} guests</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(roomType.features) ? 
                              roomType.features.slice(0, 4).map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  <span className="mr-1">{getFeatureIcon(feature)}</span>
                                  {feature}
                                </Badge>
                              )) :
                              typeof roomType.features === 'string' ?
                                JSON.parse(roomType.features).slice(0, 4).map((feature: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    <span className="mr-1">{getFeatureIcon(feature)}</span>
                                    {feature}
                                  </Badge>
                                )) : null
                            }
                          </div>

                          <div className="text-sm text-green-600 font-medium">
                            {availableCount} room{availableCount !== 1 ? 's' : ''} available
                          </div>
                        </div>

                        {/* Pricing and Booking */}
                        <div className="md:col-span-1 space-y-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              ₹{roomType.base_price.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">per night</div>
                            {nights > 0 && (
                              <div className="text-lg font-semibold mt-1">
                                Total: ₹{(roomType.base_price * nights).toLocaleString()}
                              </div>
                            )}
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Room will be automatically assigned upon booking
                            </p>
                            <Button 
                              onClick={() => handleSelectRoom(roomType)}
                              className="w-full"
                            >
                              Select Room & Add Services
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
};

export default Booking;