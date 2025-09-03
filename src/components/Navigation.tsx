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
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSiteSettings();

  const navItems = [
    { title: 'About', href: '#about' },
    { title: 'Stay', href: '#stay' },
    { 
      title: 'Experiences', 
      href: '#experiences',
      subitems: [
        { title: 'Activities', href: '#activities' },
        { title: 'Dining', href: '#dining' },
        { title: 'Spa & Wellness', href: '#spa' }
      ]
    },
    { title: 'Packages', href: '#packages' },
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
              src={settings.site_logo || "/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"} 
              alt={`${settings.site_title || "Horseland"} Hotel Logo`} 
              className="h-12 w-12"
            />
            <span className="text-xl font-bold text-primary hidden sm:block">
              {settings.site_title || "Horseland"}
            </span>
          </a>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          <NavigationMenu>
            <NavigationMenuList>
              {navItems.map((item) => (
                <NavigationMenuItem key={item.title}>
                  {item.subitems ? (
                    <>
                      <NavigationMenuTrigger className="hover:text-primary transition-colors">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-4">
                          {item.subitems.map((subitem) => (
                            <a
                              key={subitem.title}
                              href={subitem.href}
                              className="block px-3 py-2 text-sm hover:text-primary transition-colors"
                            >
                              {subitem.title}
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
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* CTA Button & Mobile Menu */}
        <div className="flex items-center space-x-4">
          <Button className="hidden md:flex">
            Book Now
          </Button>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-4 mt-6">
                {navItems.map((item) => (
                  <div key={item.title}>
                    <a
                      href={item.href}
                      className="text-lg font-medium hover:text-primary transition-colors block py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </a>
                    {item.subitems && (
                      <div className="ml-4 mt-2 space-y-2">
                        {item.subitems.map((subitem) => (
                          <a
                            key={subitem.title}
                            href={subitem.href}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors block py-1"
                            onClick={() => setIsOpen(false)}
                          >
                            {subitem.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <Button className="mt-6 w-full">
                  Book Now
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;