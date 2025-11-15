import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CalendarIcon, Users, LayoutGrid, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import GuestSelector from '@/components/GuestSelector';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Navigation from '@/components/Navigation';
import DynamicFooter from '@/components/DynamicFooter';
import CombinedFloating from '@/components/CombinedFloating';
import CategoryCard, { Category } from '@/components/stay/CategoryCard';

import { Filters } from '@/components/stay/CategoryFilters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import SEO from '@/components/SEO';

// Helper function to map room features to category attributes
const mapRoomToCategory = (room: any): Category => {
  const features = room.features || [];
  
  const bedConfigurations = features.filter((f: string) => 
    f.includes('double') || f.includes('bed') || f.includes('loft')
  );
  
  const audiences = [];
  if (room.max_guests >= 2) audiences.push('Couple');
  if (room.max_guests >= 3 || features.some((f: string) => f.includes('family') || f.includes('playground'))) audiences.push('Family with kids');
  if (room.max_guests >= 4) audiences.push('Friends / Group');
  
  let budget: 'Budget' | 'Mid-range' | 'Premium' = 'Budget';
  if (room.base_price >= 4000) budget = 'Premium';
  else if (room.base_price >= 3000) budget = 'Mid-range';
  
  const viewLocations = [];
  if (features.some((f: string) => f.toLowerCase().includes('pool'))) viewLocations.push('Pool view (window)', 'Near pool');
  if (features.some((f: string) => f.toLowerCase().includes('balcony'))) viewLocations.push('Balcony');
  if (features.some((f: string) => f.toLowerCase().includes('highest'))) viewLocations.push('Highest point');
  if (features.some((f: string) => f.toLowerCase().includes('sports'))) viewLocations.push('Near sports courts');
  if (features.some((f: string) => f.toLowerCase().includes('playground'))) viewLocations.push('Near playground');
  if (features.some((f: string) => f.toLowerCase().includes('entrance'))) viewLocations.push('Near entrance');
  if (features.some((f: string) => f.toLowerCase().includes('private') || f.toLowerCase().includes('windowless'))) viewLocations.push('No view / private and snug');
  
  let noise: 'Lively zone' | 'Moderate' | 'Quiet' = 'Moderate';
  if (features.some((f: string) => f.toLowerCase().includes('pool') || f.toLowerCase().includes('sports') || f.toLowerCase().includes('active'))) noise = 'Lively zone';
  else if (features.some((f: string) => f.toLowerCase().includes('private') || f.toLowerCase().includes('quiet') || f.toLowerCase().includes('cave'))) noise = 'Quiet';
  
  const tagline = room.description ? 
    room.description.split('.')[0] : 
    `Comfortable accommodation for up to ${room.max_guests} guests`;

  return {
    id: room.id,
    name: room.name,
    tagline,
    image: room.hero_image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    imageKey: room.hero_image_key,
    maxGuests: room.max_guests,
    bedConfigurations: bedConfigurations.length > 0 ? bedConfigurations : ['Standard bed'],
    audiences: audiences.length > 0 ? audiences : ['Anyone'],
    budget,
    viewLocations: viewLocations.length > 0 ? viewLocations : ['Standard view'],
    features,
    noise,
    basePrice: room.base_price || 0,
  };
};

