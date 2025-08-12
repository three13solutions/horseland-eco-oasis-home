import React, { useState, useEffect } from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Users, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  title: string;
  description?: string;
  distance?: string;
  image?: string;
  is_active: boolean;
  booking_required: boolean;
  tags?: any;
}

const Activities = () => {
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    // For now, filter by tags array until we have proper activity types
    const tags = activity.tags || [];
    if (filter === 'adventure') return tags.includes('adventure');
    if (filter === 'nature') return tags.includes('nature');
    if (filter === 'family') return tags.includes('family');
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading activities...</p>
          </div>
        </div>
      </div>
    );
  }

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
                    src={activity.image || 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                    alt={activity.title}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    4.5
                  </Badge>
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                    Book Now
                  </Badge>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-2">{activity.title}</h3>
                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                    {activity.description || 'An exciting activity to enhance your stay at Matheran.'}
                  </p>
                  
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    {activity.distance && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {activity.distance}
                      </div>
                    )}
                    {activity.booking_required && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Booking Required
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Suitable for All Ages
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

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default Activities;