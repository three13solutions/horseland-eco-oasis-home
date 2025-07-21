import React from 'react';
import { MapPin, Camera, TreePine, Sunrise, Users, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AffordableExperiences = () => {
  const experiences = [
    {
      icon: TreePine,
      title: 'Nature Walks',
      description: 'Free guided walks around Matheran',
      price: 'Free',
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop'
    },
    {
      icon: Sunrise,
      title: 'Sunrise Point',
      description: 'Best sunrise views in Matheran',
      price: 'Free',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
    },
    {
      icon: Camera,
      title: 'Photography Tours',
      description: 'Capture Matheran\'s beauty',
      price: '₹500',
      image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop'
    },
    {
      icon: Users,
      title: 'Group Activities',
      description: 'Fun activities for families',
      price: '₹200',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop'
    }
  ];

  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-primary font-semibold text-sm md:text-base tracking-wider uppercase">
              Things To Do
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-4 mb-6">
              Budget-Friendly Adventures
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore Matheran without spending a fortune. Many of our recommended activities are free or very affordable.
            </p>
          </div>

          {/* Experiences Grid - Mobile First */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {experiences.map((experience, index) => {
              const Icon = experience.icon;
              return (
                <div
                  key={index}
                  className="group bg-card rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Image */}
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    <img
                      src={experience.image}
                      alt={experience.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    
                    {/* Price Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-foreground">
                      {experience.price}
                    </div>
                    
                    {/* Icon */}
                    <div className="absolute top-4 left-4 w-10 h-10 md:w-12 md:h-12 bg-primary/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {experience.title}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-4">
                      {experience.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-primary font-semibold">
                        {experience.price !== 'Free' && <IndianRupee className="w-4 h-4 mr-1" />}
                        <span className="text-lg">{experience.price}</span>
                      </div>
                      <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Button className="bg-gradient-to-r from-primary to-accent text-lg px-8 py-3 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all">
              <MapPin className="w-5 h-5 mr-2" />
              Plan Your Activities
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffordableExperiences;