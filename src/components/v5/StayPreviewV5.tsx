import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const StayPreviewV5 = () => {
  const rooms = [
    {
      name: "Deluxe Valley View",
      price: "₹3,500",
      image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop",
      features: "King bed, Valley view, Balcony"
    },
    {
      name: "Premium Forest Suite",
      price: "₹5,200",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop",
      features: "Suite, Forest view, Living area"
    },
    {
      name: "Eco Cottage",
      price: "₹4,800",
      image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop",
      features: "Private cottage, Garden, Eco-friendly"
    },
    {
      name: "Heritage Room",
      price: "₹2,800",
      image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop",
      features: "Classic decor, Mountain view, Heritage charm"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Choose Your <span className="text-primary">Stay</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Thoughtfully designed accommodations that blend comfort with nature's tranquility
          </p>
        </div>

        <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-4 md:pb-0">
          {rooms.map((room, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-80 md:w-auto bg-white/80 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-primary font-bold">{room.price}</span>
                  <span className="text-muted-foreground text-sm">/night</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{room.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{room.features}</p>
                
                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
            View All Accommodations
          </Button>
        </div>
      </div>
    </section>
  );
};

export default StayPreviewV5;