
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useMediaAsset } from '@/hooks/useMediaAsset';

const HeroSection = () => {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  // Use media assets for hero slides with fallback URLs
  const { asset: heroSlide1 } = useMediaAsset('hero.v4.slide1', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop');
  const { asset: heroSlide2 } = useMediaAsset('hero.v4.slide2', 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1920&h=1080&fit=crop');
  const { asset: heroSlide3 } = useMediaAsset('hero.v4.slide3', 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&h=1080&fit=crop');

  const heroImages = [
    heroSlide1?.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    heroSlide2?.image_url || 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1920&h=1080&fit=crop',
    heroSlide3?.image_url || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&h=1080&fit=crop',
  ];

  const handleCheckAvailability = () => {
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    const searchParams = new URLSearchParams({
      checkIn,
      checkOut,
      guests
    });
    
    navigate(`/booking?${searchParams.toString()}`);
  };

  return (
    <section className="relative h-screen overflow-hidden">
      <Carousel className="h-full">
        <CarouselContent>
          {heroImages.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative h-screen">
                <img
                  src={image}
                  alt={`Hero ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-8" />
        <CarouselNext className="right-8" />
      </Carousel>

      {/* Hero Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Escape to Nature's Embrace
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Comfortable eco-retreat in the heart of Matheran's pristine hills
          </p>
          
          {/* Booking Widget */}
          <Card className="bg-white/95 backdrop-blur-sm max-w-4xl mx-auto">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Check-in</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="pl-10"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Check-out</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="pl-10"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Guests</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="pl-10"
                    />
                    <Users className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleCheckAvailability}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Check Availability
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
