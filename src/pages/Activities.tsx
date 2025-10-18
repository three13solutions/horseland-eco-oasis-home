import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Star, Plus, Grid3x3, List, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
    
    // Season filter - check available_seasons array
    if (seasonFilter !== 'all') {
      const seasons = (activity as any).available_seasons || [];
      // Handle "all season" as matching any season filter
      if (!seasons.includes(seasonFilter) && !seasons.includes('all season')) return false;
    }
    
    // Audience filter - check audience_tags array
    if (audienceFilter !== 'all') {
      const audiences = (activity as any).audience_tags || [];
      if (!audiences.includes(audienceFilter)) return false;
    }
    
    // Price filter - handle different price types
    if (priceFilter !== 'all') {
      const priceType = (activity as any).price_type;
      const priceAmount = activity.price_amount;
      const priceMin = (activity as any).price_range_min;
      const priceMax = (activity as any).price_range_max;
      
      if (priceFilter === 'free') {
        if (priceType !== 'free') return false;
      } else if (priceFilter === 'under_500') {
        if (priceType === 'free') return true; // Free activities pass
        if (priceType === 'fixed' && (!priceAmount || priceAmount >= 500)) return false;
        if (priceType === 'range' && (!priceMin || priceMin >= 500)) return false;
      } else if (priceFilter === '500_1000') {
        if (priceType === 'free') return false;
        if (priceType === 'fixed' && (!priceAmount || priceAmount < 500 || priceAmount > 1000)) return false;
        if (priceType === 'range') {
          // Check if range overlaps with 500-1000
          if (!priceMin || !priceMax || priceMax < 500 || priceMin > 1000) return false;
        }
      } else if (priceFilter === 'above_1000') {
        if (priceType === 'free') return false;
        if (priceType === 'fixed' && (!priceAmount || priceAmount <= 1000)) return false;
        if (priceType === 'range' && (!priceMin || priceMin <= 1000)) return false;
      }
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
      <section className="py-6 bg-muted/30 border-b sticky top-16 z-40 backdrop-blur-sm bg-background/95">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filters Label */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground font-heading">Filters:</span>
            </div>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={(value) => setLocationFilter(value as any)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="on_property">On Property</SelectItem>
                <SelectItem value="off_property">Off Property</SelectItem>
              </SelectContent>
            </Select>

            {/* Season Filter */}
            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Seasons</SelectItem>
                <SelectItem value="monsoon">Monsoon</SelectItem>
                <SelectItem value="winter">Winter</SelectItem>
                <SelectItem value="spring">Spring</SelectItem>
                <SelectItem value="summer">Summer</SelectItem>
              </SelectContent>
            </Select>

            {/* Audience Filter */}
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Suitable For" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="families">Families</SelectItem>
                <SelectItem value="couples">Couples</SelectItem>
                <SelectItem value="kids">Kids</SelectItem>
                <SelectItem value="adults">Adults</SelectItem>
                <SelectItem value="teens">Teens</SelectItem>
                <SelectItem value="groups">Groups</SelectItem>
                <SelectItem value="seniors">Seniors</SelectItem>
                <SelectItem value="solo">Solo Travelers</SelectItem>
              </SelectContent>
            </Select>

            {/* Price Filter */}
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="under_500">Under ₹500</SelectItem>
                <SelectItem value="500_1000">₹500 - ₹1000</SelectItem>
                <SelectItem value="above_1000">Above ₹1000</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(locationFilter !== 'all' || seasonFilter !== 'all' || audienceFilter !== 'all' || priceFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocationFilter('all');
                  setSeasonFilter('all');
                  setAudienceFilter('all');
                  setPriceFilter('all');
                }}
                className="font-body text-xs"
              >
                Clear All
              </Button>
            )}

            {/* View Mode Toggle - Push to right */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Activities Grid/List */}
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
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
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
                        <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed line-clamp-2">
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

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col md:flex-row">
                        <div className="relative md:w-64 h-48 md:h-auto flex-shrink-0">
                          <MediaAsset
                            hardcodedKey={activity.image_key || ''}
                            fallbackUrl={activity.image || 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                          <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            4.5
                          </Badge>
                        </div>
                        
                        <div className="flex-1 p-6">
                          <div className="flex flex-col h-full">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-2xl font-heading font-semibold">{activity.title}</h3>
                                <Badge className="ml-2 bg-primary text-primary-foreground whitespace-nowrap">
                                  Book Now
                                </Badge>
                              </div>
                              
                              <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed line-clamp-2">
                                {activity.description || 'An exciting activity to enhance your stay at Matheran.'}
                              </p>
                              
                              <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
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
                            </div>

                            <div className="flex gap-2 mt-auto">
                              <Button 
                                variant="outline" 
                                className="font-body h-10"
                                onClick={() => navigate(`/activities/${activity.id}`)}
                              >
                                Learn More
                              </Button>
                              <Button 
                                className="font-body h-10"
                                onClick={() => handleAddToStay(activity)}
                                variant={addedActivityIds.includes(activity.id) ? "secondary" : "default"}
                              >
                                {addedActivityIds.includes(activity.id) ? "✓ Added" : <><Plus className="h-4 w-4 mr-2" />Add to Stay</>}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Activities;