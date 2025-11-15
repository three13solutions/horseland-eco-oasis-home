import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MediaAsset from '@/components/MediaAsset';
import { Users, MapPin, Coffee, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDynamicPricing } from '@/hooks/useDynamicPricing';

export type Category = {
  id: string;
  name: string;
  tagline: string;
  image?: string;
  imageKey?: string;
  maxGuests: number;
  bedConfigurations: string[];
  audiences: string[];
  budget: 'Budget' | 'Mid-range' | 'Premium';
  viewLocations: string[];
  features: string[];
  noise: 'Lively zone' | 'Moderate' | 'Quiet';
  basePrice: number;
};

type Props = {
  category: Category;
  onViewDetails: (category: Category) => void;
  onBookNow: (category: Category) => void;
  viewMode?: 'grid' | 'list';
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  adults?: number;
  children?: number;
  hideBookNow?: boolean;
};

const CategoryCard: React.FC<Props> = ({ category, onViewDetails, onBookNow, viewMode = 'grid', checkIn, checkOut, guests = 2, adults = 2, children = 0, hideBookNow = false }) => {
  const navigate = useNavigate();
  const [selectedMealPlan, setSelectedMealPlan] = useState<string>('all_meals_inclusive');
  const [selectedCancellationPolicy, setSelectedCancellationPolicy] = useState<string>('refundable_credit');

  // Fetch dynamic pricing variants
  const { data: variants, isLoading } = useDynamicPricing({
    roomTypeId: category.id,
    checkIn,
    checkOut,
    adultsCount: adults,
    childrenCount: children,
    infantsCount: 0,
    enabled: !!(checkIn && checkOut)
  });

  // Get unique meal plans and cancellation policies
  const mealPlans = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    const unique = Array.from(new Set(variants.map(v => v.meal_plan_code)));
    return unique.map(code => {
      const variant = variants.find(v => v.meal_plan_code === code);
      return { code, name: variant?.meal_plan_name || code };
    });
  }, [variants]);

  const cancellationPolicies = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    const unique = Array.from(new Set(variants.map(v => v.cancellation_policy_code)));
    return unique.map(code => {
      const variant = variants.find(v => v.cancellation_policy_code === code);
      return { code, name: variant?.cancellation_policy_name || code };
    });
  }, [variants]);

  // Find the selected variant
  const selectedVariant = useMemo(() => {
    if (!variants || !selectedMealPlan || !selectedCancellationPolicy) return null;
    return variants.find(v => 
      v.meal_plan_code === selectedMealPlan && 
      v.cancellation_policy_code === selectedCancellationPolicy
    );
  }, [variants, selectedMealPlan, selectedCancellationPolicy]);

  // Calculate display price
  const displayPrice = selectedVariant?.price_per_night || category.basePrice;
  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 1;

  const handleBookNow = () => {
    if (checkIn && checkOut) {
      // We have dates - navigate to booking page with room selected
      const searchParams = new URLSearchParams({
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        guests: guests.toString(),
        roomTypeId: category.id
      });

      if (selectedVariant) {
        searchParams.set('mealPlan', selectedMealPlan);
        searchParams.set('cancellationPolicy', selectedCancellationPolicy);
      }
      
      navigate(`/booking?${searchParams.toString()}`);
    } else {
      // No dates - navigate to search availability page
      navigate('/search-availability');
    }
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex flex-col md:flex-row">
          <div className="relative md:w-80 flex-shrink-0">
            <MediaAsset
              hardcodedKey={category.imageKey || ''}
              fallbackUrl={category.image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'}
              alt={category.name}
              className="w-full h-64 md:h-full object-cover"
            />
            <Badge className="absolute top-3 right-3 bg-white/90 text-foreground">
              {category.budget}
            </Badge>
          </div>
          
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex-1">
              <h3 className="text-2xl font-heading font-semibold mb-2">{category.name}</h3>
              <p className="text-muted-foreground mb-4">{category.tagline}</p>
              
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
                  {category.features.slice(0, 4).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {category.features.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{category.features.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {checkIn && checkOut && variants && variants.length > 0 && (
              <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Meal Plan</label>
                    <Select value={selectedMealPlan} onValueChange={setSelectedMealPlan}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {mealPlans.map(mp => (
                          <SelectItem key={mp.code} value={mp.code} className="text-xs">
                            {mp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Cancellation</label>
                    <Select value={selectedCancellationPolicy} onValueChange={setSelectedCancellationPolicy}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {cancellationPolicies.map(cp => (
                          <SelectItem key={cp.code} value={cp.code} className="text-xs">
                            {cp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {selectedVariant && (
                  <div className="flex items-baseline gap-1 pt-1">
                    <Coffee className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Includes: {selectedVariant.included_meals.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end justify-between gap-4 mt-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  {selectedVariant ? 'Total Price' : 'Starting from'}
                </div>
                <span className="text-2xl font-heading font-bold text-primary">
                  ₹{selectedVariant ? selectedVariant.total_price.toLocaleString() : Math.round(displayPrice / guests).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  {selectedVariant ? `/night for ${nights} night${nights > 1 ? 's' : ''}` : '/guest/night'}
                </span>
              </div>
              <div className="flex gap-2">
                <Link to={`/stay/${category.id}`}>
                  <Button variant="outline" className="font-body">
                    View Details
                  </Button>
                </Link>
                <Button className="font-body" onClick={handleBookNow}>
                  {checkIn && checkOut ? 'Book Now' : 'Search Availability'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative">
        <MediaAsset
          hardcodedKey={category.imageKey || ''}
          fallbackUrl={category.image || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'}
          alt={category.name}
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

        {checkIn && checkOut && variants && variants.length > 0 && (
          <div className="space-y-2 mb-3 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meal Plan</label>
                <Select value={selectedMealPlan} onValueChange={setSelectedMealPlan}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealPlans.map(mp => (
                      <SelectItem key={mp.code} value={mp.code} className="text-xs">
                        {mp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cancellation</label>
                <Select value={selectedCancellationPolicy} onValueChange={setSelectedCancellationPolicy}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationPolicies.map(cp => (
                      <SelectItem key={cp.code} value={cp.code} className="text-xs">
                        {cp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedVariant && (
              <div className="flex items-baseline gap-1">
                <Coffee className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Includes: {selectedVariant.included_meals.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {selectedVariant ? 'Total Price' : 'Starting from'}
            </div>
            <span className="text-2xl font-heading font-bold text-primary">
              ₹{selectedVariant ? selectedVariant.total_price.toLocaleString() : Math.round(displayPrice / guests).toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              {selectedVariant ? `/night for ${nights} night${nights > 1 ? 's' : ''}` : '/guest/night'}
            </span>
          </div>
          <div className="flex gap-2 w-full">
            <Link to={`/stay/${category.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="font-body w-full">
                View Details
              </Button>
            </Link>
            <Button size="sm" className="font-body flex-1" onClick={handleBookNow}>
              {checkIn && checkOut ? 'Book Now' : 'Search Availability'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard;
