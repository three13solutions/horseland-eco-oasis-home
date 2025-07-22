import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FooterSection {
  id: string;
  section_key: string;
  title: string;
  content: any;
  is_active: boolean;
}

interface SiteSettings {
  site_title: string;
  site_logo: string;
  copyright_text: string;
  tagline: string;
}

const DynamicFooter = () => {
  const [footerSections, setFooterSections] = useState<FooterSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_title: 'Horseland Hotel',
    site_logo: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png',
    copyright_text: '© 2024 Horseland Hotel & Mountain Spa. All rights reserved.',
    tagline: 'Crafted with care for sustainable luxury'
  });

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
          settings[setting.setting_key] = JSON.parse(setting.setting_value as string);
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

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img 
                src={siteSettings.site_logo} 
                alt={siteSettings.site_title}
                className="h-48 w-auto drop-shadow-lg"
              />
            </div>
            {brandSection && (
              <div className="space-y-6">
                <p className="text-background/80 leading-relaxed">
                  {brandSection.content.description}
                </p>
                {/* Newsletter moved here */}
                {newsletterSection && (
                  <>
                    <h3 className="text-xl font-semibold text-background flex items-center">
                      <Mail className="w-5 h-5 mr-2 text-primary" />
                      {newsletterSection.content.title || 'Stay Connected'}
                    </h3>
                    <p className="text-background/80 text-sm">
                      {newsletterSection.content.description || 'Subscribe for updates and special offers'}
                    </p>
                    <div className="flex space-x-3 max-w-md">
                      <Input 
                        placeholder="Enter your email" 
                        className="bg-background/10 border-background/20 text-background placeholder:text-background/50 rounded-xl"
                      />
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6">
                        Subscribe
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-background">Explore</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">About Us</Link></li>
              <li><Link to="/stay" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">Accommodation</Link></li>
              <li><Link to="/experiences" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">Experiences</Link></li>
              <li><Link to="/packages" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">Packages</Link></li>
              <li><Link to="/journal" className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">Journal</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-background">Policies</h3>
            {policiesSection && policiesSection.content.links && (
              <ul className="space-y-3">
                {policiesSection.content.links.map((link: any, index: number) => (
                  <li key={index}>
                    <Link to={link.href} className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            {contactSection && (
              <div className="space-y-6">
                <h4 className="text-xl font-semibold text-background">Connect</h4>
                <div className="space-y-4">
                  {contactSection.content.email && (
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-background/80 text-sm">Email Us</p>
                        <p className="font-medium text-background">{contactSection.content.email}</p>
                      </div>
                    </div>
                  )}
                  {contactSection.content.phone && (
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-background/80 text-sm">24/7 Reservations</p>
                        <p className="font-medium text-background">{contactSection.content.phone}</p>
                      </div>
                    </div>
                  )}
                  {contactSection.content.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-background/80 text-sm">Visit Us</p>
                        <p className="font-medium text-background">{contactSection.content.address}</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Social Icons moved here */}
                {socialSection && (
                  <div className="space-y-3">
                    <p className="text-background/80 text-sm">Follow Our Journey</p>
                    <div className="flex space-x-4">
                      {Object.entries(socialSection.content).map(([platform, url]) => (
                        <Link
                          key={platform}
                          to={url as string}
                          className="p-3 bg-background/10 rounded-full hover:bg-background/20 transition-all duration-300 transform hover:scale-110 text-background/80 hover:text-primary"
                        >
                          {getSocialIcon(platform)}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-background/60">
              {siteSettings.copyright_text}
            </p>
            <p className="text-sm text-background/60">
              {siteSettings.tagline}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;