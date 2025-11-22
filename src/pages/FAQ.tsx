import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import DynamicFooter from '../components/DynamicFooter';
import CombinedFloating from '../components/CombinedFloating';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Hotel, TreePine, Shield, HelpCircle, Info, MessageCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface FAQSection {
  parentTitle: string;
  parentIcon: React.ElementType;
  subSections: {
    title: string;
    icon: React.ElementType;
    items: {
      question: string;
      answer: string;
    }[];
  }[];
}

const FAQ = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const [heroImage, setHeroImage] = useState<string>('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch page hero data
      const { data: pageData } = await supabase
        .from('pages')
        .select('hero_image, hero_gallery, hero_type')
        .eq('slug', 'faq')
        .eq('is_published', true)
        .single();

      if (pageData) {
        if (pageData.hero_type === 'carousel' && pageData.hero_gallery && Array.isArray(pageData.hero_gallery) && pageData.hero_gallery.length > 0) {
          setHeroImage(String(pageData.hero_gallery[0]));
        } else if (pageData.hero_image) {
          setHeroImage(pageData.hero_image);
        }
      }

      // Fetch parent categories (the 4 main sections)
      const { data: parentCategories } = await supabase
        .from('faq_categories')
        .select('*')
        .is('parent_id', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Fetch all sub-categories
      const { data: allCategories } = await supabase
        .from('faq_categories')
        .select('*')
        .not('parent_id', 'is', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Fetch FAQ items
      const { data: items } = await supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (parentCategories && allCategories && items) {
        // Map icon strings to actual icon components
        const iconMap: Record<string, any> = {
          BookOpen: BookOpen,
          Hotel: Hotel,
          TreePine: TreePine,
          Shield: Shield,
          HelpCircle: HelpCircle,
          Info: Info,
          MessageCircle: MessageCircle,
          Settings: Settings,
        };

        // Build hierarchical sections: Parent → Sub-categories → FAQ items
        const sectionsData = parentCategories.map((parent: any) => {
          // Get sub-categories for this parent
          const subCategories = allCategories.filter(
            (cat: any) => cat.parent_id === parent.id
          );

          // For each sub-category, get its FAQ items
          const subSections = subCategories.map((subCat: any) => {
            const categoryItems = items.filter(
              (item: any) => item.category_id === subCat.id
            );

            return {
              title: subCat.title,
              icon: iconMap[subCat.icon] || BookOpen,
              items: categoryItems.map((item: any) => ({
                question: item.question,
                answer: item.answer,
              })),
            };
          }).filter((sub) => sub.items.length > 0);

          return {
            parentTitle: parent.title,
            parentIcon: iconMap[parent.icon] || BookOpen,
            subSections,
          };
        }).filter((section) => section.subSections.length > 0);

        setFaqSections(sectionsData);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${heroImage}')` }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg md:text-xl font-body opacity-90">
            Everything you need to know for your mountain retreat
          </p>
        </div>
      </section>

      {/* FAQ Sections - Hierarchical Display */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-20">
          {faqSections.map((parentSection, parentIndex) => {
            const ParentIcon = parentSection.parentIcon;
            
            return (
              <div key={parentIndex} className="space-y-8">
                {/* Parent Category Header */}
                <div className="flex items-center gap-4 mb-8 pb-4 border-b-2 border-primary/20">
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <ParentIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
                    {parentSection.parentTitle}
                  </h2>
                </div>

                {/* Sub-categories under this parent */}
                {parentSection.subSections.map((subSection, subIndex) => {
                  const SubIcon = subSection.icon;
                  
                  return (
                    <div key={subIndex} className="space-y-4 ml-0 md:ml-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <SubIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-heading font-semibold text-foreground">
                          {subSection.title}
                        </h3>
                      </div>
                      
                      <Accordion type="single" collapsible className="space-y-3">
                        {subSection.items.map((item, itemIndex) => (
                          <AccordionItem
                            key={itemIndex}
                            value={`item-${parentIndex}-${subIndex}-${itemIndex}`}
                            className="bg-card border rounded-lg px-6"
                          >
                            <AccordionTrigger className="text-left font-body font-semibold text-foreground hover:text-primary transition-colors py-5">
                              {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground font-body leading-relaxed pt-2 pb-5">
                              {item.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 text-foreground">
            Still Have Questions?
          </h2>
          <p className="text-lg text-muted-foreground font-body mb-8 leading-relaxed">
            Our hospitality team is here to help you plan the perfect mountain getaway. 
            Reach out to us for personalized assistance with your booking and stay preferences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="font-body"
              onClick={() => navigate('/contact')}
            >
              Contact Us
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="font-body"
              onClick={() => window.location.href = `tel:${settings.phone_number}`}
            >
              Call {settings.phone_number}
            </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <CombinedFloating />
    </div>
  );
};

export default FAQ;