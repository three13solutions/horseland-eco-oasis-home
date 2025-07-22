import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Sparkles, Heart, Leaf } from 'lucide-react';

const Spa = () => {
  const services = [
    {
      id: 'ayurvedic-massage',
      name: 'Traditional Ayurvedic Massage',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '90 minutes',
      price: '₹4,500',
      description: 'Full-body massage using warm herbal oils to balance your doshas and rejuvenate your energy.',
      benefits: ['Stress Relief', 'Improved Circulation', 'Muscle Relaxation', 'Energy Balance']
    },
    {
      id: 'mountain-stone-therapy',
      name: 'Mountain Stone Therapy',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '75 minutes',
      price: '₹3,800',
      description: 'Heated volcanic stones from local mountains to release tension and promote deep relaxation.',
      benefits: ['Deep Muscle Relief', 'Improved Sleep', 'Stress Reduction', 'Pain Management']
    },
    {
      id: 'forest-aromatherapy',
      name: 'Forest Aromatherapy',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '60 minutes',
      price: '₹3,200',
      description: 'Essential oils from native forest plants combined with gentle massage techniques.',
      benefits: ['Mental Clarity', 'Emotional Balance', 'Respiratory Health', 'Skin Nourishment']
    },
    {
      id: 'couples-retreat',
      name: 'Couples Wellness Retreat',
      image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '120 minutes',
      price: '₹8,000',
      description: 'Side-by-side massage experience in our private couples suite with mountain views.',
      benefits: ['Bonding Experience', 'Shared Relaxation', 'Romantic Ambiance', 'Private Setting']
    },
    {
      id: 'meditation-session',
      name: 'Guided Meditation Session',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '45 minutes',
      price: '₹1,800',
      description: 'Mindfulness meditation sessions in our outdoor pavilion surrounded by nature.',
      benefits: ['Mindfulness', 'Stress Relief', 'Mental Clarity', 'Inner Peace']
    },
    {
      id: 'yoga-therapy',
      name: 'Therapeutic Yoga Session',
      image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      duration: '75 minutes',
      price: '₹2,500',
      description: 'Personalized yoga practice designed to address specific physical and mental wellness goals.',
      benefits: ['Flexibility', 'Strength Building', 'Posture Improvement', 'Mind-Body Balance']
    }
  ];

  const packages = [
    {
      name: 'Half-Day Wellness Retreat',
      duration: '4 hours',
      price: '₹8,500',
      includes: ['Choice of 90-min treatment', 'Yoga session', 'Healthy lunch', 'Meditation']
    },
    {
      name: 'Full-Day Spa Experience',
      duration: '8 hours',
      price: '₹15,000',
      includes: ['2 spa treatments', 'Yoga & meditation', 'Wellness consultation', 'Organic meals']
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
            backgroundImage: "url('https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Mountain Spa & Wellness
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Rejuvenate your mind, body, and spirit in nature's embrace
          </p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Wellness in Harmony with Nature
          </h2>
          <p className="text-lg text-muted-foreground font-body leading-relaxed mb-8">
            Our spa philosophy embraces the healing power of the mountains, combining ancient 
            Ayurvedic wisdom with modern wellness practices. Every treatment is designed to 
            restore balance and reconnect you with your inner peace.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Natural Ingredients</h3>
              <p className="text-muted-foreground font-body text-sm">
                Organic oils and herbs sourced from local forests and farms
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Holistic Approach</h3>
              <p className="text-muted-foreground font-body text-sm">
                Treatments that address mind, body, and spiritual wellness
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">Expert Therapists</h3>
              <p className="text-muted-foreground font-body text-sm">
                Certified practitioners trained in traditional and modern techniques
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Spa Services
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative">
                  <img 
                    src={service.image}
                    alt={service.name}
                    className="w-full h-48 object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                    {service.price}
                  </Badge>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold mb-2">{service.name}</h3>
                  
                  <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-body text-sm">{service.duration}</span>
                  </div>
                  
                  <p className="text-muted-foreground font-body text-sm mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="font-body font-semibold mb-2 text-foreground text-sm">Benefits:</h4>
                    <div className="flex flex-wrap gap-1">
                      {service.benefits.slice(0, 2).map((benefit, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                      {service.benefits.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{service.benefits.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button className="w-full font-body">
                    Book a Slot
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wellness Packages */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12 text-foreground">
            Wellness Packages
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {packages.map((pkg, index) => (
              <div key={index} className="bg-card border rounded-lg p-8">
                <h3 className="text-2xl font-heading font-bold mb-3 text-foreground">{pkg.name}</h3>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-body">{pkg.duration}</span>
                  </div>
                  <div className="text-2xl font-heading font-bold text-primary">{pkg.price}</div>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-body font-semibold mb-3 text-foreground">Package Includes:</h4>
                  <ul className="space-y-2">
                    {pkg.includes.map((item, idx) => (
                      <li key={idx} className="font-body text-muted-foreground text-sm flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button className="w-full font-body">
                  Book Package
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Info */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Ready to Unwind?
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            Book your spa treatments in advance to ensure availability. 
            Our wellness concierge can help design a personalized experience for your stay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="font-body">
              Book Spa Treatments
            </Button>
            <Button variant="outline" size="lg" className="font-body">
              Wellness Consultation
            </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default Spa;