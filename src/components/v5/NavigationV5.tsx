
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import BookingModal from '@/components/BookingModal';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
}

interface SiteSettings {
  site_title: string;
  site_logo: string;
}

const NavigationV5 = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_title: 'HORSELAND',
    site_logo: '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png'
  });
  const [experiencesOpen, setExperiencesOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadNavigationData();
  }, []);

  const safeParseJSON = (value: any) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if parsing fails
      }
    }
    return value; // Already an object or other type
  };

  const loadNavigationData = async () => {
    try {
      console.log('Loading navigation data...');
      
      // Load navigation items
      const { data: navData, error: navError } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (navError) {
        console.error('Error loading navigation items:', navError);
      } else {
        console.log('Navigation items loaded:', navData);
        setNavigationItems(navData || []);
      }

      // Load site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*');

      if (settingsError) {
        console.error('Error loading site settings:', settingsError);
      } else if (settingsData) {
        console.log('Site settings loaded:', settingsData);
        const settings: any = {};
        
        settingsData.forEach(setting => {
          settings[setting.setting_key] = safeParseJSON(setting.setting_value);
        });
        
        console.log('Processed settings:', settings);
        setSiteSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading navigation data:', error);
      // Use fallback data if database fails
      setNavigationItems([
        { id: '1', title: 'About', href: '/about', sort_order: 1, is_active: true },
        { id: '2', title: 'Stay', href: '/stay', sort_order: 2, is_active: true },
        { id: '3', title: 'Experiences', href: '/experiences', sort_order: 3, is_active: true },
        { id: '4', title: 'Packages', href: '/packages', sort_order: 4, is_active: true },
        { id: '5', title: 'Journal', href: '/journal', sort_order: 5, is_active: true },
      ]);
    }
  };

  // Group navigation items by parent_id for dropdown functionality
  const parentItems = navigationItems.filter(item => !item.parent_id);
  const getChildItems = (parentId: string) => 
    navigationItems.filter(item => item.parent_id === parentId);

  const renderNavigationLink = (item: NavigationItem) => {
    const isExternal = item.href.startsWith('http');
    const isAnchor = item.href.startsWith('#');
    
    if (isExternal || isAnchor) {
      return (
        <a
          href={item.href}
          className="text-base font-medium text-foreground/80 hover:text-primary transition-all duration-300 flex items-center"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
        >
          {item.title}
        </a>
      );
    }
    
    return (
      <Link
        to={item.href}
        className="text-base font-medium text-foreground/80 hover:text-primary transition-all duration-300 flex items-center"
      >
        {item.title}
      </Link>
    );
  };

  const renderMobileNavigationLink = (item: NavigationItem) => {
    const isExternal = item.href.startsWith('http');
    const isAnchor = item.href.startsWith('#');
    
    if (isExternal || isAnchor) {
      return (
        <a
          href={item.href}
          className="flex items-center justify-between text-base font-medium text-foreground hover:text-primary transition-colors py-3 px-2"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {item.title}
        </a>
      );
    }
    
    return (
      <Link
        to={item.href}
        className="flex items-center justify-between text-base font-medium text-foreground hover:text-primary transition-colors py-3 px-2"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {item.title}
      </Link>
    );
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'bg-background/80 backdrop-blur-lg border-b border-border/20' : 'bg-background/60 backdrop-blur-md'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src={siteSettings.site_logo} 
              alt={siteSettings.site_title} 
              className="h-14 w-14 md:h-18 md:w-18 drop-shadow-lg"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary tracking-wide">
                {siteSettings.site_title}
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:block">
                Hotel
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {parentItems.map((item) => {
              const childItems = getChildItems(item.id);
              const hasChildren = childItems.length > 0;
              
              return (
                <div key={item.id} className="relative group">
                  <div className="flex items-center">
                    {renderNavigationLink(item)}
                    {hasChildren && <ChevronDown className="w-3 h-3 ml-1" />}
                  </div>
                  
                  {hasChildren && (
                    <div className="absolute top-full left-0 mt-1 bg-background/95 backdrop-blur-lg border border-border/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 min-w-[160px]">
                      {childItems.map((subItem) => (
                        <div key={subItem.id} className="block px-4 py-2 text-base text-foreground/70 hover:text-primary hover:bg-muted/50 transition-colors">
                          {renderNavigationLink(subItem)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-3">
            <Button 
              size="sm" 
              className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowBookingModal(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Now
            </Button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border/20 shadow-lg">
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col space-y-1">
                {parentItems.map((item) => {
                  const childItems = getChildItems(item.id);
                  const hasChildren = childItems.length > 0;
                  
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between">
                        {renderMobileNavigationLink(item)}
                        {hasChildren && (
                          <button
                            onClick={() => setExperiencesOpen(!experiencesOpen)}
                            className="p-2"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${experiencesOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      {hasChildren && experiencesOpen && (
                        <div className="ml-4 space-y-1">
                          {childItems.map((subItem) => (
                            <div key={subItem.id} className="text-sm text-foreground/70 hover:text-primary transition-colors py-2 px-2">
                              {renderMobileNavigationLink(subItem)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button 
                  className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowBookingModal(true)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Booking Modal */}
      <BookingModal 
        isOpen={showBookingModal} 
        onClose={() => setShowBookingModal(false)} 
      />
    </nav>
  );
};

export default NavigationV5;
