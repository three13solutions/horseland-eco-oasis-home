import React from 'react';
import { Mountain, Utensils, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExperiencesTeaserV4 = () => {
  const experiences = [
    {
      icon: Mountain,
      title: "Activities",
      subtitle: "Adventure & Nature",
      description: "Horse rides through mountain trails, cozy bonfires under starlit skies, and peaceful forest walks that reconnect you with nature's rhythm.",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      cta: "Learn More",
      href: "#activities"
    },
    {
      icon: Utensils,
      title: "Dining",
      subtitle: "Buffet Only. Cooked with Purpose.",
      description: "Thoughtfully prepared wholesome buffets with zero-waste principles. Fresh, local ingredients transformed into nourishing meals that honor the earth.",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      cta: "Explore Dining",
      href: "#dining"
    },
    {
      icon: Sparkles,
      title: "Spa & Wellness",
      subtitle: "Mountain Healing Sanctuary",
      description: "Dawn yoga sessions, forest-inspired spa treatments, and guided meditation in nature's embrace. Restore your soul in our wellness sanctuary.",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      cta: "Book Spa",
      href: "#spa"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
            Mountain <span className="text-primary">Experiences</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Immerse yourself in carefully curated experiences that celebrate the beauty and tranquility of Matheran
          </p>
        </div>

        <div className="space-y-8 md:space-y-12">
          {experiences.map((experience, index) => (
            <div key={index} className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-6 md:gap-12 items-center`}>
              {/* Image */}
              <div className="w-full md:w-1/2">
                <div className="relative group overflow-hidden rounded-xl">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 w-12 h-12 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <experience.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
                    {experience.title}
                  </h3>
                  <p className="text-primary font-medium text-sm uppercase tracking-wide">
                    {experience.subtitle}
                  </p>
                </div>
                
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {experience.description}
                </p>
                
                <Button 
                  variant="outline" 
                  className="group hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {experience.cta}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperiencesTeaserV4;