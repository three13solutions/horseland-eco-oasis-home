import React from 'react';
import { Heart, Users, Wifi, Car, Coffee, Shield } from 'lucide-react';

const ValueStorySection = () => {
  const features = [
    { icon: Heart, title: 'Family Friendly', desc: 'Perfect for families & groups' },
    { icon: Wifi, title: 'Free WiFi', desc: 'Stay connected always' },
    { icon: Car, title: 'Free Parking', desc: 'No extra charges' },
    { icon: Coffee, title: 'Complimentary Tea', desc: 'Welcome refreshments' },
    { icon: Shield, title: 'Safe & Clean', desc: 'Sanitized daily' },
    { icon: Users, title: '24/7 Support', desc: 'Always here to help' },
  ];

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header - Mobile First */}
          <div className="text-center mb-12 md:mb-16">
            <span className="text-primary font-semibold text-sm md:text-base tracking-wider uppercase">Why Choose Horseland</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4 mb-6">
              Great Value, Better Memories
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We believe everyone deserves a beautiful mountain getaway. That's why we focus on providing 
              quality accommodation at prices that won't stretch your budget.
            </p>
          </div>

          {/* Two Column Layout - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center mb-16">
            {/* Left - Story */}
            <div className="space-y-6">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                Your Home Away From Home in Matheran
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-base md:text-lg leading-relaxed">
                  Located in the heart of Matheran, Horseland offers comfortable rooms, 
                  friendly service, and all the essentials for a memorable stay.
                </p>
                <p className="text-base md:text-lg leading-relaxed">
                  Whether you're here for a weekend escape or a longer vacation, 
                  our focus is simple: clean, comfortable accommodation that doesn't 
                  compromise on quality or location.
                </p>
              </div>
              
              <div className="bg-primary/10 rounded-2xl p-6 border border-primary/20">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">₹1,500</div>
                  <div className="text-sm text-muted-foreground">Starting price per night</div>
                </div>
              </div>
            </div>

            {/* Right - Image */}
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop"
                alt="Comfortable hotel room"
                className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
          </div>

          {/* Features Grid - Mobile Optimized */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-4 md:p-6 rounded-xl bg-card hover:bg-accent/10 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2 text-sm md:text-base">{feature.title}</h4>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueStorySection;