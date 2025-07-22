import React, { useState } from 'react';
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

const FooterV5 = () => {
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

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
    <footer className="bg-gradient-to-b from-primary to-accent text-primary-foreground relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-accent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        {/* Main Footer Content - Compact Mobile Layout */}
        <div className="py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* Brand Section - Simplified */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center space-x-4">
                <img 
                  src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                  alt="Horseland Logo" 
                  className="h-12 w-12 md:h-16 md:w-16 drop-shadow-lg"
                />
                <div>
                  <h3 className="text-xl md:text-2xl font-heading font-bold">HORSELAND</h3>
                  <p className="text-background/80 text-xs uppercase tracking-wider font-body">Mountain Spa Resort</p>
                </div>
              </div>
              
              <p className="text-primary-foreground/80 leading-relaxed max-w-lg text-sm font-body">
                Where the forest whispers you awake. Experience mindful luxury in Matheran's 
                pristine car-free sanctuary.
              </p>

              {/* Compact Newsletter + Social */}
              <div className="bg-primary-foreground/10 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-heading font-semibold flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-accent" />
                  Mountain Mailers
                </h4>
                <p className="text-xs text-primary-foreground/70 mb-2">
                  Musings from the mountains, delivered monthly
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input 
                    placeholder="Enter your email" 
                    className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 rounded-lg text-sm h-9"
                  />
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg px-4 py-2 text-sm whitespace-nowrap h-9">
                    Subscribe
                  </Button>
                </div>
                {/* Social Links Row */}
                <div className="flex justify-center sm:justify-start space-x-3">
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
            </div>

            {/* Contact & Links - Compact */}
            <div className="space-y-4">
              <h4 className="text-lg font-heading font-semibold">Connect</h4>
              
              {/* Compact Contact Info */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">24/7 Reservations</p>
                    <p className="font-medium text-sm">+91 98765 43210</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">Email Us</p>
                    <p className="font-medium text-sm">hello@horselandresort.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">Visit Us</p>
                    <p className="font-medium text-sm">Matheran, Maharashtra</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact - Expandable */}
              <button 
                onClick={() => setIsEmergencyOpen(!isEmergencyOpen)}
                className="flex items-center justify-between w-full text-left bg-primary-foreground/10 rounded-lg p-3 hover:bg-primary-foreground/20 transition-colors"
              >
                <span className="text-sm font-medium">Emergency Contact</span>
                {isEmergencyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {isEmergencyOpen && (
                <div className="bg-primary-foreground/10 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium">24/7 Emergency Hotline</p>
                  <p className="text-primary-foreground/80">+91 98765 43210</p>
                  <p className="text-primary-foreground/80 text-xs">Available for all guest emergencies</p>
                </div>
              )}

              {/* Quick Links */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-primary-foreground/90">Quick Links</h5>
                <div className="space-y-1">
                  {quickLinks.map((link, index) => (
                    <a 
                      key={index}
                      href={`#${link.toLowerCase()}`}
                      className="block text-primary-foreground/70 hover:text-accent transition-colors text-xs font-body"
                    >
                      {link}
                    </a>
                  ))}
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
              <span className="text-sm font-medium">Policies & Legal</span>
              {isPoliciesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {/* Show policies on desktop, or when expanded on mobile */}
            <div className={`${isPoliciesOpen ? 'block' : 'hidden'} md:block`}>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                {policies.map((policy, index) => (
                  <a
                    key={index}
                    href={`#${policy.toLowerCase().replace(' ', '-')}`}
                    className="text-primary-foreground/60 hover:text-accent transition-colors font-body"
                  >
                    {policy}
                  </a>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-primary-foreground/60 text-xs font-body">
                © 2024 Horseland Resort. All rights reserved.
              </p>
              <p className="text-primary-foreground/60 text-xs font-body">
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