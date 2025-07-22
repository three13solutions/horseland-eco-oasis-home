import React from 'react';
import { Leaf, Heart, Coffee } from 'lucide-react';

const WelcomeStripV5 = () => {
  const features = [
    {
      icon: Leaf,
      text: "Zero-noise hill station escape"
    },
    {
      icon: Heart,
      text: "Forest-backed views & soulfully curated stays"
    },
    {
      icon: Coffee,
      text: "Wholesome buffets, thoughtfully prepared to avoid waste"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6">
            Welcome to <span className="text-primary">Horseland</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Where sustainable luxury meets the pristine embrace of Matheran's car-free sanctuary. 
            Experience mindful hospitality in India's first eco-conscious hill station.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-border/20 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <p className="text-foreground font-medium text-lg leading-relaxed">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WelcomeStripV5;