import React from 'react';
import { Leaf, Heart, Coffee } from 'lucide-react';

const WelcomeStripV4 = () => {
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
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
            Welcome to <span className="text-primary">Horseland</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Nestled in the heart of Matheran's pristine hills, we offer a sanctuary where nature's rhythm becomes your own. 
            Experience the gentle embrace of mountain air and the whispered stories of ancient trees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <p className="text-center text-foreground font-medium max-w-xs leading-relaxed">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeStripV4;