import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowLeft, Plus, MapPin, Users, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  image_key: string | null;
  price_amount: number | null;
  price_type: string | null;
  price_range_min: number | null;
  price_range_max: number | null;
  distance: string | null;
  location_name: string | null;
  duration_hours: number | null;
  duration_minutes: number | null;
  is_on_property: boolean | null;
  booking_required: boolean;
  booking_type: string | null;
  tags: any;
  activity_tags: any;
  available_days: any;
  rules_regulations: string | null;
  disclaimer: string | null;
  is_active: boolean;
}

const ActivityDetail = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');

  useEffect(() => {
    loadActivity();
    loadHeroImage();
    checkIfAdded();
  }, [activityId]);

  const loadHeroImage = async () => {
    const { data } = await supabase.from('pages').select('hero_image').eq('slug', 'activities').single();
    if (data?.hero_image) {
      setHeroImage(data.hero_image);
    }
  };

  const loadActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Activity Not Found",
          description: "This activity could not be loaded.",
          variant: "destructive",
        });
        navigate('/activities');
        return;
      }
      
      setActivity({
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : [],
        activity_tags: Array.isArray(data.activity_tags) ? data.activity_tags : [],
        available_days: Array.isArray(data.available_days) ? data.available_days : []
      });
    } catch (error) {
      console.error('Error loading activity:', error);
      toast({
        title: "Error",
        description: "Failed to load activity details.",
        variant: "destructive",
      });
      navigate('/activities');
    } finally {
      setLoading(false);
    }
  };

  const checkIfAdded = () => {
    const bookingData = localStorage.getItem('currentBooking');
    if (bookingData) {
      try {
        const booking = JSON.parse(bookingData);
        const activities = booking.selectedActivities || [];
        setIsAdded(activities.some((a: any) => a.id === activityId));
      } catch (error) {
        console.error('Error checking added activities:', error);
      }
    }
  };

  const handleAddToStay = () => {
    if (!activity) return;

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
          description: "Please select your accommodation before adding activities.",
          variant: "destructive",
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              Go to Booking
            </button>
          ),
        });
        return;
      }

      const existingActivities = booking.selectedActivities || [];
      const existingIndex = existingActivities.findIndex((a: any) => a.id === activity.id);
      
      // If already added, remove it
      if (existingIndex !== -1) {
        existingActivities.splice(existingIndex, 1);
        setIsAdded(false);
        toast({
          title: "Removed from Stay",
          description: `${activity.title} has been removed from your booking.`,
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              View Booking
            </button>
          ),
        });
      } else {
        // Add new activity
        existingActivities.push({
          id: activity.id,
          title: activity.title,
          price: activity.price_amount || 0,
          quantity: 1,
          type: 'activity'
        });
        setIsAdded(true);
        toast({
          title: "Added to Your Stay!",
          description: `${activity.title} has been added to your experience.`,
          action: (
            <button onClick={() => navigate('/booking')} className="underline">
              View Booking
            </button>
          ),
        });
      }

      const updatedBooking = {
        ...booking,
        selectedActivities: existingActivities
      };

      localStorage.setItem('currentBooking', JSON.stringify(updatedBooking));
      setIsAdded(existingActivities.some((a: any) => a.id === activity.id));
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } catch (error) {
      console.error('Error managing activity:', error);
      toast({
        title: "Oops!",
        description: "We encountered a small issue. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = () => {
    if (!activity) return null;
    const hours = activity.duration_hours || 0;
    const minutes = activity.duration_minutes || 0;
    
    if (hours === 0 && minutes === 0) return null;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
    
    return parts.join(' ');
  };

  const formatPrice = () => {
    if (!activity) return null;
    
    if (activity.price_type === 'free') return 'Free';
    
    if (activity.price_type === 'range' && activity.price_range_min && activity.price_range_max) {
      return `₹${activity.price_range_min} - ₹${activity.price_range_max}`;
    }
    
    if (activity.price_amount) {
      return `₹${activity.price_amount}`;
    }
    
    return 'Contact for pricing';
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

  if (!activity) {
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
            onClick={() => navigate('/activities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Adventure Awaits
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Discover Matheran's natural wonders through guided activities
          </p>
        </div>
      </section>

      {/* Activity Details */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Left: Activity Info */}
            <div className="order-2 md:order-1">
              <div className="mb-6">
                <h2 className="text-3xl font-heading font-bold mb-3 text-foreground">
                  {activity.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  {formatDuration() && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-5 h-5" />
                      <span className="font-body">{formatDuration()}</span>
                    </div>
                  )}
                  {activity.distance && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                      <span className="font-body">{activity.distance}</span>
                    </div>
                  )}
                  <Badge className="bg-primary text-primary-foreground px-4 py-1.5">
                    {formatPrice()}
                  </Badge>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Description */}
              {activity.description && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground">
                    About This Activity
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line">
                    {activity.description}
                  </p>
                </div>
              )}

              {/* Location Details */}
              {(activity.location_name || activity.is_on_property !== null) && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location
                  </h3>
                  <div className="space-y-2 text-muted-foreground font-body">
                    {activity.location_name && (
                      <p>{activity.location_name}</p>
                    )}
                    {activity.is_on_property !== null && (
                      <p className="text-sm">
                        {activity.is_on_property ? '✓ On Property' : '• Off Property'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Information */}
              {activity.booking_required && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Booking Information
                  </h3>
                  <div className="space-y-2 text-muted-foreground font-body">
                    <p>Advance booking required</p>
                    {activity.booking_type && (
                      <p className="text-sm capitalize">
                        Book at: {activity.booking_type.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Rules & Regulations */}
              {activity.rules_regulations && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground">
                    Rules & Regulations
                  </h3>
                  <p className="text-muted-foreground font-body leading-relaxed whitespace-pre-line text-sm">
                    {activity.rules_regulations}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              {activity.disclaimer && (
                <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                  <p className="text-muted-foreground font-body text-sm leading-relaxed whitespace-pre-line">
                    <strong>Note:</strong> {activity.disclaimer}
                  </p>
                </div>
              )}

              {/* Activity Tags */}
              {activity.activity_tags && activity.activity_tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {activity.activity_tags.map((tag: string, index: number) => (
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
                  onClick={() => navigate('/booking?tab=activities')}
                >
                  View Booking
                </Button>
              </div>
            </div>

            {/* Right: Image (Top on mobile) */}
            <div className="order-1 md:order-2">
              <div className="sticky top-24">
                <div className="relative rounded-lg overflow-hidden shadow-xl aspect-[4/3] md:aspect-square">
                  <MediaAsset
                    hardcodedKey={activity.image_key || ''}
                    fallbackUrl={activity.image || 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                    alt={activity.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default ActivityDetail;
