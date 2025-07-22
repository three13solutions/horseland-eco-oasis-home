import React from 'react';
import { Star, Award, MapPin } from 'lucide-react';

const TrustedByV4 = () => {
  const logos = [
    {
      name: "TripAdvisor",
      icon: MapPin,
      metric: "4.5/5 Rating"
    },
    {
      name: "Times Travel",
      icon: Award,
      metric: "Featured Destination"
    },
    {
      name: "India Today",
      icon: Star,
      metric: "Recommended Stay"
    }
  ];

  return (
    <section className="py-12 bg-background border-t border-border/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-6">
            Trusted by travelers & featured in
          </h3>
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden">
          <div className="flex space-x-8 overflow-x-auto pb-4 justify-center">
            {logos.map((logo, index) => (
              <div key={index} className="flex-shrink-0 text-center min-w-[120px]">
                <div className="w-16 h-16 mx-auto mb-2 bg-muted/30 rounded-full flex items-center justify-center">
                  <logo.icon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground">{logo.name}</div>
                <div className="text-xs text-muted-foreground">{logo.metric}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Centered row */}
        <div className="hidden md:flex justify-center items-center space-x-16">
          {logos.map((logo, index) => (
            <div key={index} className="text-center group cursor-pointer">
              <div className="w-20 h-20 mx-auto mb-3 bg-muted/30 rounded-full flex items-center justify-center group-hover:bg-muted/50 transition-colors">
                <logo.icon className="w-10 h-10 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                {logo.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {logo.metric}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-12 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary">500+</div>
            <div className="text-sm text-muted-foreground">Happy Guests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary">4.8</div>
            <div className="text-sm text-muted-foreground">Avg Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-primary">98%</div>
            <div className="text-sm text-muted-foreground">Return Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedByV4;