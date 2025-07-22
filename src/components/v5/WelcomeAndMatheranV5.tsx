import React from 'react';
import { Leaf, Heart, Coffee, Car, Mountain, Activity, Train } from 'lucide-react';

const WelcomeAndMatheranV5 = () => {
  const welcomeFeatures = [
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

  const matheranFeatures = [
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
    <section className="py-16 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
          
          {/* Left Side: Welcome to Horseland */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Welcome to <span className="text-primary italic">Horseland</span>
              </h2>
              
              <p className="text-base text-muted-foreground leading-relaxed">
                Nestled in the heart of Matheran's car-free paradise, Horseland represents more than luxury accommodation—it's a sanctuary where sustainable elegance meets authentic mountain hospitality.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">25+</div>
                <div className="text-xs text-muted-foreground">Years</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">5000+</div>
                <div className="text-xs text-muted-foreground">Guests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-xs text-muted-foreground">Eco-Friendly</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">4.9★</div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
            </div>

            {/* Welcome Features */}
            <div className="space-y-3">
              {welcomeFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-border/20 hover:bg-white/70 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-medium leading-relaxed">
                        {feature.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Why Matheran */}
          <div className="space-y-6">
            <div className="text-center lg:text-left space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Why <span className="text-primary">Matheran</span>?
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                India's first eco-sensitive hill station offers a unique blend of heritage and nature.
              </p>
            </div>

            {/* Matheran Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {matheranFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-border/20 hover:bg-white/80 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Learn More Section */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 text-center border border-border/20">
              <h3 className="text-lg font-bold text-foreground mb-2">Discover Matheran's Magic</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Experience the charm of India's most unique hill station.
              </p>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg font-medium transition-colors text-sm">
                Learn About Matheran
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeAndMatheranV5;