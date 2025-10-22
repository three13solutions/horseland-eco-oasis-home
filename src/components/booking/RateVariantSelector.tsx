import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateVariantCard } from './RateVariantCard';
import type { RateVariant } from '@/hooks/useDynamicPricing';

interface RateVariantSelectorProps {
  variants: RateVariant[];
  selectedVariant?: RateVariant;
  onSelect: (variant: RateVariant) => void;
  nights: number;
}

export const RateVariantSelector: React.FC<RateVariantSelectorProps> = ({
  variants,
  selectedVariant,
  onSelect,
  nights
}) => {
  const [sortBy, setSortBy] = useState<'price' | 'savings' | 'popular'>('popular');
  const [filterMealPlan, setFilterMealPlan] = useState<string>('all');

  let filteredVariants = variants;
  if (filterMealPlan !== 'all') {
    filteredVariants = variants.filter(v => v.meal_plan_code === filterMealPlan);
  }

  const sortedVariants = [...filteredVariants].sort((a, b) => {
    if (sortBy === 'price') return a.total_price - b.total_price;
    if (sortBy === 'savings') return b.savings - a.savings;
    if (sortBy === 'popular') return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Select value={filterMealPlan} onValueChange={setFilterMealPlan}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by meal plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meal Plans</SelectItem>
              <SelectItem value="room_only">Room Only</SelectItem>
              <SelectItem value="breakfast_included">With Breakfast</SelectItem>
              <SelectItem value="breakfast_and_dinner">Breakfast & Dinner</SelectItem>
              <SelectItem value="breakfast_and_lunch">Breakfast & Lunch</SelectItem>
              <SelectItem value="all_meals_inclusive">All Meals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price">Lowest Price</SelectItem>
              <SelectItem value="savings">Best Savings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedVariants.map((variant, idx) => (
          <RateVariantCard
            key={`${variant.meal_plan_code}-${variant.cancellation_policy_code}`}
            variant={variant}
            isSelected={
              selectedVariant?.meal_plan_code === variant.meal_plan_code && 
              selectedVariant?.cancellation_policy_code === variant.cancellation_policy_code
            }
            onSelect={() => onSelect(variant)}
            nights={nights}
          />
        ))}
      </div>
    </div>
  );
};
