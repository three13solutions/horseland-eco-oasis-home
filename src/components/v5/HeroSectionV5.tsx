
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Users, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslationContext } from '@/components/admin/TranslationProvider';
import { supabase } from '@/integrations/supabase/client';

const HeroSectionV5 = () => {
  const navigate = useNavigate();
  const { getTranslation } = useTranslationContext();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [heroTitle, setHeroTitle] = useState('Escape to Nature\'s Embrace');
  const [heroSubtitle, setHeroSubtitle] = useState('A mindful retreat in Matheran\'s no-car eco zone');
  const [slides, setSlides] = useState([
    {
      type: 'image',
      content: "/lovable-uploads/9699e81e-78aa-4ce4-b652-cf46c4bd7075.png",
      alt: "Horse riding on red mud trails in Matheran"
    },
    {
      type: 'image',
      content: "/lovable-uploads/d4df921c-30f4-4f92-92f2-c84dbcd5b591.png",
      alt: "Beautiful lake with red earth shores in Matheran"
    },
    {
      type: 'image',
      content: "/lovable-uploads/b7049d8c-bd59-4733-b040-30b3f79f881c.png",
      alt: "Winding mountain roads leading to Matheran"
    },
    {
      type: 'image',
      content: "/lovable-uploads/6df7505d-8906-4590-b67e-a18c9f9da7f5.png",
      alt: "Matheran toy train through misty mountains"
    }
  ]);

  useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase
        .from('pages')
        .select('title, subtitle, hero_gallery')
        .eq('slug', 'home')
        .single();
      
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_gallery && Array.isArray(data.hero_gallery) && data.hero_gallery.length > 0) {
          setSlides(data.hero_gallery.map((url: string, index: number) => ({
            type: 'image',
            content: url,
            alt: `Matheran hero image ${index + 1}`
          })));
        }
      }
    };
    
    fetchPageData();
  }, []);

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
              {getTranslation('hero.title', heroTitle)}
            </h1>
            <p className="text-lg md:text-xl mb-12 text-white/90 font-body font-light max-w-2xl mx-auto">
              {getTranslation('hero.subtitle', heroSubtitle)}
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
                
                <Button 
                  onClick={() => {
                    if (checkIn && checkOut) {
                      const searchParams = new URLSearchParams({
                        checkIn,
                        checkOut,
                        guests
                      });
                      navigate(`/booking?${searchParams.toString()}`);
                    } else {
                      navigate('/stay');
                    }
                  }}
                  className="h-12 bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl text-lg font-semibold px-6"
                >
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
