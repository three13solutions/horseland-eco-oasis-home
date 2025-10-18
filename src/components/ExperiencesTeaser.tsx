
import React from 'react';
import { ArrowRight, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useTranslationContext } from '@/components/admin/TranslationProvider';
import { useMediaAsset } from '@/hooks/useMediaAsset';

const ExperiencesTeaserV5 = () => {
  const navigate = useNavigate();
  const { getTranslation } = useTranslationContext();

  // Use media assets for experience cards
  const { asset: experienceCard1 } = useMediaAsset('experiences.card1', 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=300&fit=crop');
  const { asset: experienceCard2 } = useMediaAsset('experiences.card2', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop');
  const { asset: experienceCard3 } = useMediaAsset('experiences.card3', 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop');

  const experienceCategories = [
    {
      title: getTranslation('experiences.nature.title', 'Nature Immersion'),
      description: getTranslation('experiences.nature.description', 'Connect with pristine wilderness through guided nature walks and eco-adventures'),
      image: experienceCard1?.image_url || 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=300&fit=crop',
      activities: ['Nature Walks', 'Bird Watching', 'Photography Tours'],
      duration: '2-4 hours',
      groupSize: '2-8 people'
    },
    {
      title: getTranslation('experiences.wellness.title', 'Wellness & Mindfulness'),
      description: getTranslation('experiences.wellness.description', 'Rejuvenate your mind and body with yoga sessions and spa treatments'),
      image: experienceCard2?.image_url || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop',
      activities: ['Morning Yoga', 'Meditation', 'Spa Treatments'],
      duration: '1-2 hours',
      groupSize: '1-6 people'
    },
    {
      title: getTranslation('experiences.adventure.title', 'Local Adventures'),
      description: getTranslation('experiences.adventure.description', 'Explore Matheran\'s unique attractions and cultural experiences'),
      image: experienceCard3?.image_url || 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop',
      activities: ['Toy Train Rides', 'Sunset Points', 'Local Markets'],
      duration: '3-6 hours',
      groupSize: '2-10 people'
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-6">
            {getTranslation('experiences.title', 'Curated Experiences')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-body">
            {getTranslation('experiences.subtitle', 'Every moment at Horseland is thoughtfully designed to create lasting memories')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {experienceCategories.map((category, index) => (
            <Card key={index} className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm">
              <div className="relative overflow-hidden">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              <CardContent className="p-8">
                <h3 className="text-2xl font-heading font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mb-6 font-body leading-relaxed">
                  {category.description}
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">{category.duration}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="w-4 h-4 mr-2 text-primary" />
                    <span className="font-medium">{category.groupSize}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {category.activities.map((activity, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => navigate('/experiences')}
            size="lg"
            className="bg-gradient-to-r from-primary to-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg px-8 py-6 rounded-xl font-semibold"
          >
            {getTranslation('experiences.cta', 'Explore All Experiences')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ExperiencesTeaserV5;
