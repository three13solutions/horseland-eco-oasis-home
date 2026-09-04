import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/v2/components/Navigation';
import DynamicFooter from '@/v2/components/DynamicFooter';
import CombinedFloating from '@/v2/components/CombinedFloating';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Hotel, TreePine, Shield, HelpCircle } from 'lucide-react';
import { useSiteSettings } from '@/v2/hooks/useStaticContent';
import { getPageBySlug, getMediaUrl, parentFaqCategories, getFaqSubCategories, getFaqItems } from '@/v2/data';

const iconMap: Record<string, any> = {
  BookOpen,
  Hotel,
  TreePine,
  Shield,
  HelpCircle,
};

const FAQ = () => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  const page = getPageBySlug('faq');
  let heroImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80';
  if (page) {
    if (page.hero_type === 'carousel' && Array.isArray(page.hero_gallery) && page.hero_gallery.length > 0) {
      heroImage = String(page.hero_gallery[0]);
    } else if (page.hero_image) {
      heroImage = getMediaUrl(page.hero_image_key, page.hero_image) || page.hero_image;
    }
  }

  const faqSections = parentFaqCategories.map((category) => {
    const subCategories = getFaqSubCategories(category.id);
    const groups = subCategories.length > 0
      ? subCategories.map((sub) => ({
          id: sub.id,
          title: sub.title,
          faqs: getFaqItems(sub.id).map((item) => ({
            question: item.question,
            answer: item.answer,
          })),
        }))
      : [];

    const directFaqs = getFaqItems(category.id).map((item) => ({
      question: item.question,
      answer: item.answer,
    }));

    return {
      id: category.id,
      title: category.title,
      icon: iconMap[category.icon] || HelpCircle,
      faqs: directFaqs,
      groups,
    };
  });

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

      {/* FAQ Sections */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          {faqSections.map((section) => {
            const IconComponent = section.icon;

            return (
              <div key={section.id} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                    {section.title}
                  </h2>
                </div>

                {section.faqs.length > 0 && (
                  <Accordion type="single" collapsible className="space-y-4 mb-6">
                    {section.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${section.id}-${index}`}
                        className="bg-card border rounded-lg px-6"
                      >
                        <AccordionTrigger className="text-left font-body font-semibold text-foreground hover:text-primary transition-colors">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground font-body leading-relaxed pt-2 pb-4">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {section.groups.map((group) => (
                  <div key={group.id} className="mb-6">
                    <h3 className="text-lg md:text-xl font-heading font-semibold text-foreground mb-4 pl-1">
                      {group.title}
                    </h3>
                    <Accordion type="single" collapsible className="space-y-4">
                      {group.faqs.map((faq, index) => (
                        <AccordionItem
                          key={index}
                          value={`${group.id}-${index}`}
                          className="bg-card border rounded-lg px-6"
                        >
                          <AccordionTrigger className="text-left font-body font-semibold text-foreground hover:text-primary transition-colors">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground font-body leading-relaxed pt-2 pb-4">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
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
              onClick={() => navigate('/v2/contact')}
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
