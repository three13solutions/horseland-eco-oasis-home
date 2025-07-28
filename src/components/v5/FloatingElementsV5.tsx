import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FloatingElementsV5 = () => {
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
    const message = "Hi! I'm interested in booking a stay at Horseland Hotel.";
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
    </>
  );
};

export default FloatingElementsV5;