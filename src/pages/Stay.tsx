import React, { useMemo, useState } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import CategoryFilters, { Filters } from '@/components/stay/CategoryFilters';
import CategoryCard, { Category } from '@/components/stay/CategoryCard';
import CategoryBookingModal from '@/components/stay/CategoryBookingModal';

const Stay = () => {
  // New category-first experience
  const categories: Category[] = [
    {
      id: 'cave-hideouts',
      name: 'Cave Hideouts',
      tagline: 'Naturally cool rooms tucked below ground',
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
      maxGuests: 3,
      bedConfigurations: ['1 double', 'double + sofa‑cum‑bed'],
      audiences: ['Couple', 'Family with kids', 'Friends / Group'],
      budget: 'Budget',
      viewLocations: ['No view / private and snug', 'Near entrance'],
      features: ['Basement/cave style', 'Windowless/private', 'Air‑conditioned'],
      noise: 'Quiet',
    },
    {
      id: 'bamboo-heights',
      name: 'Bamboo Heights Cabins',
      tagline: 'Cozy cabins with elevated views',
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80',
      maxGuests: 4,
      bedConfigurations: ['2 doubles'],
      audiences: ['Family with kids', 'Friends / Group'],
      budget: 'Mid-range',
      viewLocations: ['Balcony', 'Highest point'],
      features: ['Cabin/cottage style', 'Air‑conditioned', 'Interconnected'],
      noise: 'Moderate',
    },
    {
      id: 'pool-deck',
      name: 'Pool Deck Rooms',
      tagline: 'Steps from a refreshing dip',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
      maxGuests: 3,
      bedConfigurations: ['1 double', 'double + sofa‑cum‑bed'],
      audiences: ['Couple', 'Family with kids'],
      budget: 'Mid-range',
      viewLocations: ['Near pool', 'Pool view (window)'],
      features: ['Air‑conditioned'],
      noise: 'Lively zone',
    },
    {
      id: 'balcony-bliss',
      name: 'Balcony Bliss',
      tagline: 'Open-air balconies for fresh forest breezes',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      maxGuests: 3,
      bedConfigurations: ['1 double'],
      audiences: ['Couple'],
      budget: 'Premium',
      viewLocations: ['Balcony', 'Highest point'],
      features: ['Air‑conditioned'],
      noise: 'Moderate',
    },
    {
      id: 'loftscapes',
      name: 'Loftscapes Rooms',
      tagline: 'Smart loft layouts with extra sleeping space',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
      maxGuests: 5,
      bedConfigurations: ['loft bed present', '2 doubles'],
      audiences: ['Family with kids', 'Friends / Group'],
      budget: 'Mid-range',
      viewLocations: ['Balcony'],
      features: ['Loft layout', 'Interconnected', 'Air‑conditioned'],
      noise: 'Moderate',
    },
    {
      id: 'poolside-peeks',
      name: 'Poolside Peeks',
      tagline: 'Cheerful rooms close to pool fun',
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
      maxGuests: 4,
      bedConfigurations: ['2 doubles'],
      audiences: ['Friends / Group', 'Family with kids'],
      budget: 'Budget',
      viewLocations: ['Near pool', 'Pool view (window)'],
      features: ['Air‑conditioned'],
      noise: 'Lively zone',
    },
    {
      id: 'plateau-pods',
      name: 'Plateau Pods',
      tagline: 'Calm, elevated pods with privacy',
      image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80',
      maxGuests: 2,
      bedConfigurations: ['1 double'],
      audiences: ['Couple'],
      budget: 'Budget',
      viewLocations: ['Highest point'],
      features: ['Non‑AC', 'Windowless/private'],
      noise: 'Quiet',
    },
    {
      id: 'courtside-quarters',
      name: 'Courtside Quarters',
      tagline: 'Stay by the action near sports courts',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
      maxGuests: 4,
      bedConfigurations: ['2 doubles'],
      audiences: ['Friends / Group', 'Family with kids'],
      budget: 'Budget',
      viewLocations: ['Near sports courts'],
      features: ['Air‑conditioned'],
      noise: 'Lively zone',
    },
    {
      id: 'playside-nooks',
      name: 'Playside Nooks',
      tagline: 'Family-friendly spaces near the playground',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
      maxGuests: 4,
      bedConfigurations: ['double + sofa‑cum‑bed'],
      audiences: ['Family with kids'],
      budget: 'Budget',
      viewLocations: ['Near playground', 'Near entrance'],
      features: ['Air‑conditioned', 'Interconnected'],
      noise: 'Moderate',
    },
  ];

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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Your Mountain Retreat Awaits
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Choose from our thoughtfully designed rooms and suites
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onViewDetails={(c) => {
                  // View Details is now handled by Link in CategoryCard
                }}
                onBookNow={(c) => {
                  setSelectedCategory(c);
                  setBookingOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <CategoryBookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        category={selectedCategory}
      />

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default Stay;