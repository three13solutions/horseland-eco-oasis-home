import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mountain, Utensils, Flower2, Activity } from 'lucide-react';

const ExperiencesTeaserV5 = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const autoplayRef = useRef(null);

  const experiences = [
    {
      id: 'activities',
      icon: Activity,
      title: 'Mountain Adventures',
      subtitle: 'Embrace the Wild',
      description: 'From horseback rides along red-earth trails to guided forest walks and heritage toy train journeys, discover Matheran\'s natural wonders through curated adventures.',
      image: 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=800&h=600&fit=crop',
      features: ['Horse Riding', 'Forest Walks', 'Toy Train', 'Nature Photography']
    },
    {
      id: 'dining',
      icon: Utensils,
      title: 'Culinary Excellence',
      subtitle: 'Buffet Only, Cooked with Purpose',
      description: 'Our zero-waste kitchen philosophy meets gourmet excellence. Savor locally-sourced ingredients transformed into memorable dining experiences with panoramic mountain views.',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
      features: ['Farm-to-Table', 'Zero Waste', 'Local Ingredients', 'Mountain Views']
    },
    {
      id: 'wellness',
      icon: Flower2,
      title: 'Spa & Wellness',
      subtitle: 'Rejuvenate Your Soul',
      description: 'Ancient Ayurvedic traditions meet modern wellness techniques in our mountain spa. Experience therapeutic treatments designed to restore balance and vitality.',
      image: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=800&h=600&fit=crop',
      features: ['Ayurvedic Treatments', 'Yoga Sessions', 'Meditation', 'Therapeutic Massage']
    }
  ];

  // Autoplay functionality
  useEffect(() => {
    if (isAutoplay) {
      autoplayRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % experiences.length);
      }, 3000);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isAutoplay, experiences.length]);

  // Handle manual tab selection
  const handleTabClick = (index) => {
    setActiveIndex(index);
    setIsAutoplay(false); // Stop autoplay when user manually interacts
    
    // Clear existing interval
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Curated
            <span className="block text-primary italic">Experiences</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every moment at Horseland is thoughtfully designed to create lasting memories
          </p>
        </div>

        {/* Experience Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-4 bg-muted/50 rounded-full p-2">
            {experiences.map((exp, index) => (
              <button
                key={exp.id}
                onClick={() => handleTabClick(index)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <exp.icon className="w-5 h-5" />
                <span className="font-medium">{exp.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Experience Display */}
        <div className="max-w-7xl mx-auto">
          {experiences.map((exp, index) => (
            <div
              key={exp.id}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center transition-all duration-500 ${
                activeIndex === index ? 'opacity-100' : 'opacity-0 absolute invisible'
              }`}
            >
              {/* Content */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <exp.icon className="w-8 h-8 text-primary" />
                    <span className="text-primary font-medium tracking-wider uppercase text-sm">
                      {exp.subtitle}
                    </span>
                  </div>
                  
                  <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                    {exp.title}
                  </h3>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                    {exp.description}
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {exp.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-foreground font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className="bg-gradient-to-r from-primary to-accent hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-lg px-8 py-3">
                  Explore {exp.title}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src={exp.image}
                    alt={exp.title}
                    className="w-full h-full object-cover hover:scale-105 transform transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <exp.icon className="w-6 h-6 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">{exp.title}</div>
                      <div className="text-sm text-muted-foreground">Premium Experience</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperiencesTeaserV5;