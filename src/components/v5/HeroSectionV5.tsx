import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslationContext } from '@/components/admin/TranslationProvider';

const HeroSectionV5 = () => {
  const { getTranslation } = useTranslationContext();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const slides = [
    {
      type: 'image',
      content: "/lovable-uploads/1c90ed68-942a-4c4c-8ec9-b6962d7d5248.png",
      alt: "Scenic mountain viewpoint in Matheran"
    },
    {
      type: 'image',
      content: "/lovable-uploads/11ec8802-2ca9-4b77-bfc6-a8c0e23527e4.png",
      alt: "Matheran toy train crossing waterfall"
    },
    {
      type: 'image',
      content: "/lovable-uploads/c5804249-2e50-49d1-b8da-6c999d32f326.png",
      alt: "I Love Matheran train station"
    },
    {
      type: 'image',
      content: "/lovable-uploads/1c90ed68-942a-4c4c-8ec9-b6962d7d5248.png",
      alt: "Mountain landscape view from Matheran"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

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
            src={slide.content}
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
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 leading-tight">
              {getTranslation('hero.title', 'Escape to Nature\'s Embrace')}
            </h1>
            <p className="text-lg md:text-xl mb-12 text-white/90 font-body font-light max-w-2xl mx-auto">
              {getTranslation('hero.subtitle', 'A mindful retreat in Matheran\'s no-car eco zone')}
            </p>

            {/* Glassmorphism Booking Widget - Inside Hero */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-white/80 text-sm font-medium block text-left">{getTranslation('hero.checkIn', 'Check-in')}</label>
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
                  <label className="text-white/80 text-sm font-medium block text-left">{getTranslation('hero.checkOut', 'Check-out')}</label>
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
                  <label className="text-white/80 text-sm font-medium block text-left">{getTranslation('hero.guests', 'Guests')}</label>
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
                
                <Button className="h-12 bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl text-lg font-semibold px-6">
                  {getTranslation('hero.exploreStay', 'Explore Stay')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </section>
  );
};

export default HeroSectionV5;