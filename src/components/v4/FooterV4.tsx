import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FooterV4 = () => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter submission
    console.log('Newsletter signup:', email);
    setEmail('');
  };

  const quickLinks = [
    { name: 'About Us', href: '#about' },
    { name: 'Rooms & Suites', href: '#stay' },
    { name: 'Dining', href: '#dining' },
    { name: 'Spa & Wellness', href: '#spa' },
    { name: 'Activities', href: '#activities' },
    { name: 'Packages', href: '#packages' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Contact', href: '#contact' }
  ];

  const policies = [
    { name: 'Booking', href: '/policies#booking-policy' },
    { name: 'Cancellation', href: '/policies#cancellation-refunds' },
    { name: 'Payment', href: '/policies#payment-policy' },
    { name: 'Privacy', href: '/policies#privacy-policy' },
    { name: 'Terms', href: '/policies#terms-conditions' },
    { name: 'Guest Conduct', href: '/policies#guest-conduct-policy' }
  ];

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' }
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand & Contact */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                alt="Horseland Hotel" 
                className="h-12 w-12"
              />
              <div>
                <h3 className="text-xl font-bold">HORSELAND</h3>
                <p className="text-sm text-background/70 uppercase tracking-wider">Hotel</p>
              </div>
            </div>
            
            <p className="text-background/80 mb-6 leading-relaxed max-w-md">
              Where the forest whispers you awake. Experience mindful mountain living in Matheran's pristine no-car eco zone.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/80">Matheran Hill Station, Maharashtra, India</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/80">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/80">hello@horselandmatheran.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Policies</h4>
            <ul className="space-y-2 mb-6">
              {policies.map((policy) => (
                <li key={policy.name}>
                  <Link 
                    to={policy.href}
                    className="text-sm text-background/70 hover:text-primary transition-colors"
                  >
                    {policy.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Newsletter */}
            <div>
              <h4 className="font-semibold mb-3">Mountain Newsletter</h4>
              <p className="text-sm text-background/70 mb-3">
                Stories from the mountains, delivered monthly
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
                  required
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Subscribe
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Social Links & Emergency */}
        <div className="border-t border-background/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Social Media */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-background/70">Follow us:</span>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors group"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4 text-background/70 group-hover:text-primary-foreground" />
                </a>
              ))}
            </div>

            {/* Emergency Contact */}
            <div className="text-center md:text-right">
              <p className="text-sm text-background/70 mb-1">24/7 Emergency Contact</p>
              <p className="text-primary font-semibold">+91 98765 43210</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 pt-6 mt-6 text-center">
          <p className="text-sm text-background/60">
            © 2024 Horseland Hotel. All rights reserved. | 
            <span className="text-background/40"> Crafted with ♡ for mountain lovers</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterV4;