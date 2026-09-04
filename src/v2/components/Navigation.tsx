
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getContent, navigation, brand } from '@/v2/data';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
}

const NavigationV5 = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [experiencesOpen, setExperiencesOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const parentItems = navigation.top as NavigationItem[];
  const getChildItems = (parentId: string) => navigation.childrenOf(parentId) as NavigationItem[];

  const toV2 = (href: string) =>
    href === '/booking' || href === '/booking/confirmation' || href === '/search-availability'
      ? href
      : `/v2${href}`;

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
        to={toV2(item.href)}
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
        to={toV2(item.href)}
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
          <Link to="/v2" className="flex items-center space-x-3">
            <img
              src={brand.monogram}
              alt={brand.name}
              className="h-14 w-14 md:h-18 md:w-18 drop-shadow-lg"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-primary tracking-wide">
                {brand.name}
              </h1>
              {brand.descriptor && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:block">
                  {brand.descriptor}
                </p>
              )}
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

          {/* Desktop Actions */}
          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => navigate('/booking')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {getContent('navigation.bookNow', 'Book Now')}
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
                  className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => navigate('/booking')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {getContent('navigation.bookNow', 'Book Now')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationV5;
