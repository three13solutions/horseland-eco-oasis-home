import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Users, Briefcase, TreePine, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslationContext } from '@/components/admin/TranslationProvider';

const PackagesPreviewV5 = () => {
  const { getTranslation } = useTranslationContext();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: true
  });

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const packages = [
    {
      icon: Heart,
      tag: getTranslation('packages.romantic.tag', 'Romantic'),
      title: getTranslation('packages.romantic.title', 'Romantic Getaway'),
      description: getTranslation('packages.romantic.description', 'Perfect for couples seeking intimate moments amidst breathtaking mountain landscapes.'),
      price: "Starting ₹8,500",
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=250&fit=crop"
    },
    {
      icon: Users,
      tag: getTranslation('packages.family.tag', 'Family'),
      title: getTranslation('packages.family.title', 'Family Adventure'),
      description: getTranslation('packages.family.description', 'Create lasting memories with activities designed for every member of your family.'),
      price: "Starting ₹12,000",
      image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=250&fit=crop"
    },
    {
      icon: Briefcase,
      tag: getTranslation('packages.corporate.tag', 'Corporate'),
      title: getTranslation('packages.corporate.title', 'Corporate Retreat'),
      description: getTranslation('packages.corporate.description', 'Inspire your team with unique team-building experiences in nature\'s tranquil setting.'),
      price: "Starting ₹15,000",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=250&fit=crop"
    },
    {
      icon: TreePine,
      tag: getTranslation('packages.adventure.tag', 'Adventure'),
      title: getTranslation('packages.adventure.title', 'Adventure Package'),
      description: getTranslation('packages.adventure.description', 'For thrill-seekers who want to explore Matheran\'s wilderness through exciting outdoor activities.'),
      price: "Starting ₹16,500",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=250&fit=crop"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {getTranslation('packages.title', 'Exclusive Packages')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {getTranslation('packages.subtitle', 'Choose Your Perfect Mountain Getaway')}
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-6xl mx-auto">
          {/* Navigation Buttons */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-300"
            onClick={scrollPrev}
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-300"
            onClick={scrollNext}
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>

          {/* Carousel */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {packages.map((pkg, index) => (
                <div 
                  key={index}
                  className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-3"
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 h-full">
                    <div className="relative">
                      <img
                        src={pkg.image}
                        alt={pkg.title}
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold">
                        {pkg.tag}
                      </div>
                      <div className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <pkg.icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{pkg.title}</h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed text-sm">{pkg.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-primary font-bold text-base">{pkg.price}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-sm px-3 py-2"
                        >
                          Explore Package
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
            Explore Packages
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PackagesPreviewV5;