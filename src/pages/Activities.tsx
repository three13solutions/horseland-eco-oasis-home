import React, { useState } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import FooterV5 from '../components/v5/FooterV5';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Star } from 'lucide-react';

const Activities = () => {
  const [filter, setFilter] = useState('all');

  const activities = [
    {
      id: 'horse-riding',
      name: 'Horse Riding Trails',
      image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '2 hours',
      location: 'On Property',
      category: 'adventure',
      age: 'family',
      price: '₹1,500',
      description: 'Explore Matheran\'s red mud trails on horseback with experienced guides.',
      rating: 4.8
    },
    {
      id: 'forest-walk',
      name: 'Guided Forest Walks',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '3 hours',
      location: 'Near Property',
      category: 'nature',
      age: 'family',
      price: '₹800',
      description: 'Discover hidden waterfalls and endemic flora with our naturalist guides.',
      rating: 4.9
    },
    {
      id: 'sunset-point',
      name: 'Sunset Point Trek',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '4 hours',
      location: '2 km away',
      category: 'adventure',
      age: 'adult',
      price: '₹1,200',
      description: 'Trek to panoramic viewpoints for breathtaking sunset vistas.',
      rating: 4.7
    },
    {
      id: 'bonfire-night',
      name: 'Bonfire & Stargazing',
      image: 'https://images.unsplash.com/photo-1520637836862-4d197d17c86a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '2 hours',
      location: 'On Property',
      category: 'relaxation',
      age: 'family',
      price: '₹600',
      description: 'Evening bonfire with traditional stories and stargazing sessions.',
      rating: 4.6
    },
    {
      id: 'bird-watching',
      name: 'Bird Watching Tour',
      image: 'https://images.unsplash.com/photo-1444927714506-8492d94b5ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '3 hours',
      location: 'Near Property',
      category: 'nature',
      age: 'family',
      price: '₹900',
      description: 'Early morning birding sessions to spot endemic Western Ghats species.',
      rating: 4.5
    },
    {
      id: 'rock-climbing',
      name: 'Rock Climbing',
      image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '4 hours',
      location: '5 km away',
      category: 'adventure',
      age: 'adult',
      price: '₹2,500',
      description: 'Beginner-friendly rock climbing with certified instructors and equipment.',
      rating: 4.8
    }
  ];

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'adventure') return activity.category === 'adventure';
    if (filter === 'nature') return activity.category === 'nature';
    if (filter === 'family') return activity.age === 'family';
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
            backgroundImage: "url('https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Adventure Awaits
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Discover Matheran's natural wonders through guided activities
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
              All Activities
            </Button>
            <Button 
              variant={filter === 'adventure' ? 'default' : 'outline'}
              onClick={() => setFilter('adventure')}
              className="font-body"
            >
              Adventure
            </Button>
            <Button 
              variant={filter === 'nature' ? 'default' : 'outline'}
              onClick={() => setFilter('nature')}
              className="font-body"
            >
              Nature
            </Button>
            <Button 
              variant={filter === 'family' ? 'default' : 'outline'}
              onClick={() => setFilter('family')}
              className="font-body"
            >
              Family-Friendly
            </Button>
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative">
                  <img 
                    src={activity.image}
                    alt={activity.name}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    {activity.rating}
                  </Badge>
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                    {activity.price}
                  </Badge>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-2">{activity.name}</h3>
                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                    {activity.description}
                  </p>
                  
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {activity.duration}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {activity.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {activity.age === 'family' ? 'Family Friendly' : 'Adults Only'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="font-body flex-1">
                      Learn More
                    </Button>
                    <Button size="sm" className="font-body flex-1">
                      Add to Stay
                    </Button>
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

export default Activities;