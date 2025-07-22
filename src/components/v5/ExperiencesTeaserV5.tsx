import React from 'react';
import { Button } from '@/components/ui/button';
import { Mountain, Utensils, HeartHandshake, ArrowRight } from 'lucide-react';

const ExperiencesTeaserV5 = () => {
  const experiences = [
    {
      icon: Mountain,
      title: "Activities",
      description: "Horse rides, bonfire evenings, and forest walks through Matheran's pristine trails",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop",
      cta: "Explore Activities"
    },
    {
      icon: Utensils,
      title: "Dining",
      description: "Buffet Only. Cooked with Purpose. Zero-waste culinary experiences with local flavors",
      image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
      cta: "Explore Dining"
    },
    {
      icon: HeartHandshake,
      title: "Spa & Wellness",
      description: "Forest yoga, therapeutic massages, and guided meditation in nature's embrace",
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
      cta: "Book Spa"
    }
  ];

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Curated <span className="text-primary">Experiences</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Immerse yourself in thoughtfully crafted experiences that connect you with nature and local heritage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {experiences.map((experience, index) => (
            <div 
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-border/20 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <img
                  src={experience.image}
                  alt={experience.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <experience.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{experience.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{experience.description}</p>
                
                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  {experience.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperiencesTeaserV5;