
import React from 'react';
import { Ban, Mountain, Zap, Train } from 'lucide-react';

const WhyMatheranStrip = () => {
  const features = [
    {
      icon: Ban,
      title: 'No Vehicles',
      description: 'Car-free hill station'
    },
    {
      icon: Mountain,
      title: 'Red Earth Trails',
      description: 'Unique laterite pathways'
    },
    {
      icon: Zap,
      title: 'Horse Rides',
      description: 'Traditional hill transport'
    },
    {
      icon: Train,
      title: 'Toy Train',
      description: 'Heritage railway journey'
    }
  ];

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-foreground">
          Why Matheran?
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="mb-3 flex justify-center">
                <div className="p-3 rounded-full bg-secondary group-hover:bg-secondary/80 transition-colors">
                  <feature.icon className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
              <h3 className="font-semibold mb-1 text-foreground text-sm md:text-base">
                {feature.title}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyMatheranStrip;
