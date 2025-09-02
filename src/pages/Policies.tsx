import React, { useEffect, useState } from 'react';
import NavigationV5 from '@/components/v5/NavigationV5';
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
      setPolicies((data || []) as PolicyContent[]);
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
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Scroll to top when component mounts or hash changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [policies]);

  return (
    <div className="min-h-screen bg-background">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              Our <span className="text-primary">Policies</span>
            </h1>
            <p className="text-lg text-muted-foreground">
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
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