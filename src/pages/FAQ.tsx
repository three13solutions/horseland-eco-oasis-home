import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import DynamicFooter from '../components/DynamicFooter';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Hotel, TreePine, Shield } from 'lucide-react';

const FAQ = () => {
  const faqSections = [
    {
      id: 'booking',
      title: 'Booking & Reservations',
      icon: BookOpen,
      faqs: [
        {
          question: 'How far in advance should I book my stay?',
          answer: 'We recommend booking at least 2-3 weeks in advance, especially during peak seasons (October-February and during monsoons). Weekend bookings tend to fill up faster, so early booking ensures better room availability and rates.'
        },
        {
          question: 'What is your cancellation policy?',
          answer: 'Cancellations made 7 days before arrival receive a full refund minus processing charges. Cancellations made 3-7 days before arrival receive a 50% refund. Cancellations within 72 hours of arrival are non-refundable. Special packages may have different cancellation terms.'
        },
        {
          question: 'Do you accept group bookings?',
          answer: 'Yes, we welcome group bookings for 8 or more guests. Group rates and special arrangements are available for corporate retreats, family gatherings, and celebrations. Please contact our reservations team for customized group packages.'
        },
        {
          question: 'Can I modify my booking dates?',
          answer: 'Date modifications are subject to availability and may incur rate differences. We recommend contacting us at least 48 hours before your arrival to discuss changes. Modifications during peak season may be limited.'
        }
      ]
    },
    {
      id: 'stay',
      title: 'Stay & Accommodation',
      icon: Hotel,
      faqs: [
        {
          question: 'What time is check-in and check-out?',
          answer: 'Check-in is from 2:00 PM and check-out is until 11:00 AM. Early check-in and late check-out are available on request, subject to room availability and may incur additional charges.'
        },
        {
          question: 'What amenities are included in the rooms?',
          answer: 'All rooms include comfortable bedding, mountain or garden views, complimentary WiFi, tea/coffee making facilities, and daily housekeeping. Premium rooms also include mini-bar, room service, and enhanced bathroom amenities.'
        },
        {
          question: 'Is WiFi available throughout the property?',
          answer: 'Yes, complimentary WiFi is available in all rooms and common areas. However, as we\'re in a hill station, connectivity may occasionally be slower than urban areas. We encourage guests to embrace the digital detox opportunity!'
        },
        {
          question: 'Do you provide transportation from the nearest railway station?',
          answer: 'Yes, we offer pick-up services from Neral railway station (the gateway to Matheran) at additional charges. Advance booking is required. Our team can also arrange toy train tickets and guide you on the best travel route to reach us.'
        }
      ]
    },
    {
      id: 'experiences',
      title: 'Activities & Experiences',
      icon: TreePine,
      faqs: [
        {
          question: 'Are activities suitable for children?',
          answer: 'Most of our activities are family-friendly and suitable for children above 5 years. Horse riding, nature walks, and bonfire evenings are particularly popular with kids. Some adventure activities like rock climbing have age restrictions for safety.'
        },
        {
          question: 'Do I need to book spa treatments in advance?',
          answer: 'Yes, we highly recommend booking spa treatments at the time of reservation or immediately upon arrival. Our spa operates by appointment only to ensure personalized attention and availability of preferred treatment times.'
        },
        {
          question: 'What should I wear for outdoor activities?',
          answer: 'We recommend comfortable walking shoes, layered clothing, and carrying a light jacket even during warmer months. For specific activities like rock climbing or extended treks, our team will provide detailed packing suggestions upon booking.'
        },
        {
          question: 'Are pets allowed on the property?',
          answer: 'We love pets! Well-behaved pets are welcome with prior notification and a nominal pet fee. Pet-friendly rooms are limited, so please mention your furry companion while booking. Pet owners are responsible for their pet\'s behavior and cleanliness.'
        }
      ]
    },
    {
      id: 'policies',
      title: 'Policies & Guidelines',
      icon: Shield,
      faqs: [
        {
          question: 'What is your policy on smoking and alcohol?',
          answer: 'Smoking is prohibited in all indoor areas and rooms. Designated outdoor smoking areas are available. Alcohol consumption is permitted in rooms and designated areas. We maintain a peaceful environment and request guests to be mindful of noise levels.'
        },
        {
          question: 'Do you accommodate special dietary requirements?',
          answer: 'Absolutely! We cater to vegetarian, vegan, gluten-free, Jain, and other dietary preferences. Please inform us of any food allergies or special requirements during booking or upon arrival. Our chefs are experienced in preparing customized meals.'
        },
        {
          question: 'What safety measures do you have in place?',
          answer: 'Our property maintains 24/7 security, CCTV surveillance in common areas, first aid facilities, and trained staff for emergency situations. All activities are conducted with proper safety equipment and experienced guides. A doctor on call is available for medical emergencies.'
        },
        {
          question: 'Is Matheran really vehicle-free?',
          answer: 'Yes, Matheran is Asia\'s only automobile-free hill station. No private vehicles are allowed beyond Dasturi Naka. Transportation within Matheran is by foot, horseback, or hand-pulled rickshaws. This creates the unique peaceful atmosphere that makes Matheran special.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center">
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
                
                <Accordion type="single" collapsible className="space-y-4">
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
            <Button size="lg" className="font-body">
              Contact Us
            </Button>
            <Button variant="outline" size="lg" className="font-body">
              Call +91 98765 43210
            </Button>
          </div>
        </div>
      </section>

      <DynamicFooter />
      <FloatingElementsV5 />
    </div>
  );
};

export default FAQ;