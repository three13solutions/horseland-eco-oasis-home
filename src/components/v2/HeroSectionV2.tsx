
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, ArrowRight, Mountain } from 'lucide-react';

const HeroSectionV2 = () => {
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>
        ))}
      </div>

      {/* Floating Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center max-w-6xl mx-auto px-6">
          {/* Hero Text with Unconventional Layout */}
          <div className="mb-12">
            <div className="flex items-center justify-center mb-6">
              <Mountain className="w-8 h-8 text-primary mr-4" />
              <span className="text-primary font-medium tracking-wider uppercase text-sm">Matheran's Premier Escape</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight">
              Where
              <span className="block text-primary italic font-light">Luxury</span>
              Meets
              <span className="block text-accent">Nature</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Discover serenity in India's first car-free hill station, where sustainable luxury creates unforgettable moments
            </p>
          </div>

          {/* Unconventional Booking Widget */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Arrival</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Calendar className="absolute right-3 top-3 h-6 w-6 text-white/60" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Departure</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Calendar className="absolute right-3 top-3 h-6 w-6 text-white/60" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-white/80 text-sm font-medium">Guests</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                  />
                  <Users className="absolute right-3 top-3 h-6 w-6 text-white/60" />
                </div>
              </div>
              
              <Button className="h-12 bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl text-lg font-semibold">
                Find Your Escape
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV2;
