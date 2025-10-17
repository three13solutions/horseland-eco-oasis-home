import React, { useState, useEffect } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Building, Sparkles, TreePine, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Packages = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = useState('Curated Stay Packages');
  const [heroSubtitle, setHeroSubtitle] = useState('Choose the perfect mountain escape designed for your unique needs');

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase.from('pages').select('title, subtitle, hero_image').eq('slug', 'packages').single();
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_image) setHeroImage(data.hero_image);
      }
    };
    fetchPageData();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback packages for empty state
  const fallbackPackages = [
    {
      id: 'family-package',
      name: 'Family Adventure Package',
      icon: Users,
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '3 Days / 2 Nights',
      price: '₹18,500',
      originalPrice: '₹22,000',
      description: 'Perfect for families with children, including kid-friendly activities and spacious accommodations.',
      highlights: [
        'Family Suite accommodation',
        'Horse riding for all ages',
        'Nature walks & bird watching',
        'Bonfire with storytelling',
        'Complimentary breakfast & dinner',
        'Kids activity kit'
      ],
      includes: 'Accommodation, meals, guided activities, welcome drinks',
      bestFor: 'Families with children aged 5+'
    },
    {
      id: 'couple-package',
      name: 'Romantic Getaway',
      icon: Heart,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '2 Days / 1 Night',
      price: '₹15,000',
      originalPrice: '₹18,500',
      description: 'Intimate escape designed for couples seeking romance and tranquility in the mountains.',
      highlights: [
        'Private cottage with valley view',
        'Couples spa treatment',
        'Candlelight dinner',
        'Sunset point trek',
        'Champagne on arrival',
        'Late checkout'
      ],
      includes: 'Comfortable accommodation, spa session, romantic dining, activities',
      bestFor: 'Couples & honeymooners'
    },
    {
      id: 'corporate-package',
      name: 'Corporate Retreat',
      icon: Building,
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '2-5 Days',
      price: '₹12,500',
      originalPrice: '₹15,000',
      description: 'Professional retreat packages with team-building activities and conference facilities.',
      highlights: [
        'Conference hall with AV equipment',
        'Team building activities',
        'Business center access',
        'Group dining arrangements',
        'Evening entertainment',
        'Transportation coordination'
      ],
      includes: 'Meeting facilities, accommodation, meals, activities, WiFi',
      bestFor: 'Corporate groups 10-50 people'
    },
    {
      id: 'adventure-package',
      name: 'Adventure Seeker',
      icon: TreePine,
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '3 Days / 2 Nights',
      price: '₹16,500',
      originalPrice: '₹20,000',
      description: 'Action-packed itinerary for adventure enthusiasts with thrilling outdoor activities.',
      highlights: [
        'Rock climbing sessions',
        'Advanced hiking trails',
        'Horse riding expeditions',
        'Photography tours',
        'Camping under stars',
        'Adventure equipment included'
      ],
      includes: 'Accommodation, adventure activities, equipment, guides, meals',
      bestFor: 'Adventure lovers & outdoor enthusiasts'
    }
  ];

  const displayPackages = packages.length > 0 ? packages : fallbackPackages;

  const getIconComponent = (packageType: string) => {
    switch (packageType) {
      case 'family': return Users;
      case 'romantic': return Heart;
      case 'corporate': return Building;
      case 'adventure': return TreePine;
      default: return Sparkles;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading packages...</p>
          </div>
        </div>
        <DynamicFooter />
        <CombinedFloatingV5 />
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

      {/* Packages Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {displayPackages.map((pkg) => {
              const IconComponent = pkg.icon || getIconComponent(pkg.package_type);
              
              return (
                <div key={pkg.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="relative">
                    <img 
                      src={pkg.featured_image || pkg.banner_image || pkg.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                      alt={pkg.title || pkg.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    {pkg.weekend_price > pkg.weekday_price && (
                      <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                        Save ₹{pkg.weekend_price - pkg.weekday_price}
                      </Badge>
                    )}
                    {pkg.is_featured && (
                      <Badge className="absolute top-4 right-4 bg-secondary text-secondary-foreground">
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-heading font-bold text-foreground">{pkg.title || pkg.name}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-heading font-bold text-primary">₹{pkg.weekday_price || pkg.price?.replace('₹', '')}</div>
                        {pkg.weekend_price && pkg.weekend_price !== pkg.weekday_price && (
                          <div className="text-sm text-muted-foreground">Weekend: ₹{pkg.weekend_price}</div>
                        )}
                        {pkg.originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">{pkg.originalPrice}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <Badge variant="secondary">{pkg.duration_days ? `${pkg.duration_days} days` : pkg.duration}</Badge>
                      <span className="text-sm text-muted-foreground font-body">
                        {pkg.max_guests ? `Max ${pkg.max_guests} guests` : pkg.bestFor}
                      </span>
                    </div>
                    
                    <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                      {pkg.description}
                    </p>
                    
                    <div className="mb-6">
                      <h4 className="font-body font-semibold mb-3 text-foreground">Package Highlights:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {(pkg.inclusions || pkg.highlights || []).slice(0, 4).map((highlight: string, index: number) => (
                          <div key={index} className="text-sm text-muted-foreground font-body flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {highlight}
                          </div>
                        ))}
                        {(pkg.inclusions || pkg.highlights || []).length > 4 && (
                          <div className="text-sm text-muted-foreground font-body flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            +{(pkg.inclusions || pkg.highlights || []).length - 4} more inclusions
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 mb-6">
                      <p className="text-xs text-muted-foreground font-body">
                        <strong>Includes:</strong> {pkg.subtitle || pkg.includes || 'Accommodation, activities, and more'}
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Link to={`/packages/${pkg.id}`} className="flex-1">
                        <Button variant="outline" className="w-full font-body">
                          View Details
                        </Button>
                      </Link>
                      <Button className="flex-1 font-body">
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Custom Package CTA */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Need Something Different?
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            Can't find the perfect package? Our hospitality team can create a customized 
            experience tailored to your specific requirements and preferences.
          </p>
          <Button size="lg" className="font-body">
            Request Custom Package
          </Button>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Packages;