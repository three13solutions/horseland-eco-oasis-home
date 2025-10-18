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

  // Get meal description for a specific meal type (any variant)
  const getMealDescription = (mealType: string): string => {
    const meal = meals.find(m => m.meal_type === mealType);
    return meal?.description || 'A delicious selection from our kitchen';
  };

  const diningHours = [
    { meal: 'Breakfast', time: '7:00 AM - 10:30 AM', description: 'Continental & Indian options' },
    { meal: 'Lunch', time: '12:30 PM - 3:00 PM', description: 'Buffet with local specialties' },
    { meal: 'High Tea', time: '4:00 PM - 6:00 PM', description: 'Light snacks and beverages' },
    { meal: 'Dinner', time: '7:30 PM - 10:30 PM', description: 'Multi-cuisine buffet' }
  ];

  const mealTypes = [
    { type: 'breakfast', label: 'Breakfast' },
    { type: 'lunch', label: 'Lunch' },
    { type: 'high_tea', label: 'High Tea' },
    { type: 'dinner', label: 'Dinner' }
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
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                Every dish tells a story of the land, from organic vegetables grown in nearby farms 
                to traditional recipes passed down through generations of local communities.
              </p>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                <strong className="text-foreground">Hygiene & Quality:</strong> Horseland takes pride in maintaining 
                <span className="text-primary font-semibold"> separate vegetarian and non-vegetarian kitchens</span>, 
                ensuring the highest standards of food safety and respecting dietary preferences.
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
                  <span className="font-body font-medium">Separate Kitchens</span>
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

      {/* Dining Hours */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Dining Hours
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {diningHours.map((schedule, index) => (
              <div key={index} className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-heading font-semibold">{schedule.meal}</h3>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body font-medium text-primary">{schedule.time}</span>
                </div>
                <p className="text-muted-foreground font-body text-sm">{schedule.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Menu */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 text-foreground">
              Today's Special Menu
            </h2>
            <p className="text-lg text-muted-foreground font-body mb-3">
              A curated selection from our daily buffet offerings
            </p>
            <p className="text-base text-primary font-body font-semibold">
              All meals available in Vegetarian, Non-Vegetarian & Jain options
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mealTypes.map((meal, index) => (
              <div key={index} className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-heading font-semibold text-foreground">
                    {meal.label}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  {getMealDescription(meal.type)}
                </p>
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-body">
                    Veg
                  </span>
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-body">
                    Non-Veg
                  </span>
                  <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-body">
                    Jain
                  </span>
                </div>
              </div>
            ))}
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
            <blockquote className="text-lg font-body text-muted-foreground italic mb-4 leading-relaxed">
              "Our kitchen celebrates the bounty of the Western Ghats. Each meal is crafted with 
              ingredients sourced within a 50-kilometer radius, ensuring freshness while supporting 
              local farming communities. Today's highlight is our forest mushroom risotto, featuring 
              wild mushrooms foraged from the surrounding hills."
            </blockquote>
            <cite className="font-body font-semibold text-foreground">
              — Chef Priya Sharma, Executive Chef
            </cite>
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