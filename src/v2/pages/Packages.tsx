import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navigation from '@/v2/components/Navigation';
import DynamicFooter from '@/v2/components/DynamicFooter';
import CombinedFloating from '@/v2/components/CombinedFloating';
import MediaAsset from '@/v2/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Building, Sparkles, TreePine, Crown } from 'lucide-react';
import { activePackages, getPageBySlug } from '@/v2/data';

const Packages = () => {
  const navigate = useNavigate();

  const page = getPageBySlug('packages');
  const heroImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
  const heroTitle = page?.title || 'Curated Stay Packages';
  const heroSubtitle = page?.subtitle || 'Choose the perfect mountain escape designed for your unique needs';

  const packages = activePackages;

  const getIconComponent = (packageType: string) => {
    switch (packageType) {
      case 'family': return Users;
      case 'romantic': return Heart;
      case 'corporate': return Building;
      case 'adventure': return TreePine;
      default: return Sparkles;
    }
  };

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
            {packages.map((pkg: any) => {
              const IconComponent = pkg.icon || getIconComponent(pkg.package_type);
              
              return (
                <div key={pkg.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="relative">
                    <MediaAsset
                      hardcodedKey={pkg.featured_image_key || pkg.banner_image_key || ''}
                      fallbackUrl={pkg.featured_image || pkg.banner_image || pkg.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
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
                      <Link to={`/v2/packages/${pkg.id}`} className="flex-1">
                        <Button variant="outline" className="w-full font-body">
                          View Details
                        </Button>
                      </Link>
                      <Button className="flex-1 font-body" onClick={() => navigate('/booking')}>
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
      <CombinedFloating />
    </div>
  );
};

export default Packages;
