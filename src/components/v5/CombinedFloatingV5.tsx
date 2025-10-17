import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Phone, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const CombinedFloatingV5 = () => {
  const { settings } = useSiteSettings();
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // WhatsApp functionality
  const whatsappNumber = settings.whatsapp_number || "+919876543210";
  const defaultMessage = `Hi! I'm interested in booking a stay at ${settings.brand_name || 'Horseland Hotel'}. Could you please help me with availability and rates?`;

  const handleWhatsAppClick = () => {
    if (isWhatsAppOpen) {
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      setIsWhatsAppOpen(true);
    }
  };

  const quickMessages = [
    "Check room availability",
    "Package pricing",
    "Dining options",
    "Spa services",
    "Transport from station"
  ];

  const handleQuickMessage = (message: string) => {
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setIsWhatsAppOpen(false);
  };

  // Call functionality
  const handleCallClick = () => {
    window.location.href = `tel:${settings.phone_number || '+919876543210'}`;
  };

  // Scroll to top functionality
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* WhatsApp Chat Widget */}
      {isWhatsAppOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-background border border-border rounded-lg shadow-xl z-40 animate-in slide-in-from-bottom-2">
          <div className="bg-foreground text-background p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-background/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Horseland Support</h3>
                <p className="text-xs opacity-90">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsWhatsAppOpen(false)}
              className="w-6 h-6 flex items-center justify-center hover:bg-background/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4">
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-foreground">
                Hi! 👋 How can we help you plan your mountain getaway?
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground font-medium">Quick Questions:</p>
              {quickMessages.map((message, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickMessage(message)}
                  className="w-full text-left text-sm p-2 rounded border border-border hover:bg-muted/50 transition-colors"
                >
                  {message}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleWhatsAppClick}
              className="w-full bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Start Chat on WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-4 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Chat on WhatsApp"
      >
        {isWhatsAppOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        )}
        
        {/* Pulse Animation */}
        {!isWhatsAppOpen && (
          <div className="absolute inset-0 bg-green-600 rounded-full animate-ping opacity-75"></div>
        )}
      </button>

      {/* Call Float */}
      <Button
        onClick={handleCallClick}
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-110 p-0 group"
        aria-label="Call Us"
      >
        <Phone className="h-5 w-5 text-primary-foreground group-hover:animate-pulse" />
        
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
          className="fixed bottom-42 right-4 z-50 w-10 h-10 rounded-full bg-foreground/80 hover:bg-foreground shadow-lg transition-all duration-300 transform hover:scale-110 p-0"
          aria-label="Scroll to Top"
        >
          <ArrowUp className="h-4 w-4 text-background" />
        </Button>
      )}

      {/* WhatsApp Tooltip */}
      {!isWhatsAppOpen && (
        <div className="fixed bottom-6 right-20 bg-foreground text-background px-3 py-2 rounded-lg text-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-40">
          Chat with us!
          <div className="absolute top-1/2 -right-1 w-2 h-2 bg-foreground transform rotate-45 -translate-y-1/2"></div>
        </div>
      )}
    </>
  );
};

export default CombinedFloatingV5;