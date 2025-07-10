
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin, Sparkles } from 'lucide-react';

const FooterV2 = () => {
  const quickLinks = [
    'About Us', 'Accommodations', 'Experiences', 'Dining', 'Wellness', 'Packages'
  ];

  const policies = [
    'Privacy Policy', 'Booking Terms', 'Cancellation', 'Sustainability'
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
                Where luxury meets sustainability in Matheran's pristine embrace. 
                Experience India's first car-free hill station through our eco-conscious 
                hospitality and personalized mountain experiences.
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
            <div className="space-y-6">
              <h4 className="text-xl font-semibold">Explore</h4>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={`#${link.toLowerCase().replace(' ', '-')}`}
                      className="text-background/80 hover:text-primary transition-colors hover:translate-x-1 transform duration-200 inline-block"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Policies */}
            <div className="space-y-6">
              <h4 className="text-xl font-semibold">Connect</h4>
              
              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-background/80 text-sm">24/7 Reservations</p>
                    <p className="font-medium">+91 98765 43210</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-background/80 text-sm">Email Us</p>
                    <p className="font-medium">hello@horselandresort.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-background/80 text-sm">Visit Us</p>
                    <p className="font-medium">Matheran Hill Station<br />Maharashtra, India</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <p className="text-background/80 text-sm">Follow Our Journey</p>
                <div className="flex space-x-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      className={`p-3 bg-background/10 rounded-full hover:bg-background/20 transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center space-x-6 text-sm">
              {policies.map((policy, index) => (
                <a
                  key={index}
                  href={`#${policy.toLowerCase().replace(' ', '-')}`}
                  className="text-background/60 hover:text-primary transition-colors"
                >
                  {policy}
                </a>
              ))}
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-background/60 text-sm">
                © 2024 Horseland Resort. All rights reserved.
              </p>
              <p className="text-background/60 text-sm">
                Crafted with ❤️ for sustainable luxury
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV2;
