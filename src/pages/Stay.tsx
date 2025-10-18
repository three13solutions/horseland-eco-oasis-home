import React, { useMemo, useState, useEffect } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Filters } from '@/components/stay/CategoryFilters';
import CategoryCard, { Category } from '@/components/stay/CategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// Helper function to map room features to category attributes
const mapRoomToCategory = (room: any): Category => {
  const features = room.features || [];
  
  // Extract bed configurations from features
  const bedConfigurations = features.filter((f: string) => 
    f.includes('double') || f.includes('bed') || f.includes('loft')
  );
  
  // Determine audiences based on max guests and features
  const audiences = [];
  if (room.max_guests >= 2) audiences.push('Couple');
  if (room.max_guests >= 3 || features.some((f: string) => f.includes('family') || f.includes('playground'))) audiences.push('Family with kids');
  if (room.max_guests >= 4) audiences.push('Friends / Group');
  
  // Determine budget category based on price
  let budget: 'Budget' | 'Mid-range' | 'Premium' = 'Budget';
  if (room.base_price >= 4000) budget = 'Premium';
  else if (room.base_price >= 3000) budget = 'Mid-range';
  
  // Extract view locations from features and name
  const viewLocations = [];
  if (features.some((f: string) => f.toLowerCase().includes('pool'))) viewLocations.push('Pool view (window)', 'Near pool');
  if (features.some((f: string) => f.toLowerCase().includes('balcony'))) viewLocations.push('Balcony');
  if (features.some((f: string) => f.toLowerCase().includes('highest'))) viewLocations.push('Highest point');
  if (features.some((f: string) => f.toLowerCase().includes('sports'))) viewLocations.push('Near sports courts');
  if (features.some((f: string) => f.toLowerCase().includes('playground'))) viewLocations.push('Near playground');
  if (features.some((f: string) => f.toLowerCase().includes('entrance'))) viewLocations.push('Near entrance');
  if (features.some((f: string) => f.toLowerCase().includes('private') || f.toLowerCase().includes('windowless'))) viewLocations.push('No view / private and snug');
  
  // Determine noise level
  let noise: 'Lively zone' | 'Moderate' | 'Quiet' = 'Moderate';
  if (features.some((f: string) => f.toLowerCase().includes('pool') || f.toLowerCase().includes('sports') || f.toLowerCase().includes('active'))) noise = 'Lively zone';
  else if (features.some((f: string) => f.toLowerCase().includes('private') || f.toLowerCase().includes('quiet') || f.toLowerCase().includes('cave'))) noise = 'Quiet';
  
  // Create tagline from description or generate one
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

const Stay = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = useState('Your Mountain Retreat Awaits');
  const [heroSubtitle, setHeroSubtitle] = useState('Choose from our thoughtfully designed rooms and suites');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    guests: null,
    bed: null,
    audience: null,
    budget: null,
    view: null,
    features: [],
    noise: null,
  });

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Load room types from database
  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('room_types')
          .select('*')
          .eq('is_published', true)
          .order('name');

        if (error) {
          console.error('Error loading room types:', error);
          return;
        }

        const mappedCategories = data.map(mapRoomToCategory);
        setCategories(mappedCategories);
      } catch (error) {
        console.error('Error loading room types:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoomTypes();
  }, []);

  // Load hero data from pages table
  useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase
        .from('pages')
        .select('title, subtitle, hero_image')
        .eq('slug', 'stay')
        .single();
      
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_image) setHeroImage(data.hero_image);
      }
    };
    
    fetchPageData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (filters.guests) {
        const g = filters.guests;
        if (g === '1-2' && c.maxGuests < 2) return false;
        if (g === '3' && c.maxGuests < 3) return false;
        if (g === '4-6' && c.maxGuests < 4) return false;
        if (g === '6+' && c.maxGuests < 6) return false;
      }
      if (filters.bed && !c.bedConfigurations.includes(filters.bed)) return false;
      if (filters.audience && !c.audiences.includes(filters.audience)) return false;
      if (filters.budget && c.budget !== filters.budget) return false;
      if (filters.view && !c.viewLocations.includes(filters.view)) return false;
      if (filters.features.length > 0 && !filters.features.every((f) => c.features.includes(f))) return false;
      if (filters.noise && c.noise !== filters.noise) return false;
      return true;
    });
  }, [categories, filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room categories...</p>
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
            {heroTitle}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Main Content Section with Sidebar */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
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

            {/* Mobile Filter Sheet */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="lg:hidden fixed bottom-20 right-4 z-40 shadow-lg gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Same filter content as desktop sidebar */}
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

            {/* Main Content */}
            <div className="flex-1">
              {/* Header with View Toggle */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-heading font-bold">
                  {filteredCategories.length} {filteredCategories.length === 1 ? 'Room' : 'Rooms'} Available
                </h2>
                <div className="inline-flex rounded-lg border border-border bg-background p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="gap-2"
                  >
                    <List className="w-4 h-4" />
                    List
                  </Button>
                </div>
              </div>

              {/* Dynamic Layout */}
              <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-6' : 'flex flex-col gap-6'}>
                {filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    viewMode={viewMode}
                    onViewDetails={() => {}}
                    onBookNow={() => {}}
                  />
                ))}
              </div>

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No rooms match your filters</p>
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
                    Clear all filters
                  </Button>
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

export default Stay;