import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Clock, MapPin, Wifi, Coffee, Car, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import NavigationV5 from '@/components/v5/NavigationV5';
import DynamicFooter from '@/components/DynamicFooter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  hero_image?: string;
  gallery: any; // JSON field
  max_guests: number;
  features: any; // JSON field
  base_price: number;
  is_published: boolean;
  seasonal_pricing: any;
  availability_calendar: any;
  created_at: string;
  updated_at: string;
}

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name?: string;
  floor_number?: number;
  area_sqft?: number;
  special_features?: any; // JSON field
  bed_configuration?: any; // JSON field
  max_occupancy?: number;
  room_type_id: string;
  status: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AvailableRoom {
  roomType: RoomType;
  availableUnits: RoomUnit[];
  availableCount: number;
}

const Booking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get search parameters
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = parseInt(searchParams.get('guests') || '2');
  const roomTypeId = searchParams.get('roomTypeId'); // Optional filter for specific room type
  
  // State
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCheckIn, setSearchCheckIn] = useState(checkIn);
  const [searchCheckOut, setSearchCheckOut] = useState(checkOut);
  const [searchGuests, setSearchGuests] = useState(guests.toString());

  // Load available rooms
  useEffect(() => {
    if (checkIn && checkOut) {
      loadAvailableRooms();
    } else {
      setLoading(false);
    }
  }, [checkIn, checkOut, guests, roomTypeId]);

  const loadAvailableRooms = async () => {
    try {
      setLoading(true);
      
      // Get all published room types
      let query = supabase
        .from('room_types')
        .select('*')
        .eq('is_published', true)
        .gte('max_guests', guests)
        .order('base_price');

      // Filter by specific room type if provided
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

      // Check availability for each room type
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
          const unitIds = availabilityData[0].unit_ids;

          if (availableCount > 0 && unitIds) {
            // Get unit details
            const { data: units, error: unitsError } = await supabase
              .from('room_units')
              .select('*')
              .in('id', unitIds)
              .eq('is_active', true)
              .gte('max_occupancy', guests);

            if (unitsError) {
              console.error('Error loading units:', unitsError);
              continue;
            }

            if (units && units.length > 0) {
              availableRoomsData.push({
                roomType,
                availableUnits: units,
                availableCount: units.length
              });
            }
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

  const handleBookRoom = (roomType: RoomType, unit: RoomUnit) => {
    // Navigate to detailed booking modal or page
    const bookingParams = new URLSearchParams({
      roomTypeId: roomType.id,
      unitId: unit.id,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests.toString()
    });
    
    // For now, we'll show a toast. Later this can open a booking modal
    toast({
      title: "Booking",
      description: `Proceeding to book ${roomType.name} - ${unit.unit_number}`,
    });
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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

  const nights = calculateNights();

  return (
    <div className="min-h-screen bg-background">
      <NavigationV5 />
      
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
                {availableRooms.map(({ roomType, availableUnits, availableCount }) => (
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

                          <div className="text-sm text-muted-foreground">
                            {availableCount} unit{availableCount !== 1 ? 's' : ''} available
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
                            <Label className="text-sm font-medium">Available Units:</Label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {availableUnits.map((unit) => (
                                <div key={unit.id} className="flex items-center justify-between p-2 border rounded">
                                  <div>
                                    <div className="font-medium">{unit.unit_number}</div>
                                    {unit.unit_name && (
                                      <div className="text-xs text-muted-foreground">{unit.unit_name}</div>
                                    )}
                                    {unit.floor_number && (
                                      <div className="text-xs text-muted-foreground">Floor: {unit.floor_number}</div>
                                    )}
                                  </div>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleBookRoom(roomType, unit)}
                                  >
                                    Book
                                  </Button>
                                </div>
                              ))}
                            </div>
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