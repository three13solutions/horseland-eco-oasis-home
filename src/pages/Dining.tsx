import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Clock, Leaf, Award, UtensilsCrossed } from 'lucide-react';

const Dining = () => {
  const diningHours = [
    { meal: 'Breakfast', time: '7:00 AM - 10:30 AM', description: 'Continental & Indian options' },
    { meal: 'Lunch', time: '12:30 PM - 3:00 PM', description: 'Buffet with local specialties' },
    { meal: 'High Tea', time: '4:00 PM - 6:00 PM', description: 'Light snacks and beverages' },
    { meal: 'Dinner', time: '7:30 PM - 10:30 PM', description: 'Multi-cuisine buffet' }
  ];

  const todaysMenu = [
    {
      category: "Chef's Signature",
      items: [
        'Matheran Forest Mushroom Risotto',
        'Local Hill Station Trout',
        'Organic Vegetable Khichdi'
      ]
    },
    {
      category: "Regional Favorites",
      items: [
        'Maharashtrian Thali',
        'Coastal Fish Curry',
        'Traditional Dal Tadka'
      ]
    },
    {
      category: "Wellness Corner",
      items: [
        'Detox Green Salad Bowl',
        'Quinoa Buddha Bowl',
        'Fresh Fruit Platter'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Farm-to-Table Dining
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Savor authentic flavors crafted from local ingredients
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
            <p className="text-lg text-muted-foreground font-body">
              A curated selection from our daily buffet offerings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {todaysMenu.map((section, index) => (
              <div key={index} className="bg-card border rounded-lg p-6">
                <h3 className="text-xl font-heading font-semibold mb-4 text-primary">
                  {section.category}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="font-body text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
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

      {/* Dietary Information */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-foreground">
            Special Dietary Needs
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            We cater to various dietary preferences including vegetarian and Jain meal options. 
            Please inform us of any allergies or specific requirements during your booking or upon arrival.
          </p>
          <Button size="lg" className="font-body">
            Inform About Dietary Needs
          </Button>
        </div>
      </section>

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default Dining;