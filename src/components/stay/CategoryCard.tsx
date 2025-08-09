import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
};

const CategoryCard: React.FC<Props> = ({ category, onViewDetails }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div className="aspect-[4/3] overflow-hidden bg-muted">
      {category.image ? (
        <img
          src={category.image}
          alt={`${category.name} - ${category.tagline}`}
          loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
    <CardContent className="p-6">
      <h3 className="text-xl font-semibold mb-2 text-foreground">{category.name}</h3>
      <p className="text-muted-foreground mb-4 text-sm">{category.tagline}</p>
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">{category.budget}</div>
        <Button variant="outline" size="sm" onClick={() => onViewDetails(category)}>
          View Details
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default CategoryCard;
