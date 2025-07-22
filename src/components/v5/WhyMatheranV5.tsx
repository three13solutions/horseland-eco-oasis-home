import React from 'react';
import { Car, Mountain, Activity, Train } from 'lucide-react';

const WhyMatheranV5 = () => {
  const features = [
    {
      icon: Car,
      title: "No Vehicles",
      description: "Car-free zone"
    },
    {
      icon: Mountain,
      title: "Red Earth Trails",
      description: "Ancient pathways"
    },
    {
      icon: Activity,
      title: "Horse Rides",
      description: "Traditional transport"
    },
    {
      icon: Train,
      title: "Toy Train",
      description: "Heritage railway"
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Why <span className="text-primary">Matheran</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
            India's first eco-sensitive hill station offers a unique blend of heritage and nature
          </p>
        </div>

        <div className="hide-scrollbar flex overflow-x-auto md:grid md:grid-cols-4 gap-4 pb-4 md:pb-0 max-w-full">{/* Fixed horizontal scroll */}
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex-shrink-0 w-56 md:w-auto text-center p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/20 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button className="text-primary hover:text-primary/80 font-medium transition-colors underline underline-offset-4">
            Learn About Matheran
          </button>
        </div>
      </div>
    </section>
  );
};

export default WhyMatheranV5;