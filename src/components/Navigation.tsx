
import React, { useState } from 'react';
import { Menu, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { title: 'About', href: '#about' },
    { title: 'Stay', href: '#stay' },
    { 
      title: 'Experiences', 
      href: '#experiences',
      dropdown: [
        { title: 'Activities', href: '#activities' },
        { title: 'Spa & Wellness', href: '#spa' },
        { title: 'Dining', href: '#dining' },
      ]
    },
    
    { title: 'Journal', href: '#journal' },
    { title: 'Contact', href: '#contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <a href="/" className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
              alt="Horseland Hotel Logo" 
              className="h-12 w-12"
            />
            <span className="text-xl font-bold text-primary hidden sm:block">
              Horseland
            </span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          <NavigationMenu>
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.dropdown ? (
                    <>
                      <NavigationMenuTrigger className="text-foreground hover:text-primary transition-colors">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-4">
                          {item.dropdown.map((subItem) => (
                            <a
                              key={subItem.title}
                              href={subItem.href}
                              className="block px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                            >
                              {subItem.title}
                            </a>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </>
                  ) : (
                    <a
                      href={item.href}
                      className="text-foreground hover:text-primary transition-colors px-3 py-2"
                    >
                      {item.title}
                    </a>
                  )}
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem>
                <a href="#faq" className="p-2 hover:text-primary transition-colors">
                  <HelpCircle className="h-5 w-5" />
                </a>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Book Now Button */}
        <Button className="hidden lg:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground">
          Book Now
        </Button>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex items-center space-x-4">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Book Now
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-4 mt-8">
                {navItems.map((item) => (
                  <div key={item.title}>
                    <a
                      href={item.href}
                      className="block py-2 text-lg font-medium hover:text-primary transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </a>
                    {item.dropdown && (
                      <div className="ml-4 mt-2 space-y-2">
                        {item.dropdown.map((subItem) => (
                          <a
                            key={subItem.title}
                            href={subItem.href}
                            className="block py-1 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            {subItem.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <a
                  href="#faq"
                  className="flex items-center py-2 text-lg font-medium hover:text-primary transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <HelpCircle className="h-5 w-5 mr-2" />
                  FAQs
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
