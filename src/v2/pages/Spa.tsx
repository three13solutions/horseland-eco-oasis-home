import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/v2/components/Navigation';
import DynamicFooter from '@/v2/components/DynamicFooter';
import CombinedFloating from '@/v2/components/CombinedFloating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, Heart, Leaf } from 'lucide-react';
import { activeSpaServices, getPageBySlug } from '@/v2/data';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface SpaService {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  duration: number | null;
  price: number;
  category: string;
  tags: any;
  is_active: boolean;
}

const SPA_CATEGORIES = [
  { id: 'all', label: 'All Services', icon: Sparkles },
  { id: 'massage', label: 'Massage', icon: Heart },
  { id: 'therapy', label: 'Therapy', icon: Leaf },
  { id: 'facials', label: 'Facials', icon: Sparkles },
  { id: 'workouts', label: 'Workouts', icon: Heart }
];

const Spa = () => {
  const [services, setServices] = useState<SpaService[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = useState('Mountain Spa & Wellness');
  const [heroSubtitle, setHeroSubtitle] = useState('Rejuvenate your mind, body, and spirit in nature\'s embrace');
  const navigate = useNavigate();

  useEffect(() => {
    setServices((activeSpaServices as SpaService[]).map(service => ({
      ...service,
      tags: Array.isArray(service.tags) ? service.tags : []
    })));

    const page = getPageBySlug('spa');
    if (page) {
      if (page.title) setHeroTitle(page.title);
      if (page.subtitle) setHeroSubtitle(page.subtitle);
      if (page.hero_image) setHeroImage(page.hero_image);
    }
  }, []);

  // Group services by category
  const servicesByCategory = SPA_CATEGORIES.filter(cat => cat.id !== 'all').reduce((acc, category) => {
    const categoryServices = services.filter(service => service.category === category.id);
    if (categoryServices.length > 0) {
      acc[category.id] = {
        label: category.label,
        icon: category.icon,
        services: categoryServices
      };
    }
    return acc;
  }, {} as Record<string, { label: string; icon: any; services: SpaService[] }>);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${heroImage}')`
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {heroTitle}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Wellness in Harmony with Nature
          </h2>
          <p className="text-lg text-muted-foreground font-body leading-relaxed mb-8">
            Our spa philosophy embraces the healing power of the mountains, combining ancient 
            Ayurvedic wisdom with modern wellness practices. Every treatment is designed to 
            restore balance and reconnect you with your inner peace.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Natural Ingredients</h3>
              <p className="text-muted-foreground font-body text-sm">
                Organic oils and herbs sourced from local forests and farms
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Holistic Approach</h3>
              <p className="text-muted-foreground font-body text-sm">
                Treatments that address mind, body, and spiritual wellness
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Expert Therapists</h3>
              <p className="text-muted-foreground font-body text-sm">
                Certified practitioners trained in traditional and modern techniques
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services by Category - Carousels */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Spa Services
          </h2>
          
          {Object.keys(servicesByCategory).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No spa services available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {Object.entries(servicesByCategory).map(([categoryId, categoryData]) => {
                const Icon = categoryData.icon;
                return (
                  <div key={categoryId}>
                    <div className="flex items-center gap-3 mb-6">
                      <Icon className="h-6 w-6 text-primary" />
                      <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                        {categoryData.label}
                      </h3>
                    </div>
                    
                    <Carousel
                      opts={{
                        align: "start",
                        loop: false,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-2 md:-ml-4">
                        {categoryData.services.map((service) => (
                          <CarouselItem key={service.id} className="pl-2 md:pl-4 basis-[85%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                            <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full">
                              <div className="relative">
                                {service.image && (
                                  <img 
                                    src={service.image}
                                    alt={service.title}
                                    className="w-full h-40 object-cover"
                                  />
                                )}
                                <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs">
                                  ₹{service.price}
                                </Badge>
                                <Badge 
                                  className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs cursor-pointer hover:bg-primary/90 transition-colors"
                                  onClick={() => navigate(`/v2/spa/${service.id}`)}
                                >
                                  Learn More
                                </Badge>
                              </div>
                              
                              <div className="p-4">
                                <h4 className="text-lg font-heading font-semibold mb-2 line-clamp-1">{service.title}</h4>
                                
                                {service.duration && (
                                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-body text-xs">{service.duration} min</span>
                                  </div>
                                )}
                                
                                {service.description && (
                                  <p className="text-muted-foreground font-body text-xs mb-3 leading-relaxed line-clamp-2">
                                    {service.description}
                                  </p>
                                )}
                                
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="hidden md:flex -left-12" />
                      <CarouselNext className="hidden md:flex -right-12" />
                    </Carousel>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>


      {/* Booking Info */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Ready to Unwind?
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            Book your spa treatments in advance to ensure availability. 
            Our wellness concierge can help design a personalized experience for your stay.
          </p>
          <div className="flex justify-center">
          <Button size="lg" className="font-body" onClick={() => navigate('/booking?tab=spa')}>
            Book Spa Treatments
          </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default Spa;
