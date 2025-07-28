import React from 'react';
import { Leaf, Heart, Coffee, Car, Mountain, Activity, Train } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WelcomeAndMatheranV5 = () => {
  const { t } = useTranslation();
  
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
              {t('welcome.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('welcome.description')}
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">25+</div>
              <div className="text-sm text-muted-foreground">{t('welcome.stats.years')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">5000+</div>
              <div className="text-sm text-muted-foreground">{t('welcome.stats.guests')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">{t('welcome.stats.ecoFriendly')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">{t('welcome.stats.rating')}</div>
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
                  {t(feature.titleKey)}
                </h3>
                <p className="text-muted-foreground">
                  {t(feature.descriptionKey)}
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
              {t('matheran.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('matheran.description')}
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
                  {t(feature.titleKey)}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            ))}
          </div>

          {/* Learn More Section */}
          <div className="text-center">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors">
              {t('matheran.learnMore')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WelcomeAndMatheranV5;