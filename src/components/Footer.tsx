import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Footer = () => {
  const { settings } = useSiteSettings();
  
  const quickLinks = [
    { title: 'About Us', href: '#about' },
    { title: 'Accommodations', href: '#stay' },
    { title: 'Experiences', href: '#experiences' },
    { title: 'Contact', href: '#contact' },
    { title: 'Journal', href: '#journal' }
  ];

  const policyLinks = [
    { title: 'Privacy Policy', href: '/policies#privacy' },
    { title: 'Refund Policy', href: '/policies#payment' },
    { title: 'Terms & Conditions', href: '/policies#terms' },
    { title: 'Booking Policy', href: '/policies#booking' }
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Youtube, href: '#', label: 'YouTube' }
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={settings.brand_monogram || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
                alt={`${settings.brand_name || "Horseland"} Hotel Logo`} 
                className="h-10 w-10"
              />
              <h3 className="text-xl font-bold">{settings.brand_name || "Horseland"}</h3>
            </div>
            <p className="text-background/80 mb-6 leading-relaxed">
              An affordable eco-retreat nestled in Matheran's pristine hills, offering 
              comfortable accommodations with experiential mountain experiences.
            </p>
            
            {/* Emergency Contact */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm uppercase tracking-wide">Emergency Contact</h4>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span className="text-background/80">+91 98765 43210</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-background/80 hover:text-background transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Policies</h4>
            <ul className="space-y-2">
              {policyLinks.map((link, index) => (
                <li key={index}>
                  <Link 
                    to={link.href} 
                    className="text-background/80 hover:text-background transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter & Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Stay Connected</h4>
            
            {/* Newsletter */}
            <div className="mb-6">
              <p className="text-background/80 text-sm mb-3">
                Subscribe to our newsletter for updates and exclusive offers.
              </p>
              <div className="flex space-x-2">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/60 focus:border-background/40"
                />
                <Button size="sm" variant="secondary">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-background/80 text-sm">stay@horselandhotel.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span className="text-background/80 text-sm">Matheran, Maharashtra</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex space-x-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="p-2 rounded-full bg-background/10 text-background/70 hover:bg-background/20 hover:text-background transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-background/60 text-sm">
            © 2024 {settings.brand_name || "Horseland"} Hotel. All rights reserved.
          </p>
          <p className="text-background/60 text-sm">
            Crafted with care for unforgettable experiences.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;