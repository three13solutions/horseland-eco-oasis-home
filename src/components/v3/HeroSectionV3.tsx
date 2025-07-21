import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, ArrowRight, MapPin, Star } from 'lucide-react';

const HeroSectionV3 = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const heroImages = [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=1920&h=1080&fit=crop',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&h=1080&fit=crop',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-2000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Hero ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
          </div>
        ))}
      </div>

      {/* Content - Mobile First */}
      <div className="relative z-10 h-full flex items-center justify-center px-4">
        <div className="text-center max-w-6xl mx-auto">
          {/* Hero Text - Mobile Optimized */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-center mb-4 md:mb-6">
              <MapPin className="w-5 h-5 md:w-8 md:h-8 text-primary mr-2 md:mr-4" />
              <span className="text-primary font-medium tracking-wider uppercase text-xs md:text-sm">Matheran's Best Value Stay</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-white mb-4 md:mb-6 leading-tight">
              Comfort
              <span className="block text-primary italic font-light">That's</span>
              <span className="block text-accent">Affordable</span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed px-4">
              Experience the beauty of Matheran without breaking the bank. Quality stay, great memories.
            </p>

            {/* Value Props - Mobile Friendly */}
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm md:text-base">
              <div className="flex items-center text-white/80">
                <Star className="w-4 h-4 mr-1 text-accent" />
                <span>4.2★ Rating</span>
              </div>
              <div className="text-white/80">•</div>
              <div className="text-white/80">Starting ₹1,500/night</div>
              <div className="text-white/80">•</div>
              <div className="text-white/80">Free WiFi</div>
            </div>
          </div>

          {/* Simplified Mobile Booking */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 border border-white/20 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Check-in</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Calendar className="absolute right-3 top-3 h-5 w-5 md:h-6 md:w-6 text-white/60" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Check-out</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Calendar className="absolute right-3 top-3 h-5 w-5 md:h-6 md:w-6 text-white/60" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Guests</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Users className="absolute right-3 top-3 h-5 w-5 md:h-6 md:w-6 text-white/60" />
                </div>
              </div>
              
              <Button className="h-12 bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl text-base md:text-lg font-semibold">
                Check Prices
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-5 h-8 md:w-6 md:h-10 border-2 border-white/40 rounded-full flex justify-center">
          <div className="w-1 h-2 md:h-3 bg-white/60 rounded-full mt-1 md:mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV3;