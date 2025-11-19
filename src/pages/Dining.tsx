import React from 'react';
import Navigation from '../components/Navigation';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloating from '../components/CombinedFloating';
import DiningGalleryCollage from '../components/DiningGalleryCollage';
import { Button } from '@/components/ui/button';
import { Clock, Leaf, Award, UtensilsCrossed, ChefHat, Home, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Dining = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [heroImage, setHeroImage] = React.useState('https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [heroTitle, setHeroTitle] = React.useState('Farm-to-Table Dining');
  const [heroSubtitle, setHeroSubtitle] = React.useState('Savor authentic flavors crafted from local ingredients');
  const [meals, setMeals] = React.useState<any[]>([]);
  const [inRoomDiningImage, setInRoomDiningImage] = React.useState('https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&h=400&fit=crop');
  const [candleLightDinnerImage, setCandleLightDinnerImage] = React.useState('https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop');
  const [chefNotesImage, setChefNotesImage] = React.useState('https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=400&fit=crop');

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

    const fetchSpecialDiningImages = async () => {
      // Fetch in-room dining image by tag
      const { data: inRoomData } = await supabase
        .from('gallery_images')
        .select('image_url')
        .contains('tags', ['in-room-dining'])
        .limit(1)
        .maybeSingle();
      
      if (inRoomData?.image_url) {
        setInRoomDiningImage(inRoomData.image_url);
      }

      // Fetch candle light dinner image by tag
      const { data: candleData } = await supabase
        .from('gallery_images')
        .select('image_url')
        .contains('tags', ['candle-light-dinner'])
        .limit(1)
        .maybeSingle();
      
      if (candleData?.image_url) {
        setCandleLightDinnerImage(candleData.image_url);
      }

      // Fetch chef notes image by tag
      const { data: chefData } = await supabase
        .from('gallery_images')
        .select('image_url')
        .contains('tags', ['chef-notes'])
        .limit(1)
        .maybeSingle();
      
      if (chefData?.image_url) {
        setChefNotesImage(chefData.image_url);
      }
    };
    
    fetchPageData();
    fetchMeals();
    fetchSpecialDiningImages();
  }, []);

  // Get meal descriptions for buffet variants of a meal type
  const getMealVariants = (mealType: string) => {
    const variants = ['veg', 'non_veg', 'jain'];
    return variants.map(variant => {
      // Find buffet meals specifically
      const meal = meals.find(m => 
        m.meal_type === mealType && 
        m.variant === variant &&
        m.title?.toLowerCase().includes('buffet')
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
      <Navigation />
      
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
                Our Culinary Philosophy
              </h2>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                At Horseland, dining is more than just a meal—it's a celebration of local flavors, 
                sustainable practices, and wholesome nourishment. Our buffet-style dining experience 
                showcases the best of regional cuisine while honoring our commitment to zero-waste cooking.
              </p>
              <p className="text-muted-foreground font-body leading-relaxed">
                Every dish tells a story of the land, from organic vegetables grown in nearby farms 
                to traditional recipes passed down through generations of local communities.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Leaf className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-body font-semibold text-foreground">Organic Ingredients</span>
                </div>
              </div>
              <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-body font-semibold text-foreground">Zero-Waste Kitchen</span>
                </div>
              </div>
              <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <ChefHat className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-body font-semibold text-foreground">Expert Chefs</span>
                </div>
              </div>
              <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <UtensilsCrossed className="w-8 h-8 text-primary" />
                  </div>
                  <span className="font-body font-semibold text-foreground">Buffet Style</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Full-width Carousel */}
        <DiningGalleryCollage />
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


      {/* Special Services */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Special Dining Experiences
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-card border rounded-lg overflow-hidden group">
              <div className="relative h-48">
                <img 
                  src={chefNotesImage}
                  alt="Chef's Notes"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <ChefHat className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-heading font-semibold text-foreground">
                    Chef's Notes
                  </h3>
                </div>
                <blockquote className="text-lg font-body text-muted-foreground italic leading-relaxed">
                  "Our kitchen celebrates the bounty of the Western Ghats. Each meal is crafted with 
                  ingredients sourced within a 50-kilometer radius, ensuring freshness while supporting 
                  local farming communities."
                </blockquote>
              </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden group">
              <div className="relative h-48">
                <img 
                  src={candleLightDinnerImage}
                  alt="Candle Light Dinner"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-8">
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
            onClick={() => {
              const bookingData = localStorage.getItem('currentBooking');
              
              if (!bookingData) {
                toast({
                  title: "Select Your Stay First",
                  description: "Please select your accommodation and dates on the booking page first.",
                  variant: "destructive",
                  action: (
                    <button onClick={() => navigate('/booking')} className="underline">
                      Go to Booking
                    </button>
                  ),
                });
                return;
              }

              try {
                const booking = JSON.parse(bookingData);
                
                if (!booking.checkIn || !booking.checkOut) {
                  toast({
                    title: "Select Dates First",
                    description: "Please select your check-in and check-out dates on the booking page.",
                    variant: "destructive",
                    action: (
                      <button onClick={() => navigate('/booking')} className="underline">
                        Go to Booking
                      </button>
                    ),
                  });
                  return;
                }

                if (!booking.selectedRoom && !booking.roomType && !booking.roomUnit) {
                  toast({
                    title: "Select a Room First",
                    description: "Please select your accommodation before managing dietary needs.",
                    variant: "destructive",
                    action: (
                      <button onClick={() => navigate('/booking')} className="underline">
                        Go to Booking
                      </button>
                    ),
                  });
                  return;
                }

                navigate('/booking?tab=meals');
              } catch (error) {
                console.error('Error checking booking:', error);
                toast({
                  title: "Oops!",
                  description: "We encountered a small issue. Please try again.",
                  variant: "destructive",
                });
              }
            }}
          >
            Inform About Dietary Needs
          </Button>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default Dining;