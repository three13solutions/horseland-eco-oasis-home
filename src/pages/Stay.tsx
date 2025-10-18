import React, { useMemo, useState, useEffect } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import CategoryFilters, { Filters } from '@/components/stay/CategoryFilters';
import CategoryCard, { Category } from '@/components/stay/CategoryCard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';

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

      {/* Filters */}
      <section className="py-8 bg-muted/30">
        <CategoryFilters filters={filters} setFilters={setFilters} />
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* View Toggle */}
          <div className="flex justify-end mb-6">
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
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-8' : 'flex flex-col gap-6'}>
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
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Stay;