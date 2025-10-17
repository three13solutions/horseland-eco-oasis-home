import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Bed, Star } from 'lucide-react';

const CategoryDetail = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  // Mock category data - in a real app, this would come from an API or database
  const categories = {
    'cave-hideouts': {
      name: 'Cave Hideouts',
      tagline: 'Naturally cool rooms tucked below ground',
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80',
      maxGuests: 3,
      bedConfigurations: ['1 double', 'double + sofa‑cum‑bed'],
      audiences: ['Couple', 'Family with kids', 'Friends / Group'],
      budget: 'Budget',
      viewLocations: ['No view / private and snug', 'Near entrance'],
      features: ['Basement/cave style', 'Windowless/private', 'Air‑conditioned'],
      noise: 'Quiet',
      description: 'Experience the unique charm of our Cave Hideouts, naturally cool accommodations built into the hillside. These rooms offer a serene retreat from the bustling world above, maintaining a comfortable temperature year-round thanks to their natural insulation.',
      amenities: [
        'Natural temperature control',
        'Soundproof environment',
        'Modern amenities',
        'Private entrance',
        'Eco-friendly design',
        'LED ambient lighting'
      ],
      gallery: [
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
      ]
    },
    // Add other categories as needed
  };

  const category = categories[categoryId as keyof typeof categories];

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Button onClick={() => window.history.back()}>Go Back</Button>
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
          style={{ backgroundImage: `url('${category.image}')` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">
            {category.budget}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {category.name}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90 mb-8">
            {category.tagline}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="w-4 h-4" />
              Up to {category.maxGuests} guests
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <MapPin className="w-4 h-4" />
              {category.viewLocations[0]}
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Bed className="w-4 h-4" />
              {category.bedConfigurations[0]}
            </div>
          </div>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" onClick={() => navigate('/booking')}>
            Book Now - Starting from ₹8,500/night
          </Button>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-6">About {category.name}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {category.description}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Room Features</h3>
              <div className="grid grid-cols-2 gap-2">
                {category.features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="justify-start">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Amenities</h3>
              <div className="space-y-2">
                {category.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-8 text-center">Gallery</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {category.gallery.map((image, index) => (
              <div key={index} className="aspect-[4/3] overflow-hidden rounded-lg">
                <img 
                  src={image}
                  alt={`${category.name} view ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold mb-4">Ready to Book?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Secure your {category.name} experience today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90" onClick={() => navigate('/booking')}>
              Book Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/booking')}>
              Check Availability
            </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default CategoryDetail;