const SearchAvailability = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [checkIn, setCheckIn] = useState<Date | undefined>(
    searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : undefined
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : undefined
  );
  const [guests, setGuests] = useState<number>(parseInt(searchParams.get('guests') || '2'));
  const [adults, setAdults] = useState<number>(parseInt(searchParams.get('adults') || '2'));
  const [children, setChildren] = useState<number>(parseInt(searchParams.get('children') || '0'));
  const [infants, setInfants] = useState<number>(parseInt(searchParams.get('infants') || '0'));
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [heroImage] = useState('https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState<Filters>({
    guests: null,
    bed: null,
    audience: null,
    budget: null,
    view: null,
    features: [],
    noise: null,
  });

  useEffect(() => {
    if (checkIn && checkOut) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      toast({
        title: "Missing dates",
        description: "Please select check-in and check-out dates",
        variant: "destructive"
      });
      return;
    }

    if (checkIn >= checkOut) {
      toast({
        title: "Invalid dates",
        description: "Check-out must be after check-in",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data: allRooms, error: roomsError } = await supabase
        .from('room_types')
        .select('*')
        .eq('is_published', true)
        .order('name');

      if (roomsError) throw roomsError;

      const mappedCategories = allRooms?.map(mapRoomToCategory) || [];
      setCategories(mappedCategories);

      const params = new URLSearchParams({
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests: guests.toString(),
        adults: adults.toString(),
        children: children.toString(),
        infants: infants.toString()
      });
      setSearchParams(params);

      if (mappedCategories.length === 0) {
        toast({
          title: "No availability",
          description: "No rooms available for the selected dates",
        });
      }
    } catch (error) {
      console.error('Error searching availability:', error);
      toast({
        title: "Error",
        description: "Failed to search availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (filters.guests) {
        const guestFilter = filters.guests;
        let minGuests = 0;
        let maxGuests = 999;
        
        if (guestFilter === '1-2') { minGuests = 1; maxGuests = 2; }
        else if (guestFilter === '3') { minGuests = 3; maxGuests = 3; }
        else if (guestFilter === '4-6') { minGuests = 4; maxGuests = 6; }
        else if (guestFilter === '6+') { minGuests = 6; }
        
        if (category.maxGuests < minGuests || category.maxGuests > maxGuests) return false;
      }

      if (filters.bed && !category.bedConfigurations.some(bed => bed.toLowerCase().includes(filters.bed!.toLowerCase()))) {
        return false;
      }

      if (filters.audience && !category.audiences.includes(filters.audience)) {
        return false;
      }

      if (filters.budget && category.budget !== filters.budget) {
        return false;
      }

      if (filters.view && !category.viewLocations.includes(filters.view)) {
        return false;
      }

      if (filters.features.length > 0) {
        const hasAllFeatures = filters.features.every(feature =>
          category.features.some((f: string) => f.toLowerCase().includes(feature.toLowerCase()))
        );
        if (!hasAllFeatures) return false;
      }

      if (filters.noise && category.noise !== filters.noise) {
        return false;
      }

      return true;
    });
  }, [categories, filters]);

  return (
    <>
      <SEO 
        title="Search Availability - Find Your Perfect Stay"
        description="Search for available accommodations for your dates"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />

        <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
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
              Available Accommodations
            </h1>
            <p className="text-lg md:text-xl font-body opacity-90">
              Perfect rooms for your mountain retreat
            </p>
          </div>
        </section>

        <section className="py-6 bg-muted/30 border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-4">
              <h2 className="text-2xl font-heading font-bold">Search Availability</h2>
              <p className="text-sm text-muted-foreground mt-1">Find available rooms for your dates</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Check-in</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={checkIn} 
                      onSelect={setCheckIn}
                      disabled={(date) => date < new Date()}
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Check-out</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={checkOut} 
                      onSelect={setCheckOut}
                      disabled={(date) => date <= (checkIn || new Date())}
                      initialFocus 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Guests</label>
                <GuestSelector
                  totalGuests={guests}
                  onGuestsChange={(total, a, c, i) => {
                    setGuests(total);
                    setAdults(a);
                    setChildren(c);
                    setInfants(i || 0);
                  }}
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={loading || !checkIn || !checkOut}
                className="h-10"
              >
                {loading ? 'Searching...' : 'Search Availability'}
              </Button>
            </div>
          </div>
        </section>

        {searched && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-6">
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-20 bg-card border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-heading font-semibold">Filters</h3>
                  {(filters.guests || filters.bed || filters.audience || filters.budget || filters.view || filters.features.length > 0 || filters.noise) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({
                        guests: null,
                        bed: null,
                        audience: null,
                        budget: null,
                        view: null,
                        features: [],
                        noise: null,
                      })}
                      className="text-xs h-8"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Guests */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Guests</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant={!filters.guests ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, guests: null })}
                      className="justify-start h-8 text-xs col-span-2"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.guests === '1-2' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, guests: '1-2' })}
                      className="justify-start h-8 text-xs"
                    >
                      1-2
                    </Button>
                    <Button
                      variant={filters.guests === '3' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, guests: '3' })}
                      className="justify-start h-8 text-xs"
                    >
                      3
                    </Button>
                    <Button
                      variant={filters.guests === '4-6' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, guests: '4-6' })}
                      className="justify-start h-8 text-xs"
                    >
                      4-6
                    </Button>
                    <Button
                      variant={filters.guests === '6+' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, guests: '6+' })}
                      className="justify-start h-8 text-xs"
                    >
                      6+
                    </Button>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Budget</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={!filters.budget ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, budget: null })}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.budget === 'Budget' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, budget: 'Budget' })}
                      className="justify-start h-8 text-xs"
                    >
                      Budget
                    </Button>
                    <Button
                      variant={filters.budget === 'Mid-range' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, budget: 'Mid-range' })}
                      className="justify-start h-8 text-xs"
                    >
                      Mid-range
                    </Button>
                    <Button
                      variant={filters.budget === 'Premium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, budget: 'Premium' })}
                      className="justify-start h-8 text-xs"
                    >
                      Premium
                    </Button>
                  </div>
                </div>

                {/* Audience */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Suitable For</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={!filters.audience ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, audience: null })}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.audience === 'Couple' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, audience: 'Couple' })}
                      className="justify-start h-8 text-xs"
                    >
                      Couple
                    </Button>
                    <Button
                      variant={filters.audience === 'Family with kids' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, audience: 'Family with kids' })}
                      className="justify-start h-8 text-xs"
                    >
                      Family with kids
                    </Button>
                    <Button
                      variant={filters.audience === 'Friends / Group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, audience: 'Friends / Group' })}
                      className="justify-start h-8 text-xs"
                    >
                      Friends / Group
                    </Button>
                  </div>
                </div>

                {/* Bed Type */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Bed Configuration</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={!filters.bed ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, bed: null })}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.bed === '1 double' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, bed: '1 double' })}
                      className="justify-start h-8 text-xs"
                    >
                      1 double
                    </Button>
                    <Button
                      variant={filters.bed === '2 doubles' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, bed: '2 doubles' })}
                      className="justify-start h-8 text-xs"
                    >
                      2 doubles
                    </Button>
                    <Button
                      variant={filters.bed === 'double + sofa‑cum‑bed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, bed: 'double + sofa‑cum‑bed' })}
                      className="justify-start h-8 text-xs"
                    >
                      Double + sofa‑bed
                    </Button>
                    <Button
                      variant={filters.bed === 'loft bed present' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, bed: 'loft bed present' })}
                      className="justify-start h-8 text-xs"
                    >
                      Loft bed
                    </Button>
                  </div>
                </div>

                {/* Location/View */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Location & View</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={!filters.view ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: null })}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.view === 'Balcony' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'Balcony' })}
                      className="justify-start h-8 text-xs"
                    >
                      Balcony
                    </Button>
                    <Button
                      variant={filters.view === 'Pool view (window)' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'Pool view (window)' })}
                      className="justify-start h-8 text-xs"
                    >
                      Pool view
                    </Button>
                    <Button
                      variant={filters.view === 'Near pool' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'Near pool' })}
                      className="justify-start h-8 text-xs"
                    >
                      Near pool
                    </Button>
                    <Button
                      variant={filters.view === 'Near playground' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'Near playground' })}
                      className="justify-start h-8 text-xs"
                    >
                      Near playground
                    </Button>
                    <Button
                      variant={filters.view === 'Highest point' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'Highest point' })}
                      className="justify-start h-8 text-xs"
                    >
                      Highest point
                    </Button>
                    <Button
                      variant={filters.view === 'No view / private and snug' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, view: 'No view / private and snug' })}
                      className="justify-start h-8 text-xs"
                    >
                      Private & snug
                    </Button>
                  </div>
                </div>

                {/* Noise Level */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Noise Level</label>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant={!filters.noise ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, noise: null })}
                      className="justify-start h-8 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant={filters.noise === 'Quiet' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, noise: 'Quiet' })}
                      className="justify-start h-8 text-xs"
                    >
                      Quiet
                    </Button>
                    <Button
                      variant={filters.noise === 'Moderate' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, noise: 'Moderate' })}
                      className="justify-start h-8 text-xs"
                    >
                      Moderate
                    </Button>
                    <Button
                      variant={filters.noise === 'Lively zone' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({ ...filters, noise: 'Lively zone' })}
                      className="justify-start h-8 text-xs"
                    >
                      Lively zone
                    </Button>
                  </div>
                </div>
              </div>
            </aside>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                    <h2 className="text-2xl font-heading font-bold">
                      {filteredCategories.length} {filteredCategories.length === 1 ? 'Room Type' : 'Room Types'} Available
                    </h2>
                      {checkIn && checkOut && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')} • {guests} {guests === 1 ? 'Guest' : 'Guests'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="lg:hidden">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80 overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Filters</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4 space-y-4">
                            {/* Same filters as desktop sidebar */}
                            <div className="flex items-center justify-between mb-2">
                              {(filters.guests || filters.bed || filters.audience || filters.budget || filters.view || filters.features.length > 0 || filters.noise) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFilters({
                                    guests: null,
                                    bed: null,
                                    audience: null,
                                    budget: null,
                                    view: null,
                                    features: [],
                                    noise: null,
                                  })}
                                  className="text-xs h-8"
                                >
                                  Clear All
                                </Button>
                              )}
                            </div>

                            {/* Guests */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Guests</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <Button
                                  variant={!filters.guests ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, guests: null })}
                                  className="justify-start h-8 text-xs col-span-2"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.guests === '1-2' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, guests: '1-2' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  1-2
                                </Button>
                                <Button
                                  variant={filters.guests === '3' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, guests: '3' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  3
                                </Button>
                                <Button
                                  variant={filters.guests === '4-6' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, guests: '4-6' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  4-6
                                </Button>
                                <Button
                                  variant={filters.guests === '6+' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, guests: '6+' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  6+
                                </Button>
                              </div>
                            </div>

                            {/* Budget */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Budget</label>
                              <div className="flex flex-col gap-1.5">
                                <Button
                                  variant={!filters.budget ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, budget: null })}
                                  className="justify-start h-8 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.budget === 'Budget' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, budget: 'Budget' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Budget
                                </Button>
                                <Button
                                  variant={filters.budget === 'Mid-range' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, budget: 'Mid-range' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Mid-range
                                </Button>
                                <Button
                                  variant={filters.budget === 'Premium' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, budget: 'Premium' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Premium
                                </Button>
                              </div>
                            </div>

                            {/* Audience */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Suitable For</label>
                              <div className="flex flex-col gap-1.5">
                                <Button
                                  variant={!filters.audience ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, audience: null })}
                                  className="justify-start h-8 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.audience === 'Couple' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, audience: 'Couple' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Couple
                                </Button>
                                <Button
                                  variant={filters.audience === 'Family with kids' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, audience: 'Family with kids' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Family with kids
                                </Button>
                                <Button
                                  variant={filters.audience === 'Friends / Group' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, audience: 'Friends / Group' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Friends / Group
                                </Button>
                              </div>
                            </div>

                            {/* Bed Type */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Bed Configuration</label>
                              <div className="flex flex-col gap-1.5">
                                <Button
                                  variant={!filters.bed ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, bed: null })}
                                  className="justify-start h-8 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.bed === '1 double' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, bed: '1 double' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  1 double
                                </Button>
                                <Button
                                  variant={filters.bed === '2 doubles' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, bed: '2 doubles' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  2 doubles
                                </Button>
                                <Button
                                  variant={filters.bed === 'double + sofa‑cum‑bed' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, bed: 'double + sofa‑cum‑bed' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Double + sofa‑bed
                                </Button>
                                <Button
                                  variant={filters.bed === 'loft bed present' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, bed: 'loft bed present' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Loft bed
                                </Button>
                              </div>
                            </div>

                            {/* Location/View */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Location & View</label>
                              <div className="flex flex-col gap-1.5">
                                <Button
                                  variant={!filters.view ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: null })}
                                  className="justify-start h-8 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.view === 'Balcony' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'Balcony' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Balcony
                                </Button>
                                <Button
                                  variant={filters.view === 'Pool view (window)' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'Pool view (window)' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Pool view
                                </Button>
                                <Button
                                  variant={filters.view === 'Near pool' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'Near pool' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Near pool
                                </Button>
                                <Button
                                  variant={filters.view === 'Near playground' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'Near playground' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Near playground
                                </Button>
                                <Button
                                  variant={filters.view === 'Highest point' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'Highest point' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Highest point
                                </Button>
                                <Button
                                  variant={filters.view === 'No view / private and snug' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, view: 'No view / private and snug' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Private & snug
                                </Button>
                              </div>
                            </div>

                            {/* Noise Level */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Noise Level</label>
                              <div className="flex flex-col gap-1.5">
                                <Button
                                  variant={!filters.noise ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, noise: null })}
                                  className="justify-start h-8 text-xs"
                                >
                                  All
                                </Button>
                                <Button
                                  variant={filters.noise === 'Quiet' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, noise: 'Quiet' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Quiet
                                </Button>
                                <Button
                                  variant={filters.noise === 'Moderate' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, noise: 'Moderate' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Moderate
                                </Button>
                                <Button
                                  variant={filters.noise === 'Lively zone' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setFilters({ ...filters, noise: 'Lively zone' })}
                                  className="justify-start h-8 text-xs"
                                >
                                  Lively zone
                                </Button>
                              </div>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>

                      <div className="hidden md:flex border rounded-lg p-1">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="h-8 px-3"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-8 px-3"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Searching for available rooms...</p>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="text-center py-12 bg-card border rounded-lg">
                      <p className="text-muted-foreground mb-4">
                        No rooms available for the selected criteria
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          guests: null,
                          bed: null,
                          audience: null,
                          budget: null,
                          view: null,
                          features: [],
                          noise: null,
                        })}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' 
                      ? 'grid md:grid-cols-2 gap-6' 
                      : 'flex flex-col gap-6'
                    }>
                       {filteredCategories.map((category) => (
                        <CategoryCard
                          key={category.id}
                          category={category}
                          viewMode={viewMode}
                          checkIn={checkIn}
                          checkOut={checkOut}
                          guests={guests}
                          adults={adults}
                          children={children}
                          onViewDetails={(cat) => navigate(`/stay/${cat.id}`)}
                          onBookNow={(cat) => {
                            const params = new URLSearchParams({
                              checkIn: checkIn!.toISOString().split('T')[0],
                              checkOut: checkOut!.toISOString().split('T')[0],
                              guests: guests.toString(),
                              adults: adults.toString(),
                              children: children.toString(),
                              infants: infants.toString(),
                              roomTypeId: cat.id
                            });
                            navigate(`/booking?${params.toString()}`);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <CombinedFloating />
        <DynamicFooter />
      </div>
    </>
  );
};

export default SearchAvailability;
