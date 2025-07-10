
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Star } from 'lucide-react';

const GuestReviews = () => {
  const reviews = [
    {
      id: 1,
      name: 'Priya Sharma',
      rating: 5,
      text: 'Absolutely magical experience! The zero-noise environment was exactly what we needed. The forest views from our room were breathtaking.',
      location: 'Mumbai'
    },
    {
      id: 2,
      name: 'Rajesh Kumar',
      rating: 5,
      text: 'The horse rides and toy train journey were unforgettable. Staff was incredibly welcoming and the buffet had amazing variety.',
      location: 'Pune'
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      rating: 5,
      text: 'Perfect eco-retreat! Loved the sustainable practices and the spa treatments were world-class. Will definitely return.',
      location: 'Delhi'
    },
    {
      id: 4,
      name: 'Amit Patel',
      rating: 5,
      text: 'The red earth trails and forest walks were incredible. Such a peaceful escape from city life. Highly recommend!',
      location: 'Bangalore'
    }
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Guest Stories
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from travelers who found their perfect escape
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel className="w-full">
            <CarouselContent>
              {reviews.map((review) => (
                <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-muted-foreground mb-4 italic leading-relaxed">
                        "{review.text}"
                      </p>
                      <div className="border-t pt-4">
                        <p className="font-semibold text-foreground">
                          {review.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {review.location}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default GuestReviews;
