import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const DynamicFooter = () => {
  const { settings } = useSiteSettings();
  const location = useLocation();
  const isOnPoliciesPage = location.pathname === '/policies';

  if (isOnPoliciesPage) {
    return (
      <footer className="bg-card border-t border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 Horseland Hotel. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gradient-to-b from-foreground to-foreground/90 text-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src={settings.site_logo || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
                alt={settings.site_title || "HORSELAND"}
                className="h-20 w-auto drop-shadow-lg"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xl text-background">
                  {settings.site_title || "HORSELAND"}
                </span>
                <span className="text-background/80 text-sm">
                  {settings.site_tagline || "Hotel"}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-background">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-primary mt-1" />
                <p className="text-background text-sm">+91 98765 43210</p>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-primary mt-1" />
                <p className="text-background text-sm">hello@horselandresort.com</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-background/20 mt-8 pt-6">
          <div className="text-center">
            <p className="text-sm text-background/60">
              © 2024 Horseland Hotel. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DynamicFooter;