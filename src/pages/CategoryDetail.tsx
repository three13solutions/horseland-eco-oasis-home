import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import MediaAsset from '@/components/MediaAsset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, Bed, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoomType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  max_guests: number;
  hero_image: string;
  hero_image_key: string;
  gallery: any[];
  gallery_keys: any[];
  features: any[];
  seasonal_pricing: any;
  is_published: boolean;
}

const CategoryDetail = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoomType();
  }, [categoryId]);

  const loadRoomType = async () => {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('id', categoryId)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      
      if (data) {
        setRoomType(data as RoomType);
      }
    } catch (error) {
      console.error('Error loading room type:', error);
      toast({
        title: "Error",
        description: "Failed to load room details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading room details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!roomType) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <NavigationV5 />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Room not found</h1>
            <Button onClick={() => navigate('/stay')}>View All Rooms</Button>
          </div>
        </div>
        <DynamicFooter />
      </div>
    );
  }

  // Extract features from JSON if available
  const features = Array.isArray(roomType.features) ? roomType.features : [];
  const galleryImages = Array.isArray(roomType.gallery) ? roomType.gallery : [];
  const galleryKeys = Array.isArray(roomType.gallery_keys) ? roomType.gallery_keys : [];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        {roomType.hero_image_key ? (
          <MediaAsset 
            hardcodedKey={roomType.hero_image_key}
            fallbackUrl={roomType.hero_image}
            alt={roomType.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : roomType.hero_image ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${roomType.hero_image}')` }}
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {roomType.name}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="w-4 h-4" />
              Up to {roomType.max_guests} guests
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Bed className="w-4 h-4" />
              Room Category
            </div>
          </div>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" onClick={() => navigate('/booking')}>
            Book Now - Starting from ₹{roomType.base_price.toLocaleString()}/night
          </Button>
        </div>
      </section>

      {/* Pricing Information */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-xl font-semibold mb-4">Pricing</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Base Price</p>
                <p className="text-2xl font-bold text-primary">₹{roomType.base_price.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">per night</p>
              </div>
              {roomType.seasonal_pricing && Object.keys(roomType.seasonal_pricing).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Seasonal Pricing Available</p>
                  <p className="text-xs text-muted-foreground">Prices may vary based on season and demand</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold mb-6">About {roomType.name}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {roomType.description || 'Experience comfort and luxury in our well-appointed rooms.'}
          </p>

          {features.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Room Features</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      {(galleryImages.length > 0 || galleryKeys.length > 0) && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-heading font-bold mb-8 text-center">Gallery</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {galleryKeys.length > 0 ? (
                galleryKeys.map((key, index) => (
                  <div key={index} className="aspect-[4/3] overflow-hidden rounded-lg">
                    <MediaAsset 
                      hardcodedKey={key}
                      alt={`${roomType.name} view ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))
              ) : (
                galleryImages.map((image, index) => (
                  <div key={index} className="aspect-[4/3] overflow-hidden rounded-lg">
                    <img 
                      src={image}
                      alt={`${roomType.name} view ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold mb-4">Ready to Book?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Secure your {roomType.name} experience today
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