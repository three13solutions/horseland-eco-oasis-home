import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, Package, ExternalLink, Linkedin, Video, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FooterSection {
  id: string;
  section_key: string;
  title: string;
  content: any;
  is_active: boolean;
}


interface SiteSettings {
  brand_name: string;
  brand_monogram: string;
  brand_descriptor: string;
  copyright_text: string;
  credits: string;
}

const DynamicFooter = () => {
  const [footerSections, setFooterSections] = useState<FooterSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    brand_name: 'Horseland Hotel',
    brand_monogram: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
    brand_descriptor: 'Hotel',
    copyright_text: '© 2024 Horseland Hotel. All rights reserved.',
    credits: 'Powered by <a href="https://313s.com/" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">IIIXIII</a>'
  });
  const location = useLocation();
  const isOnPoliciesPage = location.pathname === '/policies';

  useEffect(() => {
    loadFooterData();
  }, []);

  const loadFooterData = async () => {
    try {
      // Load footer sections
      const { data: footerData } = await supabase
        .from('footer_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      // Load site settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*');

      if (footerData) {
        setFooterSections(footerData);
      }

      if (settingsData) {
        const settings: any = {};
        settingsData.forEach(setting => {
          // Supabase automatically parses JSONB columns
          // Just use the value directly
          settings[setting.setting_key] = setting.setting_value;
        });
        setSiteSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading footer data:', error);
    }
  };

  const getBrandSection = () => footerSections.find(s => s.section_key === 'brand');
  const getContactSection = () => footerSections.find(s => s.section_key === 'contact');
  const getSocialSection = () => footerSections.find(s => s.section_key === 'social');
  const getPoliciesSection = () => footerSections.find(s => s.section_key === 'policies');
  const getNewsletterSection = () => footerSections.find(s => s.section_key === 'newsletter');

  const brandSection = getBrandSection();
  const contactSection = getContactSection();
  const socialSection = getSocialSection();
  const policiesSection = getPoliciesSection();
  const newsletterSection = getNewsletterSection();

  const handlePolicyClick = (sectionKey: string) => {
    if (isOnPoliciesPage) {
      // If already on policies page, just update hash and trigger tab change
      window.location.hash = sectionKey;
      // Dispatch a hashchange event to trigger the tab change
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const PolicyLink = ({ sectionKey, children, className }: { sectionKey: string; children: React.ReactNode; className: string }) => {
    if (isOnPoliciesPage) {
      return (
        <button
          onClick={() => handlePolicyClick(sectionKey)}
          className={className}
        >
          {children}
        </button>
      );
    } else {
      return (
        <Link to={`/policies#${sectionKey}`} className={className}>
          {children}
        </Link>
      );
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'tiktok': return <Video className="w-5 h-5" />;
      case 'whatsapp': return <MessageCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <footer className="bg-gradient-to-b from-foreground to-foreground/90 text-background relative overflow-hidden">
      {/* Background Decoration - Inspired by v2 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-8">
          {/* Brand Section - Column 1 */}
          <div className="md:col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src={siteSettings.brand_monogram} 
                alt={siteSettings.brand_name}
                className="h-20 w-auto drop-shadow-lg"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xl text-background">
                  {siteSettings.brand_name}
                </span>
                {siteSettings.brand_descriptor && (
                  <span className="text-background/80 text-sm">
                    {siteSettings.brand_descriptor}
                  </span>
                )}
              </div>
            </div>
            {brandSection && (
              <p className="text-background/80 leading-relaxed text-sm">
                {brandSection.content.description}
              </p>
            )}
          </div>

          {/* Newsletter Section - Second Column */}
          {newsletterSection && (
            <div className="md:col-span-2 lg:col-span-2 space-y-4">
              <h3 className="text-xl font-semibold text-background flex items-center">
                <Mail className="w-5 h-5 mr-2 text-primary" />
                {newsletterSection.content.title || 'Stay Connected'}
              </h3>
              <p className="text-background/80 text-sm">
                {newsletterSection.content.description || 'Subscribe for updates and special offers'}
              </p>
              <div className="flex flex-col space-y-3">
                <Input 
                  placeholder="Enter your email" 
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50 rounded-xl"
                />
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                  Subscribe
                </Button>
              </div>
            </div>
          )}

          {/* Packages - Third Column */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4 md:pl-6 lg:pl-8">
            <h3 className="text-lg font-semibold text-background">
              Explore Packages
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/packages" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm">
                  Family Adventure
                </Link>
              </li>
              <li>
                <Link to="/packages" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm">
                  Romantic Getaway
                </Link>
              </li>
              <li>
                <Link to="/packages" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm">
                  Corporate Retreat
                </Link>
              </li>
              <li>
                <Link to="/packages" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm">
                  Adventure Seeker
                </Link>
              </li>
            </ul>
            <Link 
              to="/packages" 
              className="inline-flex items-center text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              View All Packages
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {/* Connect Section - Fourth Column */}
          {contactSection && (
            <div className="md:col-span-2 lg:col-span-2 space-y-6">
              <h4 className="text-xl font-semibold text-background">Connect</h4>
              <div className="space-y-4">
                {contactSection.content.email && (
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-background/80 text-xs">Email Us</p>
                      <p className="font-medium text-background text-sm">{contactSection.content.email}</p>
                    </div>
                  </div>
                )}
                {contactSection.content.phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-background/80 text-xs">24/7 Reservations</p>
                      <p className="font-medium text-background text-sm">{contactSection.content.phone}</p>
                    </div>
                  </div>
                )}
                {contactSection.content.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-background/80 text-xs">Visit Us</p>
                      <a 
                        href="https://maps.google.com/?q=Horseland+Hotel+Matheran+Hill+Station+Maharashtra+India"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-background text-sm hover:text-primary transition-colors cursor-pointer"
                      >
                        Matheran Hill Station<br />Maharashtra, India 410102
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Policies and Social Row */}
        <div className="mt-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-8">
            {/* Policies - Left Side - Spans 2 columns like brand section */}
            <div className="md:col-span-6 lg:col-span-6">
              <h4 className="text-sm font-semibold text-background mb-3">Policies</h4>
              <div className="flex items-center space-x-3 text-sm text-background/60">
                <PolicyLink sectionKey="booking" className="hover:text-primary transition-colors whitespace-nowrap">Booking</PolicyLink>
                <PolicyLink sectionKey="cancellation" className="hover:text-primary transition-colors whitespace-nowrap">Cancellation</PolicyLink>
                <PolicyLink sectionKey="payment" className="hover:text-primary transition-colors whitespace-nowrap">Payment</PolicyLink>
                <PolicyLink sectionKey="privacy" className="hover:text-primary transition-colors whitespace-nowrap">Privacy</PolicyLink>
                <PolicyLink sectionKey="terms" className="hover:text-primary transition-colors whitespace-nowrap">Terms</PolicyLink>
                <PolicyLink sectionKey="guest" className="hover:text-primary transition-colors whitespace-nowrap">Guest Conduct</PolicyLink>
              </div>
            </div>
            
            {/* Social Icons - Right Side - Aligned with Connect column */}
            {socialSection && (
              <div className="md:col-span-2 lg:col-span-2 space-y-3">
                <p className="text-background/80 text-sm">Follow Our Journey</p>
                <div className="flex space-x-3">
                  {socialSection.content.networks && 
                    socialSection.content.networks
                      .filter((network: any) => network.enabled && network.url)
                      .map((network: any) => (
                        <a
                          key={network.platform}
                          href={network.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-background/10 rounded-full hover:bg-background/20 transition-all duration-300 transform hover:scale-110 text-background/80 hover:text-primary"
                        >
                          {getSocialIcon(network.platform)}
                        </a>
                      ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-8 pt-6">
          {/* Copyright Row */}
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-background/60">
              {siteSettings.copyright_text}
            </p>
            <p 
              className="text-sm text-background/60"
              dangerouslySetInnerHTML={{ __html: siteSettings.credits }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;