import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface SpaService {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  duration: number | null;
  price: number;
  category: string;
  tags: any;
  benefits: string | null;
  is_active: boolean;
}

const SpaServiceDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [service, setService] = useState<SpaService | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');

  useEffect(() => {
    loadService();
    loadHeroImage();
    checkIfAdded();
  }, [serviceId]);

  const loadHeroImage = async () => {
    const { data } = await supabase.from('pages').select('hero_image').eq('slug', 'spa').single();
    if (data?.hero_image) {
      setHeroImage(data.hero_image);
    }
  };

  const loadService = async () => {
    try {
      const { data, error } = await supabase
        .from('spa_services')
        .select('*')
        .eq('id', serviceId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Service Not Found",
          description: "This spa service could not be loaded.",
          variant: "destructive",
        });
        navigate('/spa');
        return;
      }
      
      setService({
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        benefits: data.benefits || null
      });
    } catch (error) {
      console.error('Error loading spa service:', error);
      toast({
        title: "Error",
        description: "Failed to load spa service details.",
        variant: "destructive",
      });
      navigate('/spa');
    } finally {
      setLoading(false);
    }
  };

  const checkIfAdded = () => {
    const bookingData = localStorage.getItem('currentBooking');
    if (bookingData) {
      try {
        const booking = JSON.parse(bookingData);
        const spaServices = booking.selectedSpaServices || [];
        setIsAdded(spaServices.some((s: any) => s.id === serviceId));
      } catch (error) {
        console.error('Error checking added services:', error);
      }
    }
  };

  const handleAddToStay = () => {
    if (!service) return;

    const bookingData = localStorage.getItem('currentBooking');
    
    if (!bookingData) {
      toast({
        title: "Select Your Stay First",
        description: "Please select your accommodation and dates on the booking page first.",
        variant: "destructive",
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
          title: "Select Dates First",
          description: "Please select your check-in and check-out dates on the booking page.",
          variant: "destructive",
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
          title: "Select a Room First",
          description: "Please select your accommodation before adding spa services.",
          variant: "destructive",
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
      
      // If already added, remove it
      if (existingIndex !== -1) {
        existingSpaServices.splice(existingIndex, 1);
        setIsAdded(false);
        toast({
          title: "Removed from Stay",
          description: `${service.title} has been removed from your booking.`,
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
        setIsAdded(true);
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
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } catch (error) {
      console.error('Error managing spa service:', error);
      toast({
        title: "Oops!",
        description: "We encountered a small issue. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationV5 />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <DynamicFooter />
      </div>
    );
  }

  if (!service) {
    return null;
  }

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
          <Button
            variant="secondary"
            size="sm"
            className="mb-4"
            onClick={() => navigate('/spa')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Spa Services
          </Button>
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Mountain Spa & Wellness
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Rejuvenate your mind, body, and spirit in nature's embrace
          </p>
        </div>
      </section>

      {/* Service Details */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Left: Service Info */}
            <div className="order-2 md:order-1">
              <div className="mb-6">
                <h2 className="text-3xl font-heading font-bold mb-3 text-foreground">
                  {service.title}
                </h2>
                <div className="flex items-center gap-4 mb-4">
                  {service.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      <span className="font-body">{service.duration} minutes</span>
                    </div>
                  )}
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5">
                    ₹{service.price}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Description */}
              {service.description && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground">
                    About This Treatment
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                    {service.description}
                  </p>
                </div>
              )}

              {/* Benefits Description */}
              {service.benefits && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Benefits
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                    {service.benefits}
                  </p>
                </div>
              )}

              {/* Benefits Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button 
                  className="font-body gap-2 h-12"
                  onClick={handleAddToStay}
                  variant={isAdded ? "secondary" : "default"}
                >
                  {isAdded ? "✓ Added" : <><Plus className="h-4 w-4" />Add to Stay</>}
                </Button>
                <Button 
                  variant="outline"
                  className="font-body h-12"
                  onClick={() => navigate('/booking?tab=spa')}
                >
                  View Booking
                </Button>
              </div>
            </div>

            {/* Right: Image (Top on mobile) */}
            <div className="order-1 md:order-2">
              {service.image && (
                <div className="sticky top-24">
                  <div className="relative rounded-lg overflow-hidden shadow-xl aspect-[4/3] md:aspect-square">
                    <img 
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default SpaServiceDetail;
