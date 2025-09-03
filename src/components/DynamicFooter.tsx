import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Sparkles,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const DynamicFooter = () => {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const isOnPoliciesPage = location.pathname === '/policies';
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [email, setEmail] = useState('');

  const socialLinks = [
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-pink-500' },
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-blue-500' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-blue-400' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-red-500' }
  ];

  const quickLinks = [
    { title: 'About', href: '/about' },
    { title: 'Stay', href: '/stay' },
    { title: 'Experiences', href: '/experiences' },
    { title: 'Dining', href: '/dining' },
    { title: 'Packages', href: '/packages' },
    { title: 'Journal', href: '/journal' },
    { title: 'Contact', href: '/contact' }
  ];

  const policyLinks = [
    { title: 'Booking Policy', href: '/policies#booking' },
    { title: 'Cancellation', href: '/policies#cancellation' },
    { title: 'Payment Policy', href: '/policies#payment' },
    { title: 'Privacy Policy', href: '/policies#privacy' },
    { title: 'Terms of Service', href: '/policies#terms' },
    { title: 'Guest Conduct', href: '/policies#guest' }
  ];

  if (isOnPoliciesPage) {
    return (
      <footer className="bg-card border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 {settings.site_title || "Horseland Hotel"}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
            
            {/* Brand Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex flex-col items-start space-y-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src={settings.site_logo || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
                    alt={`${settings.site_title || "Horseland"} Logo`} 
                    className="h-16 w-16 md:h-20 md:w-20 drop-shadow-lg"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-xl text-primary-foreground">
                      {settings.site_title || "HORSELAND"}
                    </span>
                    <span className="text-primary-foreground/80 text-sm">
                      {settings.site_tagline || "Hotel"}
                    </span>
                  </div>
                </div>
                
                <p className="text-primary-foreground/80 leading-relaxed max-w-lg text-sm">
                  Experience the perfect blend of comfort and nature at our mountain retreat. 
                  Create unforgettable memories surrounded by scenic beauty and warm hospitality.
                </p>

                {/* Newsletter Section */}
                <div className="bg-primary-foreground/10 rounded-xl p-4 space-y-3 w-full max-w-lg">
                  <h4 className="text-sm font-semibold flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-accent" />
                    Stay Updated
                  </h4>
                  <p className="text-xs text-primary-foreground/70 mb-2">
                    Get exclusive offers and updates delivered to your inbox
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input 
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 rounded-lg text-sm h-9"
                    />
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg px-4 py-2 text-sm whitespace-nowrap h-9">
                      Subscribe
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Quick Links</h4>
              <div className="space-y-2">
                {quickLinks.map((link, index) => (
                  <Link 
                    key={index}
                    to={link.href} 
                    className="block text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact & Social */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Connect With Us</h4>
              
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-primary-foreground/80 text-xs">Reservations</p>
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
                    <p className="font-medium text-sm">Matheran, Maharashtra, India</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-primary-foreground/90">Follow Us</h5>
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
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 py-4">
          <div className="flex flex-col space-y-3">
            {/* Collapsible Policies */}
            <button 
              onClick={() => setIsPoliciesOpen(!isPoliciesOpen)}
              className="flex items-center justify-between bg-primary-foreground/10 rounded-lg p-3 hover:bg-primary-foreground/20 transition-colors md:hidden"
            >
              <span className="text-sm font-medium">Policies & Terms</span>
              {isPoliciesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {/* Policy Links */}
            <div className={`${isPoliciesOpen ? 'block' : 'hidden'} md:block`}>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-sm">
                {policyLinks.map((policy, index) => (
                  <Link 
                    key={index}
                    to={policy.href} 
                    className="text-primary-foreground/60 hover:text-accent transition-colors whitespace-nowrap"
                  >
                    {policy.title}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-primary-foreground/60 text-xs">
                © 2024 {settings.site_title || "Horseland Hotel"}. All rights reserved.
              </p>
              <p className="text-primary-foreground/60 text-xs">
                Crafted with ❤️ for unforgettable experiences
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;