import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloatingV5 from '../components/v5/CombinedFloatingV5';
import { Button } from '@/components/ui/button';
import { Clock, Leaf, Award, UtensilsCrossed, ChefHat, Home, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Dining = () => {
  const navigate = useNavigate();
  const [heroImage, setHeroImage] = React.useState('https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = React.useState('Farm-to-Table Dining');
  const [heroSubtitle, setHeroSubtitle] = React.useState('Savor authentic flavors crafted from local ingredients');
  const [meals, setMeals] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchPageData = async () => {
      const { data } = await supabase.from('pages').select('title, subtitle, hero_image').eq('slug', 'dining').single();
      if (data) {
        if (data.title) setHeroTitle(data.title);
        if (data.subtitle) setHeroSubtitle(data.subtitle);
        if (data.hero_image) setHeroImage(data.hero_image);
      }
    };
    
    const fetchMeals = async () => {
      const { data } = await supabase
        .from('meals')
        .select('*')
        .eq('is_active', true)
        .order('meal_type');
      if (data) setMeals(data);
    };
    
    fetchPageData();
    fetchMeals();
  }, []);

  // Get meal descriptions for buffet variants of a meal type
  const getMealVariants = (mealType: string) => {
    const variants = ['veg', 'non_veg', 'jain'];
    return variants.map(variant => {
      // Find buffet meals by filtering out sitout meals
      const meal = meals.find(m => 
        m.meal_type === mealType && 
        m.variant === variant &&
        !m.title?.toLowerCase().includes('sitout')
      );
      return {
        variant,
        label: variant === 'veg' ? 'Vegetarian' : variant === 'non_veg' ? 'Non-Vegetarian' : 'Jain',
        description: meal?.description || ''
      };
    }).filter(v => v.description);
  };

  const mealTypes = [
    { type: 'breakfast', label: 'Breakfast', time: '7:00 AM - 10:30 AM' },
    { type: 'lunch', label: 'Lunch', time: '12:30 PM - 3:00 PM' },
    { type: 'high_tea', label: 'High Tea', time: '4:00 PM - 6:00 PM' },
    { type: 'dinner', label: 'Dinner', time: '7:30 PM - 10:30 PM' }
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
          <p className="text-lg md:text-xl font-body opacity-90">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
                Our Culinary Philosophy
              </h2>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                At Horseland, dining is more than just a meal—it's a celebration of local flavors, 
                sustainable practices, and wholesome nourishment. Our buffet-style dining experience 
                showcases the best of regional cuisine while honoring our commitment to zero-waste cooking.
              </p>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                Every dish tells a story of the land, from organic vegetables grown in nearby farms 
                to traditional recipes passed down through generations of local communities.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Leaf className="w-6 h-6 text-primary" />
                  <span className="font-body font-medium">Organic Ingredients</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-primary" />
                  <span className="font-body font-medium">Zero-Waste Kitchen</span>
                </div>
                <div className="flex items-center gap-3">
                  <ChefHat className="w-6 h-6 text-primary" />
                  <span className="font-body font-medium">Expert Chefs</span>
                </div>
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                  <span className="font-body font-medium">Buffet Style</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1556909114-a7811625ccc1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Chef preparing food"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Separate Kitchens Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-foreground">
              Dedicated Kitchen Facilities
            </h2>
            <p className="text-lg text-muted-foreground font-body max-w-3xl mx-auto">
              Respecting dietary preferences and ensuring the highest standards of food safety
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-card border rounded-lg p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 rounded-full bg-primary/10">
                  <Leaf className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-center mb-4 text-foreground">
                Vegetarian Kitchen
              </h3>
              <p className="text-muted-foreground font-body text-center leading-relaxed">
                Our dedicated vegetarian kitchen is maintained with strict protocols to ensure no cross-contamination. 
                All utensils, cookware, and preparation surfaces are exclusively used for vegetarian and Jain meal preparation, 
                giving you complete peace of mind.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 rounded-full bg-primary/10">
                  <ChefHat className="w-12 h-12 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-heading font-semibold text-center mb-4 text-foreground">
                Non-Vegetarian Kitchen
              </h3>
              <p className="text-muted-foreground font-body text-center leading-relaxed">
                Our separate non-vegetarian kitchen operates independently with its own set of equipment, 
                preparation areas, and trained staff. This ensures optimal hygiene standards while preparing 
                delicious chicken and egg-based dishes for our guests.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 bg-card border rounded-lg px-6 py-4">
              <Award className="w-6 h-6 text-primary" />
              <p className="text-foreground font-body font-semibold">
                Certified Food Safety Standards | FSSAI Compliant
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* What to Expect */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-foreground">
              What to Expect
            </h2>
            <p className="text-lg text-muted-foreground font-body mb-3">
              Our wholesome buffet dining experience with diverse options
            </p>
            <p className="text-base text-primary font-body font-semibold">
              All meals available in Vegetarian, Non-Vegetarian & Jain options
            </p>
          </div>

          <div className="space-y-8">
            {mealTypes.map((meal, index) => {
              const variants = getMealVariants(meal.type);
              if (variants.length === 0) return null;
              
              return (
                <div key={index} className="bg-card border rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-6 h-6 text-primary" />
                      <h3 className="text-2xl font-heading font-semibold text-foreground">
                        {meal.label}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2 md:ml-auto">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="font-body font-medium text-foreground whitespace-nowrap">
                        {meal.time}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    {variants.map((variant, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary font-body">
                            {variant.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body leading-relaxed">
                          {variant.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chef's Notes */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Chef's Notes
          </h2>
          <div className="bg-card border rounded-lg p-8">
            <blockquote className="text-lg font-body text-muted-foreground italic leading-relaxed">
              "Our kitchen celebrates the bounty of the Western Ghats. Each meal is crafted with 
              ingredients sourced within a 50-kilometer radius, ensuring freshness while supporting 
              local farming communities."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Special Services */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Special Dining Experiences
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card border rounded-lg p-8">
              <div className="flex items-center gap-3 mb-4">
                <Home className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-heading font-semibold text-foreground">
                  In-Room Dining
                </h3>
              </div>
              <p className="text-muted-foreground font-body leading-relaxed mb-4">
                For select rooms including poolside rooms with private sitouts, meals can be served 
                directly to your room for a private and intimate dining experience.
              </p>
              <p className="text-sm text-primary font-body font-semibold">
                Available at an additional service charge
              </p>
            </div>

            <div className="bg-card border rounded-lg p-8">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-heading font-semibold text-foreground">
                  Candle Light Dinner
                </h3>
              </div>
              <p className="text-muted-foreground font-body leading-relaxed mb-4">
                Create magical moments with a candle light dinner arranged by the poolside, 
                in select rooms with dining arrangements, or in our elegant dining area.
              </p>
              <p className="text-sm text-primary font-body font-semibold">
                Available on request at an additional service charge
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dietary Information */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-foreground">
            Special Dietary Needs
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            We cater to various dietary preferences including vegetarian, non-vegetarian, and Jain meal options. 
            Please inform us of any allergies or specific requirements during your booking.
          </p>
          <Button 
            size="lg" 
            className="font-body"
            onClick={() => navigate('/booking?tab=meals')}
          >
            Inform About Dietary Needs
          </Button>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloatingV5 />
    </div>
  );
};

export default Dining;