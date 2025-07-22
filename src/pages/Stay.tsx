import React, { useState } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import FooterV5 from '../components/v5/FooterV5';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, Coffee, Bath, Mountain, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const Stay = () => {
  const [filter, setFilter] = useState('all');

  const rooms = [
    {
      id: 'deluxe-valley',
      name: 'Deluxe Valley View',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 2,
      view: 'Valley',
      price: '₹8,500',
      amenities: ['Mountain View', 'Private Balcony', 'Wifi', 'Mini Bar'],
      rating: 4.8
    },
    {
      id: 'family-suite',
      name: 'Family Suite',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 4,
      view: 'Garden',
      price: '₹12,500',
      amenities: ['Connecting Rooms', 'Living Area', 'Kitchenette', 'Wifi'],
      rating: 4.9
    },
    {
      id: 'premium-forest',
      name: 'Premium Forest View',
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 2,
      view: 'Forest',
      price: '₹10,500',
      amenities: ['Forest View', 'Fireplace', 'Jacuzzi', 'Room Service'],
      rating: 4.7
    },
    {
      id: 'honeymoon-cottage',
      name: 'Honeymoon Cottage',
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 2,
      view: 'Private',
      price: '₹15,000',
      amenities: ['Private Garden', 'Hot Tub', 'Champagne Service', 'Butler Service'],
      rating: 5.0
    },
    {
      id: 'executive-room',
      name: 'Executive Room',
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 2,
      view: 'Valley',
      price: '₹9,500',
      amenities: ['Work Desk', 'Express Laundry', 'Welcome Drinks', 'Wifi'],
      rating: 4.6
    },
    {
      id: 'budget-twin',
      name: 'Budget Twin Room',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      guests: 2,
      view: 'Garden',
      price: '₹6,500',
      amenities: ['Twin Beds', 'Shared Balcony', 'Basic Wifi', 'Daily Housekeeping'],
      rating: 4.4
    }
  ];

  const filteredRooms = filter === 'all' ? rooms : rooms.filter(room => {
    if (filter === '2') return room.guests <= 2;
    if (filter === '4+') return room.guests >= 4;
    return true;
  });

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

      {/* Filter Section */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="font-body"
            >
              All Rooms
            </Button>
            <Button 
              variant={filter === '2' ? 'default' : 'outline'}
              onClick={() => setFilter('2')}
              className="font-body"
            >
              Up to 2 Guests
            </Button>
            <Button 
              variant={filter === '4+' ? 'default' : 'outline'}
              onClick={() => setFilter('4+')}
              className="font-body"
            >
              4+ Guests
            </Button>
          </div>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRooms.map((room) => (
              <div key={room.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative">
                  <img 
                    src={room.image}
                    alt={room.name}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {room.rating}
                  </Badge>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-2">{room.name}</h3>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.guests} Guests
                    </div>
                    <div className="flex items-center gap-1">
                      <Mountain className="w-4 h-4" />
                      {room.view} View
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.slice(0, 2).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {room.amenities.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{room.amenities.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-heading font-bold text-primary">{room.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">/night</span>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/stay/${room.id}`}>
                        <Button variant="outline" size="sm" className="font-body">
                          View Details
                        </Button>
                      </Link>
                      <Button size="sm" className="font-body">
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FooterV5 />
      <FloatingElementsV5 />
    </div>
  );
};

export default Stay;