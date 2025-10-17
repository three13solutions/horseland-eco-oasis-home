import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Star, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  description?: string;
  distance?: string;
  price_amount?: number;
  image?: string;
  image_key?: string;
  is_active: boolean;
  booking_required: boolean;
  tags?: any;
}

const Activities = () => {
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedActivityIds, setAddedActivityIds] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [subtitle, setSubtitle] = useState('Discover Matheran\'s natural wonders through guided activities');
  const [title, setTitle] = useState('Adventure Awaits');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load added activity IDs from localStorage
  const loadAddedActivities = () => {
    const bookingData = localStorage.getItem('currentBooking');
    if (bookingData) {
      try {
        const booking = JSON.parse(bookingData);
        const activities = booking.selectedActivities || [];
        setAddedActivityIds(activities.map((a: any) => a.id));
      } catch (error) {
        console.error('Error loading added activities:', error);
      }
    }
  };

  useEffect(() => {
    loadActivities();
    loadPageData();
    loadAddedActivities();
    
    // Listen for booking updates
    const handleBookingUpdate = () => {
      loadAddedActivities();
    };
    window.addEventListener('bookingUpdated', handleBookingUpdate);
    
    return () => {
      window.removeEventListener('bookingUpdated', handleBookingUpdate);
    };
  }, []);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPageData = async () => {
    const { data } = await supabase
      .from('pages')
      .select('title, subtitle, hero_image')
      .eq('slug', 'activities')
      .single();
    
    if (data) {
      setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.hero_image) setHeroImage(data.hero_image);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    // For now, filter by tags array until we have proper activity types
    const tags = activity.tags || [];
    if (filter === 'adventure') return tags.includes('adventure');
    if (filter === 'nature') return tags.includes('nature');
    if (filter === 'family') return tags.includes('family');
    return true;
  });

  const handleAddToStay = (activity: Activity) => {
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
          description: "Please select your accommodation before adding activities.",
          variant: "default",
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
      
      if (existingIndex !== -1) {
        // Increment quantity if already added
        existingActivities[existingIndex].quantity += 1;
        toast({
          title: "Quantity Updated!",
          description: `${activity.title} quantity increased. Total: ${existingActivities[existingIndex].quantity}`,
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
      setAddedActivityIds(existingActivities.map((a: any) => a.id));
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('bookingUpdated'));
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Oops!",
        description: "We encountered a small issue. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading activities...</p>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {title}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="font-body"
            >
              All Activities
            </Button>
            <Button 
              variant={filter === 'adventure' ? 'default' : 'outline'}
              onClick={() => setFilter('adventure')}
              className="font-body"
            >
              Adventure
            </Button>
            <Button 
              variant={filter === 'nature' ? 'default' : 'outline'}
              onClick={() => setFilter('nature')}
              className="font-body"
            >
              Nature
            </Button>
            <Button 
              variant={filter === 'family' ? 'default' : 'outline'}
              onClick={() => setFilter('family')}
              className="font-body"
            >
              Family-Friendly
            </Button>
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative">
                  <MediaAsset
                    hardcodedKey={activity.image_key || ''}
                    fallbackUrl={activity.image || 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                    alt={activity.title}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    4.5
                  </Badge>
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                    Book Now
                  </Badge>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-2">{activity.title}</h3>
                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                    {activity.description || 'An exciting activity to enhance your stay at Matheran.'}
                  </p>
                  
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    {activity.distance && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {activity.distance}
                      </div>
                    )}
                    {activity.booking_required && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Booking Required
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Suitable for All Ages
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="font-body flex-1">
                      Learn More
                    </Button>
                    <Button 
                      size="sm" 
                      className="font-body flex-1 gap-2"
                      onClick={() => handleAddToStay(activity)}
                      variant={addedActivityIds.includes(activity.id) ? "secondary" : "default"}
                    >
                      <Plus className="h-4 w-4" />
                      {addedActivityIds.includes(activity.id) ? "Added - Add More" : "Add to Stay"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Activities;