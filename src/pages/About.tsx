import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import { Leaf, Award, Heart, Mountain } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')"
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Our Story Began in the Hills
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90 max-w-2xl mx-auto">
            Where time slows down and nature whispers its ancient secrets. 
            Welcome to Horseland Hotel.
          </p>
        </div>
      </section>

      {/* Legacy Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
                A Legacy of Hospitality
              </h2>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">
                Since our founding in 1987, Horseland has been a sanctuary for those seeking 
                respite from urban life. Nestled in the pristine hills of Matheran, we've 
                cultivated an experience that honors both heritage and sustainability.
              </p>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                Our commitment to eco-conscious hospitality and authentic wellness has made 
                us a cherished destination for families, couples, and conscious travelers 
                from around the world.
              </p>
              <Button size="lg" className="font-body">
                Our Values
              </Button>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Historic hotel building"
                className="rounded-lg shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Matheran Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
              Discover Matheran
            </h2>
            <p className="text-lg text-muted-foreground font-body max-w-3xl mx-auto">
              India's only vehicle-free hill station, where red mud trails wind through 
              ancient forests and clean mountain air fills your lungs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Vehicle-Free Zone</h3>
              <p className="text-muted-foreground font-body">
                Pure air, peaceful walks, and the symphony of nature undisturbed by engines.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mountain className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Red Mud Trails</h3>
              <p className="text-muted-foreground font-body">
                Distinctive rust-colored paths that lead to breathtaking viewpoints and hidden groves.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Forest Living</h3>
              <p className="text-muted-foreground font-body">
                Immerse yourself in nature where ancient trees create natural sanctuaries of calm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recognition Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-foreground">
            Recognition & Awards
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card border rounded-lg p-6">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-3">Eco-Tourism Excellence</h3>
              <p className="text-muted-foreground font-body">
                Maharashtra Tourism Board, 2023
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-3">Sustainable Hospitality</h3>
              <p className="text-muted-foreground font-body">
                India Hospitality Awards, 2022
              </p>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-muted-foreground font-body italic">
              "A perfect blend of luxury and sustainability in the heart of nature." 
              <br />— Travel + Leisure India
            </p>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default About;