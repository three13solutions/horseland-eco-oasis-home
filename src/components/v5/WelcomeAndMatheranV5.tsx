import React from 'react';
import { Leaf, Heart, Coffee, Car, Mountain, Activity, Train } from 'lucide-react';
import { useTranslationContext } from '@/components/admin/TranslationProvider';

const WelcomeAndMatheranV5 = () => {
  const { getTranslation } = useTranslationContext();
  
  const welcomeFeatures = [
    {
      icon: Leaf,
      titleKey: "welcome.features.noiseEscape.title",
      descriptionKey: "welcome.features.noiseEscape.description"
    },
    {
      icon: Heart,
      titleKey: "welcome.features.forestViews.title",
      descriptionKey: "welcome.features.forestViews.description"
    },
    {
      icon: Coffee,
      titleKey: "welcome.features.wholesome.title",
      descriptionKey: "welcome.features.wholesome.description"
    }
  ];

  const matheranFeatures = [
    {
      icon: Car,
      titleKey: "matheran.features.noVehicles.title",
      descriptionKey: "matheran.features.noVehicles.description"
    },
    {
      icon: Mountain,
      titleKey: "matheran.features.redEarth.title",
      descriptionKey: "matheran.features.redEarth.description"
    },
    {
      icon: Activity,
      titleKey: "matheran.features.horseRides.title",
      descriptionKey: "matheran.features.horseRides.description"
    },
    {
      icon: Train,
      titleKey: "matheran.features.toyTrain.title",
      descriptionKey: "matheran.features.toyTrain.description"
    }
  ];

  return (
    <div>
      {/* Welcome to Horseland Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {getTranslation('welcome.title', 'Welcome to Horseland')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {getTranslation('welcome.description', 'Nestled in the heart of Matheran\'s car-free paradise, Horseland represents more than luxury accommodation—it\'s a sanctuary where sustainable elegance meets authentic mountain hospitality.')}
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">25+</div>
              <div className="text-sm text-muted-foreground">{getTranslation('welcome.stats.years', 'Years of Excellence')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">5000+</div>
              <div className="text-sm text-muted-foreground">{getTranslation('welcome.stats.guests', 'Happy Guests')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">{getTranslation('welcome.stats.ecoFriendly', 'Eco-Friendly')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">{getTranslation('welcome.stats.rating', 'Guest Rating')}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {welcomeFeatures.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="mb-4 flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {getTranslation(feature.titleKey, 'Feature Title')}
                </h3>
                <p className="text-muted-foreground">
                  {getTranslation(feature.descriptionKey, 'Feature Description')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Matheran Section */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              {getTranslation('matheran.title', 'Why Matheran?')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {getTranslation('matheran.description', 'India\'s first eco-sensitive hill station offers a unique blend of heritage and nature, creating an unparalleled mountain escape experience.')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-8">
            {matheranFeatures.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="mb-3 flex justify-center">
                  <div className="p-3 rounded-full bg-secondary group-hover:bg-secondary/80 transition-colors">
                    <feature.icon className="h-6 w-6 text-secondary-foreground" />
                  </div>
                </div>
                <h3 className="font-semibold mb-1 text-foreground text-sm md:text-base">
                  {getTranslation(feature.titleKey, 'Matheran Feature')}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {getTranslation(feature.descriptionKey, 'Matheran Description')}
                </p>
              </div>
            ))}
          </div>

          {/* Learn More Section */}
          <div className="text-center">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors">
              {getTranslation('matheran.learnMore', 'Learn About Matheran')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomeAndMatheranV5;