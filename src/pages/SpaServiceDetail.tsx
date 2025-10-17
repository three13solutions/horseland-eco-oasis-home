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

  useEffect(() => {
    loadService();
    checkIfAdded();
  }, [serviceId]);

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
      setIsAdded(true);
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
      
      {/* Hero Section with Image */}
      <section className="relative h-[50vh] min-h-[400px] bg-muted">
        {service.image && (
          <>
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img 
                src={service.image}
                alt={service.title}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-24 left-4 md:left-8 z-10"
              onClick={() => navigate('/spa')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Spa
            </Button>
          </>
        )}
      </section>

      {/* Service Details */}
      <section className="py-16 -mt-20 relative z-10">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2 text-foreground">
                    {service.title}
                  </h1>
                  {service.duration && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      <span className="font-body text-lg">{service.duration} minutes</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
                    ₹{service.price}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Description */}
              {service.description && (
                <div className="mb-8">
                  <h2 className="text-xl font-heading font-semibold mb-3 text-foreground">
                    About This Treatment
                  </h2>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                    {service.description}
                  </p>
                </div>
              )}

              {/* Benefits Description */}
              {service.benefits && (
                <div className="mb-8">
                  <h2 className="text-xl font-heading font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Benefits
                  </h2>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                    {service.benefits}
                  </p>
                </div>
              )}

              {/* Benefits Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-heading font-semibold mb-4 text-foreground">
                    Benefits
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {service.tags.map((tag: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-muted-foreground font-body">{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button 
                  size="lg"
                  className="flex-1 font-body gap-2"
                  onClick={handleAddToStay}
                  variant={isAdded ? "secondary" : "default"}
                >
                  {isAdded ? "✓ Added to Stay" : <><Plus className="h-5 w-5" />Add to My Stay</>}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="flex-1 font-body"
                  onClick={() => navigate('/booking?tab=spa')}
                >
                  View Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default SpaServiceDetail;
