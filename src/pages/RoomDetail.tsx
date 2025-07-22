import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Wifi, 
  Coffee, 
  Bath, 
  Mountain, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Bed,
  Car,
  Phone,
  Wind
} from 'lucide-react';

const RoomDetail = () => {
  const { roomId } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Room data - in a real app, this would be fetched based on roomId
  const roomData = {
    'deluxe-valley': {
      name: 'Deluxe Valley View',
      shortDescription: 'Elegant comfort with panoramic valley views',
      longDescription: 'Wake up to breathtaking valley vistas from your private balcony in our Deluxe Valley View room. Thoughtfully designed with comfort and tranquility in mind, this room offers the perfect blend of modern amenities and mountain charm. The large windows frame the rolling hills while the cozy interior provides a peaceful retreat after your mountain adventures.',
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      ],
      guests: 2,
      bedType: 'King Size Bed',
      size: '320 sq ft',
      view: 'Valley View',
      price: '₹8,500',
      originalPrice: '₹10,000',
      rating: 4.8,
      amenities: [
        { icon: Mountain, name: 'Valley View' },
        { icon: Wifi, name: 'Free WiFi' },
        { icon: Coffee, name: 'Tea/Coffee Maker' },
        { icon: Bath, name: 'Private Bathroom' },
        { icon: Wind, name: 'Air Conditioning' },
        { icon: Phone, name: 'Direct Dial Phone' },
        { icon: Car, name: 'Parking' },
        { icon: Bed, name: 'Premium Bedding' }
      ],
      features: [
        'Private balcony with seating',
        'Mountain spring water',
        'Organic welcome amenities',
        'Daily housekeeping',
        'Blackout curtains',
        'Work desk',
        'Mini refrigerator',
        'Safe deposit box'
      ],
      seasonalPricing: [
        { season: 'Peak Season (Oct-Feb)', price: '₹10,500' },
        { season: 'Shoulder Season (Mar-May)', price: '₹8,500' },
        { season: 'Monsoon Season (Jun-Sep)', price: '₹7,500' }
      ]
    }
  };

  const room = roomData[roomId as keyof typeof roomData] || roomData['deluxe-valley'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % room.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + room.images.length) % room.images.length);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section with Image Carousel */}
      <section className="relative h-[60vh]">
        <div className="relative w-full h-full overflow-hidden">
          <img 
            src={room.images[currentImageIndex]}
            alt={`${room.name} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* Navigation Arrows */}
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
            {room.images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
          
          {/* Room Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-heading font-bold">{room.name}</h1>
                <Badge className="bg-white/20 text-white border-white/30">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {room.rating}
                </Badge>
              </div>
              <p className="text-lg opacity-90 font-body">{room.shortDescription}</p>
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
                  {room.longDescription}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">{room.guests} Guests</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">{room.bedType}</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <Mountain className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-body font-semibold text-sm">{room.view}</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="font-body font-semibold text-sm">{room.size}</div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Room Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {room.amenities.map((amenity, index) => {
                    const IconComponent = amenity.icon;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
                        <IconComponent className="w-5 h-5 text-primary" />
                        <span className="font-body text-sm">{amenity.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Features */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Additional Features</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {room.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 font-body text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Seasonal Pricing */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 text-foreground">Seasonal Pricing</h2>
                <div className="space-y-3">
                  {room.seasonalPricing.map((pricing, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-card border rounded-lg">
                      <span className="font-body font-medium">{pricing.season}</span>
                      <span className="font-heading font-bold text-lg text-primary">{pricing.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Booking Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl font-heading font-bold text-primary">{room.price}</span>
                      {room.originalPrice && (
                        <span className="text-lg text-muted-foreground line-through">{room.originalPrice}</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground font-body">per night (current season)</span>
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
                        <option>1 Guest</option>
                        <option>2 Guests</option>
                      </select>
                    </div>
                  </div>

                  <Button className="w-full mb-4 font-body" size="lg">
                    Book Now
                  </Button>
                  
                  <Button variant="outline" className="w-full mb-6 font-body">
                    Check Availability
                  </Button>

                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-body mb-2">
                      Free cancellation up to 7 days before arrival
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      Need help? Call +91 98765 43210
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