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
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img 
                src={siteSettings.site_logo} 
                alt={siteSettings.site_title}
                className="h-16 w-auto"
              />
            </div>
            {brandSection && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-white/80">
                  {brandSection.content.description}
                </p>
                {/* Newsletter moved here */}
                {newsletterSection && (
                  <>
                    <h3 className="text-lg font-semibold text-white">
                      {newsletterSection.content.title || 'Stay Connected'}
                    </h3>
                    <p className="text-sm text-white/80">
                      {newsletterSection.content.description || 'Subscribe for updates and special offers'}
                    </p>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Your email" 
                        className="bg-white/10 border-white/20 text-white placeholder-white/60"
                      />
                      <Button size="sm" variant="secondary">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/stay" className="hover:text-white transition-colors">Accommodation</Link></li>
              <li><Link to="/experiences" className="hover:text-white transition-colors">Experiences</Link></li>
              <li><Link to="/packages" className="hover:text-white transition-colors">Packages</Link></li>
              <li><Link to="/journal" className="hover:text-white transition-colors">Journal</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Policies</h3>
            {policiesSection && policiesSection.content.links && (
              <ul className="space-y-2">
                {policiesSection.content.links.map((link: any, index: number) => (
                  <li key={index}>
                    <Link to={link.href} className="hover:text-white transition-colors">
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
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Contact Info</h4>
                <div className="space-y-2">
                  {contactSection.content.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm text-white/80">{contactSection.content.email}</span>
                    </div>
                  )}
                  {contactSection.content.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm text-white/80">{contactSection.content.phone}</span>
                    </div>
                  )}
                  {contactSection.content.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm text-white/80">{contactSection.content.address}</span>
                    </div>
                  )}
                </div>
                {/* Social Icons moved here */}
                {socialSection && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-white">Follow Us</h5>
                    <div className="flex items-center space-x-4">
                      {Object.entries(socialSection.content).map(([platform, url]) => (
                        <Link
                          key={platform}
                          to={url as string}
                          className="text-white/80 hover:text-white transition-colors"
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
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-white/60">
              {siteSettings.copyright_text}
            </p>
            <p className="text-sm text-white/60">
              {siteSettings.tagline}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;