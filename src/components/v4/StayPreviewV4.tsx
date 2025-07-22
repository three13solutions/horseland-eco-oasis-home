import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StayPreviewV4 = () => {
  const rooms = [
    {
      id: 1,
      name: "Valley View Deluxe",
      image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      price: "₹3,500",
      features: ["Mountain View", "King Bed", "Private Balcony"]
    },
    {
      id: 2,
      name: "Forest Cottage",
      image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2080&q=80",
      price: "₹2,800",
      features: ["Garden View", "Twin Beds", "Eco Design"]
    },
    {
      id: 3,
      name: "Sunrise Suite",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      price: "₹4,200",
      features: ["Sunrise View", "Jacuzzi", "Premium Suite"]
    },
    {
      id: 4,
      name: "Budget Retreat",
      image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80",
      price: "₹1,800",
      features: ["Shared View", "Queen Bed", "Value Stay"]
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            Choose Your <span className="text-primary">Perfect Stay</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From budget-friendly retreats to premium suites, find accommodation that matches your mountain getaway dreams
          </p>
        </div>

        {/* Mobile: Horizontal Scroll */}
        <div className="md:hidden">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {rooms.map((room) => (
              <div key={room.id} className="flex-shrink-0 w-80 bg-background rounded-lg shadow-sm border border-border/50">
                <div className="relative">
                  <img
                    src={room.image}
                    alt={room.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    {room.price}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2">{room.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {room.features.map((feature, index) => (
                      <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-background rounded-lg shadow-sm border border-border/50 hover:shadow-md transition-shadow duration-300">
              <div className="relative">
                <img
                  src={room.image}
                  alt={room.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  {room.price}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-2">{room.name}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {room.features.map((feature, index) => (
                    <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" className="group">
            View All Rooms
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default StayPreviewV4;