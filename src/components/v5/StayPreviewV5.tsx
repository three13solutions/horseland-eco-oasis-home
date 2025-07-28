import React from 'react';
import { useTranslationContext } from '@/components/admin/TranslationProvider';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

const StayPreviewV5 = () => {
  const { getTranslation } = useTranslationContext();
  const rooms = [
    {
      id: 1,
      name: 'Forest View Deluxe',
      category: 'Deluxe Room',
      price: '₹8,500',
      image: 'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=600&h=400&fit=crop',
      amenities: ['Forest Views', 'Premium Bath', 'Work Desk', 'Mini Bar'],
      description: 'Immerse yourself in nature\'s embrace with panoramic forest views'
    },
    {
      id: 2,
      name: 'Valley Suite',
      category: 'Suite',
      price: '₹12,000',
      image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&h=400&fit=crop',
      amenities: ['Valley Views', 'Separate Living', 'Jacuzzi', 'Butler Service'],
      description: 'Spacious luxury with breathtaking valley vistas and premium amenities'
    },
    {
      id: 3,
      name: 'Mountain Cottage',
      category: 'Premium Cottage',
      price: '₹15,000',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&h=400&fit=crop',
      amenities: ['Private Garden', 'Fireplace', 'Outdoor Deck', 'Concierge'],
      description: 'Your private mountain retreat with exclusive outdoor spaces'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6">
            {getTranslation('stay.title', 'Your Perfect Stay')} <span className="text-primary">{getTranslation('stay.titleHighlight', 'Awaits')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {getTranslation('stay.description', 'Thoughtfully designed accommodations that blend comfort with nature\'s tranquility.')}
          </p>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className={`group relative bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                index === 1 ? 'lg:scale-105 z-10' : ''
              }`}
            >
              {/* Featured Badge */}
              {index === 1 && (
                <div className="absolute top-4 left-4 z-20 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <Sparkles className="w-4 h-4 mr-1" />
                  {getTranslation('stay.mostPopular', 'Most Popular')}
                </div>
              )}

              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                
                {/* Price Badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-left">
                  <div className="text-xs text-muted-foreground mb-1">{getTranslation('stay.startingFrom', 'Starting from')}</div>
                  <span className="text-2xl font-bold text-foreground">{room.price}</span>
                  <span className="text-sm text-muted-foreground">/{getTranslation('stay.perNight', '/night')}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="mb-4">
                  <span className="text-primary font-medium text-sm uppercase tracking-wide">
                    {room.category}
                  </span>
                  <h3 className="text-2xl font-bold text-foreground mt-2 mb-3">
                    {room.name}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {room.description}
                  </p>
                </div>

                {/* Amenities */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {room.amenities.map((amenity, amenityIndex) => (
                    <div key={amenityIndex} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">{amenity}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button 
                  className={`w-full text-white ${
                    index === 1 
                      ? 'bg-gradient-to-r from-primary to-accent' 
                      : 'bg-foreground hover:bg-foreground/90'
                  } hover:shadow-lg transform hover:scale-105 transition-all duration-300`}
                >
                  {getTranslation('stay.viewDetails', 'View Details')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Can't decide? CTA Box */}
        <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            {getTranslation('stay.undecided.title', 'Can\'t decide? We\'ll help you choose!')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {getTranslation('stay.undecided.description', 'Call us for personalized recommendations based on your needs and budget.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="bg-gradient-to-r from-primary to-accent">
              {getTranslation('stay.undecided.call', 'Call: +91 98765 43210')}
            </Button>
            <Button variant="outline">
              {getTranslation('stay.undecided.whatsapp', 'WhatsApp us')}
            </Button>
            <a href="/stay">
              <Button variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                {getTranslation('stay.undecided.viewAll', 'View All Accommodations')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StayPreviewV5;