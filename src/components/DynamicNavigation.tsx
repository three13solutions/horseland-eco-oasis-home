import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  sort_order: number;
  is_active: boolean;
}

interface SiteSettings {
  brand_name: string;
  brand_monogram: string;
}

const DynamicNavigation = () => {
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    brand_name: 'Horseland Hotel',
    brand_monogram: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png'
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadNavigationData();
  }, []);

  const loadNavigationData = async () => {
    try {
      // Load navigation items
      const { data: navData } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      // Load site settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*');

      if (navData) {
        setNavigationItems(navData);
      }

      if (settingsData) {
        const settings: any = {};
        settingsData.forEach(setting => {
          settings[setting.setting_key] = JSON.parse(setting.setting_value as string);
        });
        setSiteSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading navigation data:', error);
      // Use fallback data if database fails
      setNavigationItems([
        { id: '1', title: 'About', href: '/about', sort_order: 1, is_active: true },
        { id: '2', title: 'Stay', href: '/stay', sort_order: 2, is_active: true },
        { id: '3', title: 'Experiences', href: '/experiences', sort_order: 3, is_active: true },
        
        { id: '5', title: 'Journal', href: '/journal', sort_order: 5, is_active: true },
      ]);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src={siteSettings.brand_monogram} 
              alt={siteSettings.brand_name}
              className="h-8 w-auto"
            />
            <span className="font-bold text-xl text-gray-900">
              {siteSettings.brand_name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                {item.title}
              </Link>
            ))}
            <Button className="ml-4">Book Now</Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col space-y-4 mt-6">
                {navigationItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="text-gray-700 hover:text-primary font-medium py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <Button className="mt-4" onClick={() => setIsMobileMenuOpen(false)}>
                  Book Now
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};

export default DynamicNavigation;