import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const WhatsAppFloatingV4 = () => {
  const { settings } = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);

  const whatsappNumber = settings.whatsapp_number || "+919876543210";
  const defaultMessage = `Hi! I'm interested in booking a stay at ${settings.brand_name || 'Horseland Hotel'}. Could you please help me with availability and rates?`;

  const handleWhatsAppClick = () => {
    if (isOpen) {
      // Direct WhatsApp link
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      setIsOpen(true);
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
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-background border border-border rounded-lg shadow-xl z-40 animate-in slide-in-from-bottom-2">
          <div className="bg-green-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{settings.brand_name || 'Horseland'} Support</h3>
                <p className="text-xs opacity-90">Usually replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded"
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
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Start Chat on WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-4 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group"
        aria-label="Chat on WhatsApp"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        )}
        
        {/* Pulse Animation */}
        {!isOpen && (
          <div className="absolute inset-0 bg-green-600 rounded-full animate-ping opacity-75"></div>
        )}
      </button>

      {/* Tooltip */}
      {!isOpen && (
        <div className="fixed bottom-6 right-20 bg-foreground text-background px-3 py-2 rounded-lg text-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-40">
          Chat with us!
          <div className="absolute top-1/2 -right-1 w-2 h-2 bg-foreground transform rotate-45 -translate-y-1/2"></div>
        </div>
      )}
    </>
  );
};

export default WhatsAppFloatingV4;