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
  is_on_property?: boolean;
  booking_required: boolean;
  tags?: any;
}

const Activities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedActivityIds, setAddedActivityIds] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [subtitle, setSubtitle] = useState('Discover Matheran\'s natural wonders through guided activities');
  const [title, setTitle] = useState('Adventure Awaits');
  
  // Filter states
  const [locationFilter, setLocationFilter] = useState<'all' | 'on_property' | 'off_property'>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  
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
    // Location filter
    if (locationFilter === 'on_property' && activity.is_on_property !== true) return false;
    if (locationFilter === 'off_property' && activity.is_on_property !== false) return false;
    
    // Season filter
    if (seasonFilter !== 'all') {
      const seasons = activity.tags || [];
      if (!seasons.includes(seasonFilter)) return false;
    }
    
    // Audience filter
    if (audienceFilter !== 'all') {
      const audiences = activity.tags || [];
      if (!audiences.includes(audienceFilter)) return false;
    }
    
    // Price filter
    if (priceFilter !== 'all') {
      const price = activity.price_amount || 0;
      if (priceFilter === 'free' && price > 0) return false;
      if (priceFilter === 'under_500' && price >= 500) return false;
      if (priceFilter === '500_1000' && (price < 500 || price > 1000)) return false;
      if (priceFilter === 'above_1000' && price <= 1000) return false;
    }
    
    return true;
  });

  const handleAddToStay = (activity: Activity) => {
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
      console.error('Error managing activity:', error);
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
          <div className="space-y-6">
            {/* Location Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 font-heading">Location</h3>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant={locationFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setLocationFilter('all')}
                  className="font-body"
                  size="sm"
                >
                  All Locations
                </Button>
                <Button 
                  variant={locationFilter === 'on_property' ? 'default' : 'outline'}
                  onClick={() => setLocationFilter('on_property')}
                  className="font-body"
                  size="sm"
                >
                  On Property
                </Button>
                <Button 
                  variant={locationFilter === 'off_property' ? 'default' : 'outline'}
                  onClick={() => setLocationFilter('off_property')}
                  className="font-body"
                  size="sm"
                >
                  Off Property
                </Button>
              </div>
            </div>

            {/* Season Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 font-heading">Best Season</h3>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant={seasonFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setSeasonFilter('all')}
                  className="font-body"
                  size="sm"
                >
                  All Seasons
                </Button>
                <Button 
                  variant={seasonFilter === 'monsoon' ? 'default' : 'outline'}
                  onClick={() => setSeasonFilter('monsoon')}
                  className="font-body"
                  size="sm"
                >
                  Monsoon
                </Button>
                <Button 
                  variant={seasonFilter === 'winter' ? 'default' : 'outline'}
                  onClick={() => setSeasonFilter('winter')}
                  className="font-body"
                  size="sm"
                >
                  Winter
                </Button>
                <Button 
                  variant={seasonFilter === 'summer' ? 'default' : 'outline'}
                  onClick={() => setSeasonFilter('summer')}
                  className="font-body"
                  size="sm"
                >
                  Summer
                </Button>
              </div>
            </div>

            {/* Audience Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 font-heading">Suitable For</h3>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant={audienceFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setAudienceFilter('all')}
                  className="font-body"
                  size="sm"
                >
                  Everyone
                </Button>
                <Button 
                  variant={audienceFilter === 'family' ? 'default' : 'outline'}
                  onClick={() => setAudienceFilter('family')}
                  className="font-body"
                  size="sm"
                >
                  Family
                </Button>
                <Button 
                  variant={audienceFilter === 'adventure' ? 'default' : 'outline'}
                  onClick={() => setAudienceFilter('adventure')}
                  className="font-body"
                  size="sm"
                >
                  Adventure Seekers
                </Button>
                <Button 
                  variant={audienceFilter === 'nature' ? 'default' : 'outline'}
                  onClick={() => setAudienceFilter('nature')}
                  className="font-body"
                  size="sm"
                >
                  Nature Lovers
                </Button>
                <Button 
                  variant={audienceFilter === 'kids' ? 'default' : 'outline'}
                  onClick={() => setAudienceFilter('kids')}
                  className="font-body"
                  size="sm"
                >
                  Kids
                </Button>
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 font-heading">Price Range</h3>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant={priceFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setPriceFilter('all')}
                  className="font-body"
                  size="sm"
                >
                  All Prices
                </Button>
                <Button 
                  variant={priceFilter === 'free' ? 'default' : 'outline'}
                  onClick={() => setPriceFilter('free')}
                  className="font-body"
                  size="sm"
                >
                  Free
                </Button>
                <Button 
                  variant={priceFilter === 'under_500' ? 'default' : 'outline'}
                  onClick={() => setPriceFilter('under_500')}
                  className="font-body"
                  size="sm"
                >
                  Under ₹500
                </Button>
                <Button 
                  variant={priceFilter === '500_1000' ? 'default' : 'outline'}
                  onClick={() => setPriceFilter('500_1000')}
                  className="font-body"
                  size="sm"
                >
                  ₹500 - ₹1000
                </Button>
                <Button 
                  variant={priceFilter === 'above_1000' ? 'default' : 'outline'}
                  onClick={() => setPriceFilter('above_1000')}
                  className="font-body"
                  size="sm"
                >
                  Above ₹1000
                </Button>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(locationFilter !== 'all' || seasonFilter !== 'all' || audienceFilter !== 'all' || priceFilter !== 'all') && (
              <div className="flex items-center gap-3 pt-4 border-t">
                <span className="text-sm text-muted-foreground font-body">Active filters:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocationFilter('all');
                    setSeasonFilter('all');
                    setAudienceFilter('all');
                    setPriceFilter('all');
                  }}
                  className="font-body text-xs h-8"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Results count */}
          <div className="mb-6">
            <p className="text-muted-foreground font-body">
              Showing <span className="font-semibold text-foreground">{filteredActivities.length}</span> {filteredActivities.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground font-body text-lg mb-4">No activities found matching your filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setLocationFilter('all');
                  setSeasonFilter('all');
                  setAudienceFilter('all');
                  setPriceFilter('all');
                }}
                className="font-body"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
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
                      <Button 
                        variant="outline" 
                        className="font-body flex-1 h-10"
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        Learn More
                      </Button>
                      <Button 
                        className="font-body flex-1 h-10"
                        onClick={() => handleAddToStay(activity)}
                        variant={addedActivityIds.includes(activity.id) ? "secondary" : "default"}
                      >
                        {addedActivityIds.includes(activity.id) ? "✓ Added" : <><Plus className="h-4 w-4 mr-2" />Add to Stay</>}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Activities;