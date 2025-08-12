import React, { useState, useEffect } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, Heart, Leaf } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SpaService {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  duration: number | null;
  price: number;
  tags: any;
  is_active: boolean;
}

const Spa = () => {
  const [services, setServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
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
      <section className="relative min-h-[60vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Mountain Spa & Wellness
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Rejuvenate your mind, body, and spirit in nature's embrace
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

      {/* Services Grid */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Spa Services
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No spa services available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <div key={service.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
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
                    <h3 className="text-xl font-heading font-semibold mb-2">{service.title}</h3>
                    
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
                        <h4 className="font-body font-semibold mb-2 text-foreground text-sm">Benefits:</h4>
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
                    
                    <Button className="w-full font-body">
                      Book a Slot
                    </Button>
                  </div>
                </div>
              ))}
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
            <Button size="lg" className="font-body">
              Book Spa Treatments
            </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default Spa;