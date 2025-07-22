import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import FooterV5 from '../components/v5/FooterV5';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Building, Sparkles, TreePine, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

const Packages = () => {
  const packages = [
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
      includes: 'Luxury accommodation, spa session, romantic dining, activities',
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
      id: 'relaxation-package',
      name: 'Wellness Escape',
      icon: Sparkles,
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '4 Days / 3 Nights',
      price: '₹24,000',
      originalPrice: '₹28,500',
      description: 'Complete wellness journey focused on rejuvenation, spa treatments, and mindful living.',
      highlights: [
        'Daily spa treatments',
        'Yoga & meditation sessions',
        'Wellness consultation',
        'Detox meal plans',
        'Forest therapy walks',
        'Ayurvedic treatments'
      ],
      includes: 'Accommodation, spa treatments, wellness activities, healthy meals',
      bestFor: 'Wellness enthusiasts & solo travelers'
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
    },
    {
      id: 'membership-package',
      name: 'Annual Membership',
      icon: Crown,
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: 'Year-round',
      price: '₹85,000',
      originalPrice: '₹1,20,000',
      description: 'Exclusive membership with unlimited access and premium benefits throughout the year.',
      highlights: [
        '10 complimentary nights',
        'Priority booking',
        '30% discount on additional nights',
        'Free spa credits worth ₹15,000',
        'Exclusive member events',
        'Concierge services'
      ],
      includes: 'Annual accommodation credits, dining discounts, spa benefits',
      bestFor: 'Frequent visitors & luxury seekers'
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Curated Stay Packages
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Choose the perfect mountain escape designed for your unique needs
          </p>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {packages.map((pkg) => {
              const IconComponent = pkg.icon;
              
              return (
                <div key={pkg.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="relative">
                    <img 
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    {pkg.originalPrice && (
                      <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                        Save ₹{parseInt(pkg.originalPrice.replace('₹', '').replace(',', '')) - parseInt(pkg.price.replace('₹', '').replace(',', ''))}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-heading font-bold text-foreground">{pkg.name}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-heading font-bold text-primary">{pkg.price}</div>
                        {pkg.originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">{pkg.originalPrice}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <Badge variant="secondary">{pkg.duration}</Badge>
                      <span className="text-sm text-muted-foreground font-body">{pkg.bestFor}</span>
                    </div>
                    
                    <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                      {pkg.description}
                    </p>
                    
                    <div className="mb-6">
                      <h4 className="font-body font-semibold mb-3 text-foreground">Package Highlights:</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {pkg.highlights.slice(0, 4).map((highlight, index) => (
                          <div key={index} className="text-sm text-muted-foreground font-body flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {highlight}
                          </div>
                        ))}
                        {pkg.highlights.length > 4 && (
                          <div className="text-sm text-muted-foreground font-body flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            +{pkg.highlights.length - 4} more inclusions
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 mb-6">
                      <p className="text-xs text-muted-foreground font-body">
                        <strong>Includes:</strong> {pkg.includes}
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

      <FooterV5 />
      <FloatingElementsV5 />
    </div>
  );
};

export default Packages;