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
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-start">
          
          {/* Left Side: Welcome to Horseland */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Welcome to <span className="text-primary italic">Horseland</span>
              </h2>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Nestled in the heart of Matheran's car-free paradise, Horseland represents more than luxury accommodation—it's a sanctuary where sustainable elegance meets authentic mountain hospitality.
              </p>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                Where sustainable luxury meets the pristine embrace of Matheran's car-free sanctuary. Experience mindful hospitality in India's first eco-conscious hill station.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="pt-6">
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

            {/* Welcome Features */}
            <div className="space-y-4">
              {welcomeFeatures.map((feature, index) => (
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

          {/* Right Side: Why Matheran */}
          <div className="space-y-8">
            <div className="text-center lg:text-left space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Why <span className="text-primary">Matheran</span>?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                India's first eco-sensitive hill station offers a unique blend of heritage and nature, creating an unparalleled mountain escape experience.
              </p>
            </div>

            {/* Matheran Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {matheranFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-border/20 hover:bg-white/80 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Learn More Section */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-8 text-center border border-border/20">
              <h3 className="text-xl font-bold text-foreground mb-3">Discover Matheran's Magic</h3>
              <p className="text-muted-foreground mb-4">
                Experience the charm of India's most unique hill station where time moves slowly and nature reigns supreme.
              </p>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors hover:shadow-lg">
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