import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import DynamicFooter from '@/components/DynamicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CreditCard, Eye, FileText, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PolicyContent {
  id: string;
  section_key: string;
  title: string;
  description: string;
  content: {
    sections: Array<{
      title: string;
      items: string[];
    }>;
  };
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const Policies = () => {
  const [activeTab, setActiveTab] = React.useState('booking');
  const [policies, setPolicies] = useState<PolicyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState<string>('');

  useEffect(() => {
    loadHeroImage();
  }, []);

  const loadHeroImage = async () => {
    try {
      const { data } = await supabase
        .from('pages')
        .select('hero_image')
        .eq('slug', 'policies')
        .eq('is_published', true)
        .maybeSingle();
      
      if (data?.hero_image) {
        setHeroImage(data.hero_image);
      }
    } catch (error) {
      console.error('Error loading hero image:', error);
    }
  };

  const iconMap: { [key: string]: React.ReactNode } = {
    Clock: <Clock className="w-5 h-5 text-primary" />,
    FileText: <FileText className="w-5 h-5 text-primary" />,
    CreditCard: <CreditCard className="w-5 h-5 text-primary" />,
    Eye: <Eye className="w-5 h-5 text-primary" />,
    Shield: <Shield className="w-5 h-5 text-primary" />,
    Users: <Users className="w-5 h-5 text-primary" />,
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('policies_content')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPolicies((data || []) as unknown as PolicyContent[]);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && policies.some(p => p.section_key === hash)) {
        setActiveTab(hash);
        // Scroll to top when tab changes
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [policies]);

  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroImage || '/lovable-uploads/d4df921c-30f4-4f92-92f2-c84dbcd5b591.png'})`
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">
              Our <span className="text-primary">Policies</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
              Clear, transparent policies to ensure you have the best possible experience at Horseland Hotel.
            </p>
          </div>
        </div>
      </section>

      {/* Policies Content */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="text-center py-8">
              <p>Loading policies...</p>
            </div>
          ) : (
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value);
                // Update URL hash when tab changes
                window.history.replaceState(null, '', `#${value}`);
              }} 
              className="max-w-4xl mx-auto"
            >
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                {policies.map((policy) => (
                  <TabsTrigger key={policy.section_key} value={policy.section_key}>
                    {policy.section_key === 'booking' ? 'Booking' :
                     policy.section_key === 'cancellation' ? 'Cancellation' :
                     policy.section_key === 'payment' ? 'Payment' :
                     policy.section_key === 'privacy' ? 'Privacy' :
                     policy.section_key === 'terms' ? 'Terms' :
                     policy.section_key === 'guest' ? 'Guest' : policy.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {policies.map((policy) => (
                <TabsContent key={policy.section_key} value={policy.section_key} className="mt-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {iconMap[policy.icon]}
                        <span>{policy.title}</span>
                      </CardTitle>
                      <CardDescription>
                        {policy.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {policy.content.sections.map((section, index) => (
                        <div key={index}>
                          <h3 className="text-lg font-semibold text-foreground mb-3">{section.title}</h3>
                          <ul className="space-y-2 text-muted-foreground">
                            {section.items.map((item, itemIndex) => (
                              <li key={itemIndex}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
};

export default Policies;