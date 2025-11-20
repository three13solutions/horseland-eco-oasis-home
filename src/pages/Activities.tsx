import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloating from '../components/CombinedFloating';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Star, Plus, Grid3x3, List, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [locationFilter, setLocationFilter] = useState<'all' | 'on_property' | 'off_property'>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [activityTagFilter, setActivityTagFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [bookingTypeFilter, setBookingTypeFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
      .select('title, subtitle, hero_image, structured_content')
      .eq('slug', 'activities')
      .single();
    
    if (data) {
      setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
      if (data.hero_image) setHeroImage(data.hero_image);
      
      // Load filter visibility setting
      if (data.structured_content && typeof data.structured_content === 'object') {
        const settings = data.structured_content as any;
        if (settings.show_filters !== undefined) {
          setShowFilters(settings.show_filters);
        }
      }
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
    
    // Activity Tags filter
    if (activityTagFilter !== 'all') {
      const activityTags = (activity as any).activity_tags || [];
      if (!activityTags.includes(activityTagFilter)) return false;
    }
    
    // Available Days filter
    if (daysFilter !== 'all') {
      const availableDays = (activity as any).available_days || [];
      if (daysFilter === 'weekdays') {
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (!weekdays.some(day => availableDays.includes(day))) return false;
      } else if (daysFilter === 'weekends') {
        if (!availableDays.includes('saturday') && !availableDays.includes('sunday')) return false;
      } else {
        // Specific day filter
        if (!availableDays.includes(daysFilter)) return false;
      }
    }
    
    // Booking Type filter
    if (bookingTypeFilter !== 'all') {
      const bookingType = (activity as any).booking_type;
      if (bookingType !== bookingTypeFilter) return false;
    }
    
    // Duration filter
    if (durationFilter !== 'all') {
      const hours = (activity as any).duration_hours || 0;
      const minutes = (activity as any).duration_minutes || 0;
      const totalMinutes = hours * 60 + minutes;
      
      if (durationFilter === 'quick' && totalMinutes > 60) return false; // Under 1 hour
      if (durationFilter === 'medium' && (totalMinutes < 60 || totalMinutes > 180)) return false; // 1-3 hours
      if (durationFilter === 'long' && totalMinutes <= 180) return false; // Over 3 hours
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
        <Navigation />
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
            {title}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            {subtitle}
          </p>
        </div>
      </section>

      {/* Main Content Section with Sidebar */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            {showFilters && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-20 bg-card border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-heading font-semibold">Filters</h3>
                  {(locationFilter !== 'all' || seasonFilter !== 'all' || audienceFilter !== 'all' || priceFilter !== 'all' || activityTagFilter !== 'all' || daysFilter !== 'all' || bookingTypeFilter !== 'all' || durationFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLocationFilter('all');
                        setSeasonFilter('all');
                        setAudienceFilter('all');
                        setPriceFilter('all');
                        setActivityTagFilter('all');
                        setDaysFilter('all');
                        setBookingTypeFilter('all');
                        setDurationFilter('all');
                      }}
                      className="text-xs h-8"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Location Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Location</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={locationFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLocationFilter('all')}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={locationFilter === 'on_property' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLocationFilter('on_property')}
                      className="justify-start h-8 text-xs"
                    >
                      On Property
                    </Button>
                    <Button
                      variant={locationFilter === 'off_property' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLocationFilter('off_property')}
                      className="justify-start h-8 text-xs"
                    >
                      Off Property
                    </Button>
                  </div>
                </div>

                {/* Season Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Season</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant={seasonFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeasonFilter('all')}
                      className="justify-start h-8 text-xs col-span-2"
                    >
                      All
                    </Button>
                    <Button
                      variant={seasonFilter === 'monsoon' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeasonFilter('monsoon')}
                      className="justify-start h-8 text-xs"
                    >
                      Monsoon
                    </Button>
                    <Button
                      variant={seasonFilter === 'winter' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeasonFilter('winter')}
                      className="justify-start h-8 text-xs"
                    >
                      Winter
                    </Button>
                    <Button
                      variant={seasonFilter === 'spring' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeasonFilter('spring')}
                      className="justify-start h-8 text-xs"
                    >
                      Spring
                    </Button>
                    <Button
                      variant={seasonFilter === 'summer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeasonFilter('summer')}
                      className="justify-start h-8 text-xs"
                    >
                      Summer
                    </Button>
                  </div>
                </div>

                {/* Audience Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Suitable For</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant={audienceFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('all')}
                      className="justify-start col-span-2 h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={audienceFilter === 'families' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('families')}
                      className="justify-start h-8 text-xs"
                    >
                      Families
                    </Button>
                    <Button
                      variant={audienceFilter === 'couples' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('couples')}
                      className="justify-start h-8 text-xs"
                    >
                      Couples
                    </Button>
                    <Button
                      variant={audienceFilter === 'kids' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('kids')}
                      className="justify-start h-8 text-xs"
                    >
                      Kids
                    </Button>
                    <Button
                      variant={audienceFilter === 'adults' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('adults')}
                      className="justify-start h-8 text-xs"
                    >
                      Adults
                    </Button>
                    <Button
                      variant={audienceFilter === 'teens' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('teens')}
                      className="justify-start h-8 text-xs"
                    >
                      Teens
                    </Button>
                    <Button
                      variant={audienceFilter === 'groups' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('groups')}
                      className="justify-start h-8 text-xs"
                    >
                      Groups
                    </Button>
                    <Button
                      variant={audienceFilter === 'seniors' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('seniors')}
                      className="justify-start h-8 text-xs"
                    >
                      Seniors
                    </Button>
                    <Button
                      variant={audienceFilter === 'solo' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAudienceFilter('solo')}
                      className="justify-start h-8 text-xs"
                    >
                      Solo
                    </Button>
                  </div>
                </div>

                {/* Price Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Price Range</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={priceFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPriceFilter('all')}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={priceFilter === 'free' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPriceFilter('free')}
                      className="justify-start h-8 text-xs"
                    >
                      Free
                    </Button>
                    <Button
                      variant={priceFilter === 'under_500' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPriceFilter('under_500')}
                      className="justify-start h-8 text-xs"
                    >
                      Under ₹500
                    </Button>
                    <Button
                      variant={priceFilter === '500_1000' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPriceFilter('500_1000')}
                      className="justify-start h-8 text-xs"
                    >
                      ₹500 - ₹1000
                    </Button>
                    <Button
                      variant={priceFilter === 'above_1000' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPriceFilter('above_1000')}
                      className="justify-start h-8 text-xs"
                    >
                      Above ₹1000
                    </Button>
                  </div>
                </div>

                {/* Activity Type Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Activity Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant={activityTagFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('all')}
                      className="justify-start col-span-2 h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={activityTagFilter === 'adventure' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('adventure')}
                      className="justify-start h-8 text-xs"
                    >
                      Adventure
                    </Button>
                    <Button
                      variant={activityTagFilter === 'relaxing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('relaxing')}
                      className="justify-start h-8 text-xs"
                    >
                      Relaxing
                    </Button>
                    <Button
                      variant={activityTagFilter === 'cultural' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('cultural')}
                      className="justify-start h-8 text-xs"
                    >
                      Cultural
                    </Button>
                    <Button
                      variant={activityTagFilter === 'sports' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('sports')}
                      className="justify-start h-8 text-xs"
                    >
                      Sports
                    </Button>
                    <Button
                      variant={activityTagFilter === 'nature' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('nature')}
                      className="justify-start h-8 text-xs"
                    >
                      Nature
                    </Button>
                    <Button
                      variant={activityTagFilter === 'indoor' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('indoor')}
                      className="justify-start h-8 text-xs"
                    >
                      Indoor
                    </Button>
                    <Button
                      variant={activityTagFilter === 'outdoor' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('outdoor')}
                      className="justify-start h-8 text-xs"
                    >
                      Outdoor
                    </Button>
                    <Button
                      variant={activityTagFilter === 'educational' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActivityTagFilter('educational')}
                      className="justify-start h-8 text-xs"
                    >
                      Educational
                    </Button>
                  </div>
                </div>

                {/* Days Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Available Days</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={daysFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDaysFilter('all')}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={daysFilter === 'weekdays' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDaysFilter('weekdays')}
                      className="justify-start h-8 text-xs"
                    >
                      Weekdays
                    </Button>
                    <Button
                      variant={daysFilter === 'weekends' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDaysFilter('weekends')}
                      className="justify-start h-8 text-xs"
                    >
                      Weekends
                    </Button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant={daysFilter === 'monday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('monday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        M
                      </Button>
                      <Button
                        variant={daysFilter === 'tuesday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('tuesday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        T
                      </Button>
                      <Button
                        variant={daysFilter === 'wednesday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('wednesday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        W
                      </Button>
                      <Button
                        variant={daysFilter === 'thursday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('thursday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        Th
                      </Button>
                      <Button
                        variant={daysFilter === 'friday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('friday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        F
                      </Button>
                      <Button
                        variant={daysFilter === 'saturday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('saturday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        S
                      </Button>
                      <Button
                        variant={daysFilter === 'sunday' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('sunday')}
                        className="justify-center h-8 text-xs px-2"
                      >
                        Su
                      </Button>
                    </div>
                  </div>
                </div>

                {/* By Booking Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">By Booking</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={bookingTypeFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('all')}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={bookingTypeFilter === 'reception' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('reception')}
                      className="justify-start h-8 text-xs"
                    >
                      At Reception
                    </Button>
                    <Button
                      variant={bookingTypeFilter === 'online' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('online')}
                      className="justify-start h-8 text-xs"
                    >
                      Online
                    </Button>
                    <Button
                      variant={bookingTypeFilter === 'both' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('both')}
                      className="justify-start h-8 text-xs"
                    >
                      Both
                    </Button>
                    <Button
                      variant={bookingTypeFilter === 'third_party' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('third_party')}
                      className="justify-start h-8 text-xs"
                    >
                      Third Party
                    </Button>
                    <Button
                      variant={bookingTypeFilter === 'no_booking' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBookingTypeFilter('no_booking')}
                      className="justify-start h-8 text-xs"
                    >
                      No Booking
                    </Button>
                  </div>
                </div>

                {/* Duration Group */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Duration</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={durationFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDurationFilter('all')}
                      className="justify-start h-8 text-xs"
                    >
                      Any
                    </Button>
                    <Button
                      variant={durationFilter === 'quick' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDurationFilter('quick')}
                      className="justify-start h-8 text-xs"
                    >
                      &lt; 1hr
                    </Button>
                    <Button
                      variant={durationFilter === 'medium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDurationFilter('medium')}
                      className="justify-start h-8 text-xs"
                    >
                      1-3hrs
                    </Button>
                    <Button
                      variant={durationFilter === 'long' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDurationFilter('long')}
                      className="justify-start h-8 text-xs"
                    >
                      &gt; 3hrs
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
            )}

            {/* Mobile Filter Sheet */}
            {showFilters && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="lg:hidden fixed bottom-20 left-4 z-50 shadow-lg"
                  size="lg"
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {(locationFilter !== 'all' || seasonFilter !== 'all' || audienceFilter !== 'all' || priceFilter !== 'all' || activityTagFilter !== 'all' || daysFilter !== 'all' || bookingTypeFilter !== 'all' || durationFilter !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocationFilter('all');
                        setSeasonFilter('all');
                        setAudienceFilter('all');
                        setPriceFilter('all');
                        setActivityTagFilter('all');
                        setDaysFilter('all');
                        setBookingTypeFilter('all');
                        setDurationFilter('all');
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  )}

                  {/* Same filter groups as desktop */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block">Location</label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={locationFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocationFilter('all')}
                        className="justify-start"
                      >
                        All Locations
                      </Button>
                      <Button
                        variant={locationFilter === 'on_property' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocationFilter('on_property')}
                        className="justify-start"
                      >
                        On Property
                      </Button>
                      <Button
                        variant={locationFilter === 'off_property' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocationFilter('off_property')}
                        className="justify-start"
                      >
                        Off Property
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Season</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={seasonFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeasonFilter('all')}
                        className="justify-start"
                      >
                        All Seasons
                      </Button>
                      <Button
                        variant={seasonFilter === 'monsoon' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeasonFilter('monsoon')}
                        className="justify-start"
                      >
                        Monsoon
                      </Button>
                      <Button
                        variant={seasonFilter === 'winter' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeasonFilter('winter')}
                        className="justify-start"
                      >
                        Winter
                      </Button>
                      <Button
                        variant={seasonFilter === 'spring' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeasonFilter('spring')}
                        className="justify-start"
                      >
                        Spring
                      </Button>
                      <Button
                        variant={seasonFilter === 'summer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeasonFilter('summer')}
                        className="justify-start"
                      >
                        Summer
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Suitable For</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={audienceFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('all')}
                        className="justify-start col-span-2"
                      >
                        Everyone
                      </Button>
                      <Button
                        variant={audienceFilter === 'families' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('families')}
                        className="justify-start"
                      >
                        Families
                      </Button>
                      <Button
                        variant={audienceFilter === 'couples' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('couples')}
                        className="justify-start"
                      >
                        Couples
                      </Button>
                      <Button
                        variant={audienceFilter === 'kids' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('kids')}
                        className="justify-start"
                      >
                        Kids
                      </Button>
                      <Button
                        variant={audienceFilter === 'adults' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('adults')}
                        className="justify-start"
                      >
                        Adults
                      </Button>
                      <Button
                        variant={audienceFilter === 'teens' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('teens')}
                        className="justify-start"
                      >
                        Teens
                      </Button>
                      <Button
                        variant={audienceFilter === 'groups' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('groups')}
                        className="justify-start"
                      >
                        Groups
                      </Button>
                      <Button
                        variant={audienceFilter === 'seniors' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('seniors')}
                        className="justify-start"
                      >
                        Seniors
                      </Button>
                      <Button
                        variant={audienceFilter === 'solo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAudienceFilter('solo')}
                        className="justify-start"
                      >
                        Solo
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Price Range</label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={priceFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceFilter('all')}
                        className="justify-start"
                      >
                        All Prices
                      </Button>
                      <Button
                        variant={priceFilter === 'free' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceFilter('free')}
                        className="justify-start"
                      >
                        Free
                      </Button>
                      <Button
                        variant={priceFilter === 'under_500' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceFilter('under_500')}
                        className="justify-start"
                      >
                        Under ₹500
                      </Button>
                      <Button
                        variant={priceFilter === '500_1000' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceFilter('500_1000')}
                        className="justify-start"
                      >
                        ₹500 - ₹1000
                      </Button>
                      <Button
                        variant={priceFilter === 'above_1000' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPriceFilter('above_1000')}
                        className="justify-start"
                      >
                        Above ₹1000
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Activity Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={activityTagFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('all')}
                        className="justify-start col-span-2"
                      >
                        All Types
                      </Button>
                      <Button
                        variant={activityTagFilter === 'adventure' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('adventure')}
                        className="justify-start"
                      >
                        Adventure
                      </Button>
                      <Button
                        variant={activityTagFilter === 'relaxing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('relaxing')}
                        className="justify-start"
                      >
                        Relaxing
                      </Button>
                      <Button
                        variant={activityTagFilter === 'cultural' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('cultural')}
                        className="justify-start"
                      >
                        Cultural
                      </Button>
                      <Button
                        variant={activityTagFilter === 'sports' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('sports')}
                        className="justify-start"
                      >
                        Sports
                      </Button>
                      <Button
                        variant={activityTagFilter === 'nature' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('nature')}
                        className="justify-start"
                      >
                        Nature
                      </Button>
                      <Button
                        variant={activityTagFilter === 'indoor' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('indoor')}
                        className="justify-start"
                      >
                        Indoor
                      </Button>
                      <Button
                        variant={activityTagFilter === 'outdoor' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('outdoor')}
                        className="justify-start"
                      >
                        Outdoor
                      </Button>
                      <Button
                        variant={activityTagFilter === 'educational' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActivityTagFilter('educational')}
                        className="justify-start"
                      >
                        Educational
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Available Days</label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={daysFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('all')}
                        className="justify-start"
                      >
                        All Days
                      </Button>
                      <Button
                        variant={daysFilter === 'weekdays' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('weekdays')}
                        className="justify-start"
                      >
                        Weekdays
                      </Button>
                      <Button
                        variant={daysFilter === 'weekends' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDaysFilter('weekends')}
                        className="justify-start"
                      >
                        Weekends
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={daysFilter === 'monday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('monday')}
                          className="justify-start"
                        >
                          Mon
                        </Button>
                        <Button
                          variant={daysFilter === 'tuesday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('tuesday')}
                          className="justify-start"
                        >
                          Tue
                        </Button>
                        <Button
                          variant={daysFilter === 'wednesday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('wednesday')}
                          className="justify-start"
                        >
                          Wed
                        </Button>
                        <Button
                          variant={daysFilter === 'thursday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('thursday')}
                          className="justify-start"
                        >
                          Thu
                        </Button>
                        <Button
                          variant={daysFilter === 'friday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('friday')}
                          className="justify-start"
                        >
                          Fri
                        </Button>
                        <Button
                          variant={daysFilter === 'saturday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('saturday')}
                          className="justify-start"
                        >
                          Sat
                        </Button>
                        <Button
                          variant={daysFilter === 'sunday' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setDaysFilter('sunday')}
                          className="justify-start"
                        >
                          Sun
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">By Booking</label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={bookingTypeFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('all')}
                        className="justify-start"
                      >
                        All Methods
                      </Button>
                      <Button
                        variant={bookingTypeFilter === 'reception' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('reception')}
                        className="justify-start"
                      >
                        At Reception
                      </Button>
                      <Button
                        variant={bookingTypeFilter === 'online' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('online')}
                        className="justify-start"
                      >
                        Online
                      </Button>
                      <Button
                        variant={bookingTypeFilter === 'both' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('both')}
                        className="justify-start"
                      >
                        Both
                      </Button>
                      <Button
                        variant={bookingTypeFilter === 'third_party' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('third_party')}
                        className="justify-start"
                      >
                        Third Party
                      </Button>
                      <Button
                        variant={bookingTypeFilter === 'no_booking' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBookingTypeFilter('no_booking')}
                        className="justify-start"
                      >
                        No Booking
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-3 block">Duration</label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={durationFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDurationFilter('all')}
                        className="justify-start"
                      >
                        Any Duration
                      </Button>
                      <Button
                        variant={durationFilter === 'quick' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDurationFilter('quick')}
                        className="justify-start"
                      >
                        Quick (&lt; 1 hour)
                      </Button>
                      <Button
                        variant={durationFilter === 'medium' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDurationFilter('medium')}
                        className="justify-start"
                      >
                        Medium (1-3 hours)
                      </Button>
                      <Button
                        variant={durationFilter === 'long' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDurationFilter('long')}
                        className="justify-start"
                      >
                        Long (&gt; 3 hours)
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Header with Results count and View Toggle */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground font-body">
                  Showing <span className="font-semibold text-foreground">{filteredActivities.length}</span> {filteredActivities.length === 1 ? 'activity' : 'activities'}
                </p>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="gap-2"
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-2"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </Button>
                </div>
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
                      setActivityTagFilter('all');
                      setDaysFilter('all');
                      setBookingTypeFilter('all');
                      setDurationFilter('all');
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
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        <Badge 
                          className="absolute top-3 left-3 bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={() => navigate(`/activities/${activity.id}`)}
                        >
                          Learn More
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
                                <Badge 
                                  className="ml-2 bg-primary text-primary-foreground whitespace-nowrap cursor-pointer hover:bg-primary/90 transition-colors"
                                  onClick={() => navigate(`/activities/${activity.id}`)}
                                >
                                  Learn More
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
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default Activities;