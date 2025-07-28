
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const StayPreview = () => {
  const rooms = [
    {
      id: 1,
      name: 'Forest View Deluxe',
      price: '₹8,500',
      image: 'https://images.unsplash.com/photo-1615729947596-a598e5de0ab3?w=400&h=300&fit=crop',
      description: 'Spacious room with panoramic forest views'
    },
    {
      id: 2,
      name: 'Valley Suite',
      price: '₹12,000',
      image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&h=300&fit=crop',
      description: 'Comfortable suite overlooking the valley'
    },
    {
      id: 3,
      name: 'Mountain Cottage',
      price: '₹15,000',
      image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=400&h=300&fit=crop',
      description: 'Private cottage with mountain vistas'
    },
    {
      id: 4,
      name: 'Heritage Room',
      price: '₹7,000',
      image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=300&fit=crop',
      description: 'Classic comfort with modern amenities'
    }
  ];

  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Perfect Stay Awaits
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose from our thoughtfully designed accommodations
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {rooms.map((room) => (
                <CarouselItem key={room.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={room.image}
                        alt={room.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-2 text-foreground">
                        {room.name}
                      </h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {room.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Starting from
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {room.price}
                            <span className="text-sm font-normal text-muted-foreground">
                              /night
                            </span>
                          </span>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
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

export default StayPreview;
