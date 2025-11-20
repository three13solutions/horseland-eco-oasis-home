import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloating from '../components/CombinedFloating';
import MediaAsset from '../components/MediaAsset';
import GuestSelector from '../components/GuestSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Bed,
  Mountain,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon
} from 'lucide-react';

const RoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableUnits, setAvailableUnits] = useState<number>(0);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showSeasonalPricing, setShowSeasonalPricing] = useState(false);
  const [seasonalPricing, setSeasonalPricing] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [infants, setInfants] = useState<number>(0);

  // Fetch room data from database
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) return;

      try {
        const { data, error } = await supabase
          .from('room_types')
          .select('*')
          .eq('id', roomId)
          .eq('is_published', true)
          .single();

        if (error) throw error;
        
        if (data) {
          setRoomData(data);
        }
      } catch (error) {
        console.error('Error fetching room data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId]);

  // Check room availability
  const checkCurrentAvailability = async () => {
    if (!roomData?.id) return;
    
    setCheckingAvailability(true);
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase.rpc('check_room_availability', {
        p_room_type_id: roomData.id,
        p_check_in: today.toISOString().split('T')[0],
        p_check_out: tomorrow.toISOString().split('T')[0]
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAvailableUnits(data[0].available_units || 0);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Check availability and load seasonal pricing when room data loads
  useEffect(() => {
    if (roomData) {
      checkCurrentAvailability();
      loadSeasonalPricing();
    }
  }, [roomData]);

  // Load seasonal pricing from database
  const loadSeasonalPricing = async () => {
    if (!roomData?.id) return;
    
    try {
      // Fetch seasons with their periods
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
          season_periods(*)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (seasonsError) throw seasonsError;
      setSeasons(seasonsData || []);

      // Fetch seasonal pricing for this room type
      const { data: pricingData, error: pricingError } = await supabase
        .from('seasonal_pricing')
        .select(`
          *,
          season:seasons(*),
          day_type:day_types(*)
        `)
        .eq('room_type_id', roomData.id)
        .order('season.display_order', { ascending: true });

      if (pricingError) throw pricingError;
      setSeasonalPricing(pricingData || []);
    } catch (error) {
      console.error('Error loading seasonal pricing:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room details...</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold mb-4">Room Not Found</h1>
          <Button onClick={() => navigate('/stay')}>Back to Rooms</Button>
        </div>
      </div>
    );
  }

  // Prepare images array with keys and URLs
  const imageKeys = roomData.hero_image_key 
    ? [roomData.hero_image_key, ...(roomData.gallery_keys || [])]
    : (roomData.gallery_keys || []);
  
  const imageUrls = roomData.hero_image 
    ? [roomData.hero_image, ...(roomData.gallery || [])]
    : (roomData.gallery || []);
  
  const images = imageKeys.length > 0 
    ? imageKeys.map((key: string, idx: number) => ({ key, url: imageUrls[idx] }))
    : imageUrls.map((url: string) => ({ key: null, url }));
  
  // Fallback if no images
  if (images.length === 0) {
    images.push({ key: null, url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80' });
  }

  const features = roomData.features || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleBookNow = () => {
    // Use selected dates if available, otherwise use today/tomorrow
    const checkIn = checkInDate || new Date();
    const checkOut = checkOutDate || (() => {
      const tomorrow = new Date(checkIn);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })();
    
    const totalGuests = adults + children + infants;
    const searchParams = new URLSearchParams({
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      guests: totalGuests.toString(),
      adults: adults.toString(),
      children: children.toString(),
      infants: infants.toString(),
      roomTypeId: roomData.id
    });
    
    navigate(`/booking?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />
      
      {/* Hero Section with Image Carousel */}
      <section className="relative h-[60vh] min-h-[500px]">
        <div className="relative w-full h-full overflow-hidden">
          {images[currentImageIndex].key ? (
            <MediaAsset
              hardcodedKey={images[currentImageIndex].key}
              fallbackUrl={images[currentImageIndex].url}
              alt={`${roomData.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={images[currentImageIndex].url}
              alt={`${roomData.name} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              {/* Image Indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Room Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-heading font-bold">{roomData.name}</h1>
              </div>
              <p className="text-lg opacity-90 font-body">{roomData.description || 'Comfortable mountain retreat'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Left Column - Room Details */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Room Overview */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-4 text-foreground">Room Overview</h2>
                <p className="text-muted-foreground font-body leading-relaxed mb-6">
                  {roomData.description || 'Experience comfort and tranquility in our thoughtfully designed accommodation.'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">Up to {roomData.max_guests} Guests</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">Comfortable Bedding</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Mountain className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">Mountain View</div>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              {images.length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Room Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div 
                        key={index} 
                        className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        {image.key ? (
                          <MediaAsset
                            hardcodedKey={image.key}
                            fallbackUrl={image.url}
                            alt={`${roomData.name} - Gallery ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <img
                            src={image.url}
                            alt={`${roomData.name} - Gallery ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-body text-sm">
                            View Full Size
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 font-body">
                    Click any image to view it in the hero gallery above
                  </p>
                </div>
              )}

              {/* Room Features */}
              {features.length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Room Features & Amenities</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {features.map((feature: string, index: number) => (
                      <div key={index} className="flex items-start gap-2 font-body text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  {/* Safety Deposit Note */}
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm font-body text-blue-900 dark:text-blue-100">
                        <strong>Note:</strong> No In-Room Safes; Generally Safety Deposit is available at Reception with Receipt.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seasonal Pricing */}
              {roomData.seasonal_pricing && Object.keys(roomData.seasonal_pricing).length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Seasonal Pricing</h2>
                  <div className="space-y-3">
                    {Object.entries(roomData.seasonal_pricing).map(([season, price]: [string, any], index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-card border rounded-lg">
                        <span className="font-body font-medium capitalize">{season.replace('_', ' ')}</span>
                        <span className="font-heading font-bold text-lg text-primary">₹{price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  {/* Availability Status */}
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    {checkingAvailability ? (
                      <p className="text-sm font-body text-muted-foreground text-center">
                        Checking availability...
                      </p>
                    ) : (
                      <p className={`text-sm font-body font-medium text-center ${
                        availableUnits > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {availableUnits > 0 
                          ? `${availableUnits} room${availableUnits > 1 ? 's' : ''} available` 
                          : 'No rooms available'}
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl font-heading font-bold text-primary">
                        ₹{roomData.base_price?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground font-body">per night (base price)</span>
                    
                    {/* Seasonal Pricing Toggle */}
                    {seasonalPricing.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowSeasonalPricing(!showSeasonalPricing)}
                          className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-body"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>See seasonal rates</span>
                          {showSeasonalPricing ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        
                        {showSeasonalPricing && (
                          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Group pricing by season */}
                            {seasons.map((season) => {
                              const seasonPrices = seasonalPricing.filter(
                                (sp) => sp.season?.id === season.id
                              );
                              
                              if (seasonPrices.length === 0) return null;
                              
                              return (
                                <div key={season.id} className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: season.color }}
                                    />
                                    <span className="text-xs font-body font-semibold">
                                      {season.name}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 ml-4">
                                    {seasonPrices.map((sp) => (
                                      <div 
                                        key={sp.id} 
                                        className="flex items-center justify-between p-2 rounded-lg border bg-card/30"
                                      >
                                        <span className="text-xs font-body text-muted-foreground">
                                          {sp.day_type?.name}
                                        </span>
                                        <span className="text-sm font-heading font-bold">
                                          ₹{sp.price?.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Season Guide */}
                            <div className="pt-2 border-t space-y-1.5">
                              <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Season Guide
                              </p>
                              <div className="space-y-1.5">
                                {seasons.map((season) => {
                                  const periods = season.season_periods || [];
                                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  
                                  return (
                                    <div key={season.id} className="flex items-start gap-2">
                                      <div 
                                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" 
                                        style={{ backgroundColor: season.color }}
                                      />
                                      <p className="text-xs font-body text-muted-foreground leading-relaxed">
                                        <span className="font-medium">{season.name}:</span>{' '}
                                        {periods.map((p: any, idx: number) => (
                                          <span key={idx}>
                                            {monthNames[p.start_month - 1]} {p.start_day} - {monthNames[p.end_month - 1]} {p.end_day}
                                            {idx < periods.length - 1 && ', '}
                                          </span>
                                        ))}
                                        {season.description && ` (${season.description})`}
                                      </p>
                                    </div>
                                  );
                                })}
                                <div className="pt-1 mt-1 border-t">
                                  <p className="text-xs font-body text-muted-foreground leading-relaxed">
                                    <span className="font-medium">Note:</span> Weekend rates apply to Fri-Sun and all holidays
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-body font-medium mb-2">Check-in Date</label>
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
                            {checkInDate ? format(checkInDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-2 shadow-2xl" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={checkInDate}
                            onSelect={(newDate) => {
                              setCheckInDate(newDate);
                              // Clear checkout if new check-in is after current checkout
                              if (newDate && checkOutDate && newDate >= checkOutDate) {
                                setCheckOutDate(undefined);
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="block text-sm font-body font-medium mb-2">Check-out Date</label>
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
                            {checkOutDate ? format(checkOutDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-2 shadow-2xl" align="start">
                          <CalendarComponent
                            mode="range"
                            selected={checkInDate && checkOutDate ? { from: checkInDate, to: checkOutDate } : undefined}
                            onSelect={(range) => {
                              if (range?.to) {
                                setCheckOutDate(range.to);
                              }
                            }}
                            defaultMonth={checkInDate}
                            disabled={(date) => {
                              const today = new Date(new Date().setHours(0, 0, 0, 0));
                              return !checkInDate || date <= checkInDate || date < today;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-body font-medium mb-2">Guests</label>
                    <GuestSelector
                      totalGuests={adults + children + infants}
                      onGuestsChange={(total, adultsCount, childrenCount, infantsCount) => {
                        setAdults(adultsCount || 0);
                        setChildren(childrenCount || 0);
                        setInfants(infantsCount || 0);
                      }}
                    />
                  </div>

                  <Button onClick={handleBookNow} className="w-full mb-4 font-body" size="lg">
                    Book Now
                  </Button>
                  
                  <Button variant="outline" className="w-full mb-6 font-body" onClick={() => navigate('/stay')}>
                    View All Rooms
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      Cancellation policies vary by rate plan
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      Need help? Contact us for details
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default RoomDetail;
