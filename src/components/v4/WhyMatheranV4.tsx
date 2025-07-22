import React from 'react';
import { Car, Mountain, Heart, Train } from 'lucide-react';

const WhyMatheranV4 = () => {
  const features = [
    {
      icon: Car,
      title: "No Vehicles",
      description: "Car-free eco zone",
      iconClass: "text-red-500"
    },
    {
      icon: Mountain,
      title: "Red Earth Trails",
      description: "Scenic walking paths",
      iconClass: "text-orange-500"
    },
    {
      icon: Heart,
      title: "Horse Rides",
      description: "Traditional transport",
      iconClass: "text-amber-600"
    },
    {
      icon: Train,
      title: "Toy Train",
      description: "Heritage railway",
      iconClass: "text-green-600"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            Why <span className="text-primary">Matheran</span>?
          </h2>
          <p className="text-muted-foreground">
            Discover India's unique car-free hill station
          </p>
        </div>

        {/* Mobile: Horizontal Scroll */}
        <div className="md:hidden">
          <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
            {features.map((feature, index) => (
              <div key={index} className="flex-shrink-0 w-32 text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-muted/50 rounded-full flex items-center justify-center">
                  <feature.icon className={`w-8 h-8 ${feature.iconClass}`} />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden md:grid grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-300">
                <feature.icon className={`w-10 h-10 ${feature.iconClass}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button className="text-primary hover:text-primary/80 font-medium text-sm">
            Learn About Matheran →
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhyMatheranV4;