import React, { useState, useEffect } from 'react';
import { Menu, X, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NavigationV5 = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    'About', 'Stay', 'Experiences', 'Packages', 'Journal', 'Contact'
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'glass-effect shadow-lg' : 'bg-white/10 backdrop-blur-sm'
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Extra Large and Prominent */}
          <div className="flex items-center space-x-4">
            <img 
              src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
              alt="Horseland Hotel & Mountain Spa" 
              className="h-16 w-16 drop-shadow-lg"
            />
            <div className="hidden sm:block">
              <h1 className="text-2xl font-heading font-bold text-primary tracking-wide">HORSELAND</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Mountain Spa Resort</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-all duration-300 relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <HelpCircle className="w-5 h-5 text-foreground/80 hover:text-primary cursor-pointer transition-colors" />
          </div>

          {/* CTA & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <Button className="hidden md:flex bg-gradient-to-r from-primary to-accent hover:shadow-lg transform hover:scale-105 transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2" />
              Book Now
            </Button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 glass-effect shadow-lg">
            <div className="container mx-auto px-6 py-6">
              <div className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
                <div className="flex items-center space-x-2 py-2">
                  <HelpCircle className="w-5 h-5 text-foreground/80" />
                  <span className="text-lg font-medium text-foreground">FAQs</span>
                </div>
                <Button className="mt-4 bg-gradient-to-r from-primary to-accent">
                  <Sparkles className="w-4 h-4 mr-2" />
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

export default NavigationV5;