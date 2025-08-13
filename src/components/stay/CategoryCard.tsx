import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export type Category = {
  id: string;
  name: string;
  tagline: string;
  image?: string;
  maxGuests: number;
  bedConfigurations: string[];
  audiences: string[];
  budget: 'Budget' | 'Mid-range' | 'Premium';
  viewLocations: string[];
  features: string[];
  noise: 'Lively zone' | 'Moderate' | 'Quiet';
};

type Props = {
  category: Category;
  onViewDetails: (category: Category) => void;
  onBookNow: (category: Category) => void;
};

const CategoryCard: React.FC<Props> = ({ category, onViewDetails, onBookNow }) => {
  const navigate = useNavigate();

  const handleBookNow = () => {
    // Get today's date for default check-in
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const searchParams = new URLSearchParams({
      checkIn: today.toISOString().split('T')[0],
      checkOut: tomorrow.toISOString().split('T')[0],
      guests: '2',
      roomTypeId: category.id
    });
    
    navigate(`/booking?${searchParams.toString()}`);
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative">
        <img 
          src={category.image || 'https://images.unsplash.com/photo-1590490360238-c33d57733427?auto=format&fit=crop&w=800&q=80'}
          alt={`${category.name} accommodation - ${category.tagline}`}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
          {category.budget}
        </Badge>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-heading font-semibold mb-2">{category.name}</h3>
        <p className="text-muted-foreground mb-4 text-sm">{category.tagline}</p>
        
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Up to {category.maxGuests} Guests
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {category.viewLocations[0]}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {category.features.slice(0, 2).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {category.features.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{category.features.length - 2} more
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Starting from</div>
            <span className="text-2xl font-heading font-bold text-primary">₹8,500</span>
            <span className="text-sm text-muted-foreground ml-1">/night</span>
          </div>
          <div className="flex gap-2 w-full">
            <Link to={`/stay/${category.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="font-body w-full">
                View Details
              </Button>
            </Link>
            <Button size="sm" className="font-body flex-1" onClick={handleBookNow}>
              Book Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
