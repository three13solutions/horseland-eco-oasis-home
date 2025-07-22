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
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative Elements - V2 Style */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Welcome Message & Description */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                  alt="Horseland Logo" 
                  className="h-12 w-12"
                />
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                  Welcome to
                  <span className="block text-primary italic">Horseland</span>
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Nestled in the heart of Matheran's car-free paradise, Horseland represents more than luxury accommodation—it's a sanctuary where sustainable elegance meets authentic mountain hospitality.
              </p>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Where sustainable luxury meets the pristine embrace of Matheran's car-free sanctuary. Experience mindful hospitality in India's first eco-conscious hill station.
              </p>
            </div>

            <div className="pt-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">25+</div>
                  <div className="text-sm text-muted-foreground">Years of Excellence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">5000+</div>
                  <div className="text-sm text-muted-foreground">Happy Guests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">100%</div>
                  <div className="text-sm text-muted-foreground">Eco-Friendly</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">4.9★</div>
                  <div className="text-sm text-muted-foreground">Guest Rating</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Features Grid - V2 Style */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-border/20 hover:bg-white/70 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium text-lg leading-relaxed">
                      {feature.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeStripV5;