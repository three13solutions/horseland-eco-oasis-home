
import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingElements = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWhatsAppClick = () => {
    const phoneNumber = "+919876543210";
    const message = "Hi! I'm interested in booking a luxury stay at Horseland Hotel.";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCallClick = () => {
    window.location.href = 'tel:+919876543210';
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* WhatsApp Float */}
      <Button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-110 p-0 group"
        aria-label="WhatsApp Chat"
      >
        <MessageCircle className="h-7 w-7 text-white group-hover:animate-pulse" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Chat with us on WhatsApp
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-l-black/80 border-transparent"></div>
        </div>
      </Button>

      {/* Call Float */}
      <Button
        onClick={handleCallClick}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-110 p-0 group"
        aria-label="Call Us"
      >
        <Phone className="h-6 w-6 text-primary-foreground group-hover:animate-pulse" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Call us now
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-l-black/80 border-transparent"></div>
        </div>
      </Button>

      {/* Scroll to Top */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-42 right-6 z-50 w-12 h-12 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-all duration-300 transform hover:scale-110 p-0"
          aria-label="Scroll to Top"
        >
          <ArrowUp className="h-5 w-5 text-background" />
        </Button>
      )}

      {/* Floating Booking Reminder */}
      <div className="fixed bottom-6 left-6 z-40 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-border/20 max-w-sm hidden lg:block animate-fade-in">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
            alt="Horseland" 
            className="h-10 w-10"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Ready to escape?</p>
            <p className="text-xs text-muted-foreground">Book your mountain retreat</p>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-xs px-3">
            Book Now
          </Button>
        </div>
      </div>
    </>
  );
};

export default FloatingElements;
