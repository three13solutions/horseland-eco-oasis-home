
import React from 'react';
import { Volume, Eye, Utensils } from 'lucide-react';

const WelcomeStrip = () => {
  const features = [
    {
      icon: Volume,
      title: 'Zero-noise Zone',
      description: 'Complete tranquility away from city chaos'
    },
    {
      icon: Eye,
      title: 'Forest-Backed Views',
      description: 'Panoramic vistas of pristine Western Ghats'
    },
    {
      icon: Utensils,
      title: 'Wholesome Buffets, No Waste',
      description: 'Sustainable dining with locally sourced ingredients'
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Welcome to Horseland
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Where comfort meets sustainability in Matheran's embrace
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="mb-4 flex justify-center">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WelcomeStrip;
