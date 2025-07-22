import React from 'react';
import { Leaf, Heart, Coffee, Car, Mountain, Activity, Train } from 'lucide-react';

const WelcomeAndMatheranV5 = () => {
  const welcomeFeatures = [
    {
      icon: Leaf,
      title: "Zero-noise hill station escape",
      description: "Complete tranquility away from city chaos"
    },
    {
      icon: Heart,
      title: "Forest-backed views & soulfully curated stays",
      description: "Panoramic vistas with thoughtful hospitality"
    },
    {
      icon: Coffee,
      title: "Wholesome buffets, thoughtfully prepared to avoid waste",
      description: "Sustainable dining with locally sourced ingredients"
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
    <div>
      {/* Welcome to Horseland Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Welcome to <span className="text-primary italic">Horseland</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Nestled in the heart of Matheran's car-free paradise, Horseland represents more than luxury accommodation—it's a sanctuary where sustainable elegance meets authentic mountain hospitality.
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">25+</div>
              <div className="text-sm text-muted-foreground">Years of Excellence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">5000+</div>
              <div className="text-sm text-muted-foreground">Happy Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Eco-Friendly</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">Guest Rating</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {welcomeFeatures.map((feature, index) => (
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

      {/* Why Matheran Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Why <span className="text-primary">Matheran</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              India's first eco-sensitive hill station offers a unique blend of heritage and nature, creating an unparalleled mountain escape experience.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-8">
            {matheranFeatures.map((feature, index) => (
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

          {/* Learn More Section */}
          <div className="text-center">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors">
              Learn About Matheran
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomeAndMatheranV5;