import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface NavigationItem {
  id: string;
  title: string;
  href: string;  
  sort_order: number;
  is_active: boolean;
}

const DynamicNavigation = () => {
  const { settings } = useSiteSettings();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await supabase.from('navigation_items').select('*').eq('is_active', true).order('sort_order');
        if (data) setNavigationItems(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    loadData();
  }, []);

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={settings.site_logo || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
              alt={settings.site_title || "Horseland Hotel"}
              className="h-8 w-auto"
            />
            <span className="font-bold text-xl text-gray-900">
              {settings.site_title || "Horseland Hotel"}
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link key={item.id} to={item.href} className="text-gray-900 hover:text-primary font-medium transition-colors">
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default DynamicNavigation;