import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Bed,
  Mountain
} from 'lucide-react';

const RoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // Prepare images array from gallery and hero_image
  const images = [];
  if (roomData.hero_image) images.push(roomData.hero_image);
  if (roomData.gallery && Array.isArray(roomData.gallery)) {
    images.push(...roomData.gallery);
  }
  
  // Fallback if no images
  if (images.length === 0) {
    images.push('https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80');
  }

  const features = roomData.features || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleBookNow = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const searchParams = new URLSearchParams({
      checkIn: today.toISOString().split('T')[0],
      checkOut: tomorrow.toISOString().split('T')[0],
      guests: '2',
      roomTypeId: roomData.id
    });
    
    navigate(`/booking?${searchParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section with Image Carousel */}
      <section className="relative h-[60vh]">
        <div className="relative w-full h-full overflow-hidden">
          <img 
            src={images[currentImageIndex]}
            alt={`${roomData.name} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
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
                        <img
                          src={image}
                          alt={`${roomData.name} - Gallery ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
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
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl font-heading font-bold text-primary">
                        ₹{roomData.base_price?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground font-body">per night (base price)</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-body font-medium mb-2">Check-in Date</label>
                      <input 
                        type="date" 
                        className="w-full p-3 border rounded-lg font-body focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-body font-medium mb-2">Check-out Date</label>
                      <input 
                        type="date" 
                        className="w-full p-3 border rounded-lg font-body focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-body font-medium mb-2">Guests</label>
                      <select className="w-full p-3 border rounded-lg font-body focus:outline-none focus:ring-2 focus:ring-primary">
                        {Array.from({ length: roomData.max_guests }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button onClick={handleBookNow} className="w-full mb-4 font-body" size="lg">
                    Book Now
                  </Button>
                  
                  <Button variant="outline" className="w-full mb-6 font-body" onClick={() => navigate('/stay')}>
                    View All Rooms
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      Free cancellation up to 7 days before arrival
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
      <FloatingElementsV5 />
    </div>
  );
};

export default RoomDetail;
