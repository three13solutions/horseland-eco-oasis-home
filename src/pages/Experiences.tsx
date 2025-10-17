import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { TreePine, UtensilsCrossed, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Experiences = () => {
  const [heroImage, setHeroImage] = React.useState('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = React.useState('Curated Mountain Experiences');
  const [heroSubtitle, setHeroSubtitle] = React.useState('Every moment at Horseland is designed to reconnect you with nature, nourish your body, and refresh your spirit through authentic mountain experiences.');

  React.useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase.from('pages').select('title, subtitle, hero_image').eq('slug', 'experiences').single();
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_image) setHeroImage(data.hero_image);
      }
    };
    fetchPageData();
  }, []);

  const experiences = [
    {
      title: 'Activities',
      description: 'Horse rides, forest walks, and adventure trails that connect you with nature\'s playground.',
      icon: TreePine,
      image: 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      link: '/experiences/activities',
      highlights: ['Horse Riding', 'Forest Trails', 'Sunset Points', 'Nature Walks']
    },
    {
      title: 'Dining',
      description: 'Farm-to-table dining experiences featuring local ingredients and zero-waste cooking.',
      icon: UtensilsCrossed,
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      link: '/experiences/dining',
      highlights: ['Buffet Dining', 'Local Cuisine', 'Organic Ingredients', 'Chef Specials']
    },
    {
      title: 'Spa & Wellness',
      description: 'Rejuvenating therapies and wellness practices in harmony with mountain serenity.',
      icon: Sparkles,
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      link: '/experiences/spa',
      highlights: ['Ayurvedic Treatments', 'Yoga Sessions', 'Meditation', 'Wellness Therapies']
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${heroImage}')`
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            {heroTitle}
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90 max-w-3xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Three Pillars of Mountain Living
          </h2>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            Our experiences are thoughtfully crafted around three core elements: active adventure, 
            mindful nourishment, and restorative wellness. Each offers a unique way to immerse 
            yourself in the natural rhythm of mountain life.
          </p>
        </div>
      </section>

      {/* Experience Cards */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {experiences.map((experience, index) => {
              const IconComponent = experience.icon;
              
              return (
                <div key={index} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
                  <div className="relative">
                    <img 
                      src={experience.image}
                      alt={experience.title}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300"></div>
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-2xl font-heading font-bold mb-3 text-foreground">
                      {experience.title}
                    </h3>
                    <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                      {experience.description}
                    </p>
                    
                    <div className="mb-6">
                      <h4 className="font-body font-semibold mb-3 text-foreground">Highlights:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {experience.highlights.map((highlight, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground font-body">
                            • {highlight}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Link to={experience.link}>
                      <Button className="w-full font-body">
                        Explore {experience.title}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8">
            Let us curate the perfect combination of experiences for your mountain retreat.
          </p>
          <Button size="lg" className="font-body">
            Plan Your Stay
          </Button>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Experiences;