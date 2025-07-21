import React from 'react';
import { Bed, Users, Wifi, Car, Bath, Coffee, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ComfortRooms = () => {
  const rooms = [
    {
      name: 'Standard Room',
      price: '₹1,500',
      originalPrice: '₹2,000',
      rating: 4.1,
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop',
      features: ['Free WiFi', 'Attached Bath', 'Mountain View', 'TV'],
      occupancy: '2 Adults',
      popular: false
    },
    {
      name: 'Family Room',
      price: '₹2,200',
      originalPrice: '₹2,800',
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&h=400&fit=crop',
      features: ['Free WiFi', 'Attached Bath', 'Balcony', 'Mini Fridge'],
      occupancy: '4 Adults',
      popular: true
    },
    {
      name: 'Deluxe Room',
      price: '₹3,000',
      originalPrice: '₹3,500',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop',
      features: ['Free WiFi', 'AC', 'Valley View', 'Work Desk'],
      occupancy: '2 Adults + 1 Child',
      popular: false
    }
  ];

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-primary font-semibold text-sm md:text-base tracking-wider uppercase">
              Our Rooms
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4 mb-6">
              Comfort That Fits Your Budget
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Clean, comfortable rooms with all the essentials. No hidden charges, just honest pricing.
            </p>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {rooms.map((room, index) => (
              <div
                key={index}
                className={`relative bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                  room.popular ? 'border-2 border-primary' : ''
                }`}
              >
                {/* Popular Badge */}
                {room.popular && (
                  <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                {/* Image */}
                <div className="relative h-48 md:h-56 overflow-hidden">
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  
                  {/* Rating */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                    <Star className="w-4 h-4 text-accent fill-current" />
                    <span className="text-sm font-semibold">{room.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                        {room.name}
                      </h3>
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{room.occupancy}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground line-through">
                        {room.originalPrice}
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {room.price}
                      </div>
                      <div className="text-xs text-muted-foreground">per night</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {room.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button 
                    className={`w-full ${
                      room.popular 
                        ? 'bg-gradient-to-r from-primary to-accent' 
                        : ''
                    }`}
                    variant={room.popular ? 'default' : 'outline'}
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12 p-6 md:p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Can't decide? We'll help you choose!
            </h3>
            <p className="text-muted-foreground mb-6">
              Call us for personalized recommendations based on your needs and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button className="bg-gradient-to-r from-primary to-accent">
                Call: +91 98765 43210
              </Button>
              <Button variant="outline">
                WhatsApp us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComfortRooms;