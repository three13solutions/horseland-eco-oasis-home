import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

const FooterV5 = () => {
  const quickLinks = [
    'Stay', 'Experiences', 'Packages', 'Journal', 'Contact'
  ];

  const policies = [
    'Privacy Policy', 'Booking Terms', 'Cancellation', 'Terms of Service'
  ];

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-500' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-red-500' }
  ];

  return (
    <footer className="bg-gradient-to-b from-foreground to-foreground/90 text-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center space-x-4">
                <img 
                  src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                  alt="Horseland Logo" 
                  className="h-16 w-16 drop-shadow-lg"
                />
                <div>
                  <h3 className="text-3xl font-bold">HORSELAND</h3>
                  <p className="text-background/80 text-sm uppercase tracking-wider">Mountain Spa Resort</p>
                </div>
              </div>
              
              <p className="text-background/80 leading-relaxed max-w-lg">
                Where the forest whispers you awake. Experience mindful luxury in Matheran's 
                pristine car-free sanctuary, where every moment connects you deeper with nature.
              </p>

              {/* Newsletter */}
              <div className="space-y-4">
                <h4 className="text-xl font-semibold flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  Stay Connected
                </h4>
                <p className="text-background/80 text-sm">
                  Subscribe for exclusive offers and mountain stories
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
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Quick Links</h4>
              <ul className="space-y-2">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={`#${link.toLowerCase()}`}
                      className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Social */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Connect</h4>
              
              {/* Compact Contact & Social */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="font-medium text-sm">+91 98765 43210</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="font-medium text-sm">hello@horselandresort.com</p>
                </div>
                
                <details className="text-sm">
                  <summary className="cursor-pointer text-background/80 hover:text-primary">Emergency Contact</summary>
                  <p className="mt-1 text-background/60">+91 98765 43210 (24/7)</p>
                </details>
              </div>

              {/* Newsletter & Social Combined */}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <Input 
                    placeholder="Your email" 
                    className="bg-background/10 border-background/20 text-background placeholder:text-background/50 rounded-lg text-sm h-9"
                  />
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 text-sm h-9">
                    Subscribe
                  </Button>
                </div>
                <div className="flex space-x-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      className={`p-2 bg-background/10 rounded-full hover:bg-background/20 transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    >
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start space-x-4 text-xs">
              <details className="cursor-pointer">
                <summary className="text-background/60 hover:text-primary">Policies</summary>
                <div className="mt-2 space-y-1">
                  {policies.map((policy, index) => (
                    <a
                      key={index}
                      href={`#${policy.toLowerCase().replace(' ', '-')}`}
                      className="block text-background/60 hover:text-primary transition-colors"
                    >
                      {policy}
                    </a>
                  ))}
                </div>
              </details>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-background/60 text-xs">
                © 2024 Horseland Resort. All rights reserved.
              </p>
              <p className="text-background/60 text-xs">
                Crafted with ❤️ for sustainable luxury
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV5;