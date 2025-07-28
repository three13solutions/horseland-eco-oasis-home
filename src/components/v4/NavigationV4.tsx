import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NavigationV4 = () => {
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

  const navItems = [
    { name: 'About', href: '#about' },
    { name: 'Stay', href: '#stay' },
    { 
      name: 'Experiences', 
      href: '#experiences',
      dropdown: [
        { name: 'Activities', href: '#activities' },
        { name: 'Dining', href: '#dining' },
        { name: 'Spa & Wellness', href: '#spa' }
      ]
    },
    
    { name: 'Journal', href: '#journal' },
    { name: 'FAQs', href: '#faqs' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'bg-background/80 backdrop-blur-lg border-b border-border/20' : 'bg-background/60 backdrop-blur-md'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
              alt="Horseland Hotel" 
              className="h-14 w-14 md:h-18 md:w-18 drop-shadow-lg"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-wide">HORSELAND</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider hidden sm:block">Hotel</p>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex items-center space-x-6">
            {navItems.map((item) => (
              <div key={item.name} className="relative group">
                <a
                  href={item.href}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-all duration-300 flex items-center"
                >
                  {item.name}
                </a>
                {item.dropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-background/95 backdrop-blur-lg border border-border/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 min-w-[160px]">
                    {item.dropdown.map((subItem) => (
                      <a
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-2 text-sm text-foreground/70 hover:text-primary hover:bg-muted/50 transition-colors"
                      >
                        {subItem.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-3">
            <Button 
              size="sm" 
              className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Phone className="w-4 h-4 mr-2" />
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
                {navItems.map((item) => (
                  <div key={item.name}>
                    <a
                      href={item.href}
                      className="flex items-center justify-between text-base font-medium text-foreground hover:text-primary transition-colors py-3 px-2"
                      onClick={() => item.dropdown && setExperiencesOpen(!experiencesOpen)}
                    >
                      {item.name}
                      {item.dropdown && <ChevronDown className={`w-4 h-4 transition-transform ${experiencesOpen ? 'rotate-180' : ''}`} />}
                    </a>
                    {item.dropdown && experiencesOpen && (
                      <div className="ml-4 space-y-1">
                        {item.dropdown.map((subItem) => (
                          <a
                            key={subItem.name}
                            href={subItem.href}
                            className="block text-sm text-foreground/70 hover:text-primary transition-colors py-2 px-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {subItem.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Button className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationV4;