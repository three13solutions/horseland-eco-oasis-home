import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, ArrowRight } from 'lucide-react';

const HeroSectionV5 = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      alt: "Mountain sunrise view from Horseland"
    },
    {
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80",
      alt: "Forest trail in Matheran"
    },
    {
      image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
      alt: "Peaceful mountain landscape"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Images */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.alt}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>
      ))}

      {/* Content Overlay */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif mb-6 leading-tight">
              Where the Forest <br />
              <span className="text-primary">Whispers You Awake</span>
            </h1>
            <p className="text-lg md:text-xl mb-12 text-white/90 font-light max-w-2xl mx-auto">
              A mindful retreat in Matheran's no-car eco zone
            </p>

            {/* Glassmorphism Booking Widget - Inside Hero */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-white/80 text-sm font-medium block text-left">Check-in</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                    />
                    <Calendar className="absolute right-3 top-3 h-6 w-6 text-white/60 pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/80 text-sm font-medium block text-left">Check-out</label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                    />
                    <Calendar className="absolute right-3 top-3 h-6 w-6 text-white/60 pointer-events-none" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-white/80 text-sm font-medium block text-left">Guests</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12"
                    />
                    <Users className="absolute right-3 top-3 h-6 w-6 text-white/60 pointer-events-none" />
                  </div>
                </div>
                
                <Button className="h-12 bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl text-lg font-semibold">
                  <span className="hidden md:inline">Check Availability</span>
                  <span className="md:hidden">Search</span>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-primary w-8' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSectionV5;