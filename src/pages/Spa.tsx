import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, Heart, Leaf, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [loading, setLoading] = useState(true);
  const [addedServiceIds, setAddedServiceIds] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = useState('Mountain Spa & Wellness');
  const [heroSubtitle, setHeroSubtitle] = useState('Rejuvenate your mind, body, and spirit in nature\'s embrace');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load added service IDs from localStorage
  const loadAddedServices = () => {
    const bookingData = localStorage.getItem('currentBooking');
    if (bookingData) {
      try {
        const booking = JSON.parse(bookingData);
        const spaServices = booking.selectedSpaServices || [];
        setAddedServiceIds(spaServices.map((s: any) => s.id));
      } catch (error) {
        console.error('Error loading added services:', error);
      }
    }
  };

  useEffect(() => {
    loadServices();
    loadAddedServices();
    
    // Listen for booking updates
    const handleBookingUpdate = () => {
      loadAddedServices();
    };
    window.addEventListener('bookingUpdated', handleBookingUpdate);
    
    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase.from('pages').select('title, subtitle, hero_image').eq('slug', 'spa').single();
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_image) setHeroImage(data.hero_image);
      }
    };
    fetchPageData();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('spa_services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices((data || []).map(service => ({
        ...service,
        tags: Array.isArray(service.tags) ? service.tags : []
      })));
    } catch (error) {
      console.error('Error loading spa services:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddToStay = (service: SpaService) => {
    const bookingData = localStorage.getItem('currentBooking');
    
    if (!bookingData) {
      toast({
        title: "Let's Plan Your Stay First",
        description: "Please select your accommodation and dates on our booking page first.",
        variant: "default",
        action: (
          <button onClick={() => navigate('/booking')} className="underline">
            Go to Booking
          </button>
        ),
      });
      return;
    }

    try {
      const booking = JSON.parse(bookingData);
      
      if (!booking.checkIn || !booking.checkOut) {
        toast({
          title: "Almost There!",
          description: "Please select your arrival and departure dates first.",
          variant: "default",
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              Go to Booking
            </button>
          ),
        });
        return;
      }

      if (!booking.selectedRoom && !booking.roomType && !booking.roomUnit) {
        toast({
          title: "Choose Your Haven First",
          description: "Please select your accommodation before adding spa services.",
          variant: "default",
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              Go to Booking
            </button>
          ),
        });
        return;
      }

      const existingSpaServices = booking.selectedSpaServices || [];
      const existingIndex = existingSpaServices.findIndex((s: any) => s.id === service.id);
      
      if (existingIndex !== -1) {
        // Increment quantity if already added
        existingSpaServices[existingIndex].quantity += 1;
        toast({
          title: "Quantity Updated!",
          description: `${service.title} quantity increased. Total: ${existingSpaServices[existingIndex].quantity}`,
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              View Booking
            </button>
          ),
        });
      } else {
        // Add new service
        existingSpaServices.push({
          id: service.id,
          title: service.title,
          price: service.price,
          duration: service.duration,
          quantity: 1,
          type: 'spa'
        });
        toast({
          title: "Added to Your Stay!",
          description: `${service.title} has been added to your wellness experience.`,
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              View Booking
            </button>
          ),
        });
      }

      const updatedBooking = {
        ...booking,
        selectedSpaServices: existingSpaServices
      };

      localStorage.setItem('currentBooking', JSON.stringify(updatedBooking));
      setAddedServiceIds(existingSpaServices.map((s: any) => s.id));
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } catch (error) {
      console.error('Error adding spa service:', error);
      toast({
        title: "Oops!",
        description: "We encountered a small issue. Please try again.",
        variant: "destructive",
      });
    }
  };

  const packages = [
    {
      name: 'Half-Day Wellness Retreat',
      duration: '4 hours',
      price: '₹8,500',
      includes: ['Choice of 90-min treatment', 'Yoga session', 'Healthy lunch', 'Meditation']
    },
    {
      name: 'Full-Day Spa Experience',
      duration: '8 hours',
      price: '₹15,000',
      includes: ['2 spa treatments', 'Yoga & meditation', 'Wellness consultation', 'Organic meals']
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
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
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : Object.keys(servicesByCategory).length === 0 ? (
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
                      <CarouselContent className="-ml-4">
                        {categoryData.services.map((service) => (
                          <CarouselItem key={service.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                            <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full">
                              <div className="relative">
                                {service.image && (
                                  <img 
                                    src={service.image}
                                    alt={service.title}
                                    className="w-full h-48 object-cover"
                                  />
                                )}
                                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                                  ₹{service.price}
                                </Badge>
                              </div>
                              
                              <div className="p-6">
                                <h4 className="text-xl font-heading font-semibold mb-2">{service.title}</h4>
                                
                                {service.duration && (
                                  <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-body text-sm">{service.duration} minutes</span>
                                  </div>
                                )}
                                
                                {service.description && (
                                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                                    {service.description}
                                  </p>
                                )}
                                
                                {service.tags && service.tags.length > 0 && (
                                  <div className="mb-4">
                                    <h5 className="font-body font-semibold mb-2 text-foreground text-sm">Benefits:</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {service.tags.slice(0, 2).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                      {service.tags.length > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{service.tags.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <Button 
                                  className="w-full font-body gap-2"
                                  onClick={() => handleAddToStay(service)}
                                  variant={addedServiceIds.includes(service.id) ? "secondary" : "default"}
                                >
                                  {addedServiceIds.includes(service.id) ? "✓ Added" : <><Plus className="h-4 w-4" />Add to My Stay</>}
                                </Button>
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="-left-4" />
                      <CarouselNext className="-right-4" />
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
      <CombinedFloatingV5 />
    </div>
  );
};

export default Spa;