import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles, 
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const FooterV5 = () => {
  const { t } = useTranslation();
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const { settings } = useSiteSettings();

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-500' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-red-500' }
  ];

  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        {/* Main Footer Content */}
        <div className="py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* Brand Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex flex-col items-start space-y-4">
                <img 
                  src={settings.brand_monogram || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
                  alt={`${settings.brand_name || "Horseland"} Logo`} 
                  className="h-16 w-16 md:h-20 md:w-20 drop-shadow-lg"
                />
                
                <p className="text-primary-foreground/80 leading-relaxed max-w-lg text-sm font-body">
                  {t('footer.description')}
                </p>

                {/* Newsletter Section */}
                <div className="bg-primary-foreground/10 rounded-xl p-4 space-y-3 w-full max-w-lg">
                  <h4 className="text-sm font-heading font-semibold flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-accent" />
                    {t('footer.newsletter.title')}
                  </h4>
                  <p className="text-xs text-primary-foreground/70 mb-2">
                    {t('footer.newsletter.subtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      placeholder={t('footer.newsletter.placeholder')}
                      className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 rounded-lg text-sm h-9"
                    />
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg px-4 py-2 text-sm whitespace-nowrap h-9">
                      {t('footer.newsletter.subscribe')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-heading font-semibold">{t('footer.connect')}</h4>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">{t('footer.contact.reservations')}</p>
                    <p className="font-medium text-sm">{t('footer.contact.phone')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">{t('footer.contact.emailLabel')}</p>
                    <p className="font-medium text-sm">{t('footer.contact.email')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">{t('footer.contact.visitLabel')}</p>
                    <p className="font-medium text-sm">{t('footer.contact.address')}</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-primary-foreground/90">{t('footer.followUs')}</h5>
                <div className="flex space-x-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      className={`p-2 bg-primary-foreground/10 rounded-lg hover:bg-primary-foreground/20 transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    >
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-primary-foreground/90">{t('footer.quickLinks')}</h5>
                <div className="space-y-1">
                  <a href="#stay" className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                    {t('navigation.stay')}
                  </a>
                  <a href="#experiences" className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                    {t('navigation.experiences')}
                  </a>
                  <a href="#packages" className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                    {t('packages.title')}
                  </a>
                  <a href="#journal" className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                    {t('navigation.journal')}
                  </a>
                  <a href="#contact" className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body">
                    {t('navigation.contact')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Compact */}
        <div className="border-t border-primary-foreground/20 py-4">
          <div className="flex flex-col space-y-3">
            {/* Collapsible Policies */}
            <button 
              onClick={() => setIsPoliciesOpen(!isPoliciesOpen)}
              className="flex items-center justify-between bg-primary-foreground/10 rounded-lg p-3 hover:bg-primary-foreground/20 transition-colors md:hidden"
            >
              <span className="text-sm font-medium">{t('footer.policies')}</span>
              {isPoliciesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {/* Show policies on desktop, or when expanded on mobile */}
            <div className={`${isPoliciesOpen ? 'block' : 'hidden'} md:block`}>
              <div className="flex items-center justify-center md:justify-start space-x-3 text-sm">
                <a href="/policies#booking" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Booking
                </a>
                <a href="/policies#cancellation" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Cancellation
                </a>
                <a href="/policies#payment" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Payment
                </a>
                <a href="/policies#privacy" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Privacy
                </a>
                <a href="/policies#terms" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Terms
                </a>
                <a href="/policies#guest" className="text-primary-foreground/60 hover:text-accent transition-colors font-body whitespace-nowrap">
                  Guest Conduct
                </a>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-primary-foreground/60 text-xs font-body">
                {t('footer.rights')}
              </p>
              <p className="text-primary-foreground/60 text-xs font-body">
                {t('footer.crafted')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV5;