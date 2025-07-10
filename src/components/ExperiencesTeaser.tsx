
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Utensils, Flower } from 'lucide-react';

const ExperiencesTeaser = () => {
  const experiences = [
    {
      icon: Activity,
      title: 'Activities',
      description: 'Horse rides through red earth trails, guided forest walks, and heritage toy train journeys that connect you with Matheran\'s natural beauty.',
      image: 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=300&fit=crop',
      cta: 'Explore Adventures'
    },
    {
      icon: Utensils,
      title: 'Dining',
      description: 'Buffet Only, Cooked with Purpose. Farm-to-table cuisine featuring local ingredients, zero-waste practices, and authentic flavors.',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop',
      cta: 'View Menu'
    },
    {
      icon: Flower,
      title: 'Spa & Wellness',
      description: 'Rejuvenating yoga sessions, therapeutic massages, and wellness treatments inspired by ancient Ayurvedic traditions.',
      image: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      cta: 'Book Wellness'
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Curated Experiences
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Immerse yourself in authentic mountain experiences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {experiences.map((experience, index) => (
            <Card key={index} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={experience.image}
                  alt={experience.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-full bg-primary/10 mr-3">
                    <experience.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {experience.title}
                  </h3>
                </div>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  {experience.description}
                </p>
                <Button variant="outline" className="w-full">
                  {experience.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExperiencesTeaser;
