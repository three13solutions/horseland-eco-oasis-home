
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  const quickLinks = [
    { title: 'About Us', href: '#about' },
    { title: 'Accommodations', href: '#stay' },
    { title: 'Experiences', href: '#experiences' },
    { title: 'Contact', href: '#contact' },
    { title: 'Journal', href: '#journal' }
  ];

  const policyLinks = [
    { title: 'Privacy Policy', href: '#privacy' },
    { title: 'Refund Policy', href: '#refund' },
    { title: 'Terms & Conditions', href: '#terms' },
    { title: 'Cancellation Policy', href: '#cancellation' }
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
                src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                alt="Horseland Hotel & Mountain Spa Logo" 
                className="h-10 w-10"
              />
              <h3 className="text-xl font-bold">Horseland</h3>
            </div>
            <p className="text-background/80 mb-6 leading-relaxed">
              A luxury eco-retreat nestled in Matheran's pristine hills, offering 
              sustainable hospitality and unforgettable mountain experiences.
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

          {/* Newsletter & Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Stay Connected</h4>
            
            {/* Newsletter */}
            <div className="mb-6">
              <p className="text-background/80 mb-3 text-sm">
                Subscribe for updates and special offers
              </p>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Your email" 
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/60"
                />
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-background/80 text-sm">info@horselandhotel.com</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span className="text-background/80 text-sm">
                  Matheran Hill Station,<br />Maharashtra, India
                </span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-background/60 text-sm">
              © 2024 Horseland Hotel & Mountain Spa. All rights reserved.
            </p>
            <p className="text-background/60 text-sm">
              Crafted with care for sustainable luxury
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
