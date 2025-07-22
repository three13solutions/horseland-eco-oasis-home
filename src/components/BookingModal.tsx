import React from 'react';
import { Phone, MessageCircle, X } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ margin: 0, padding: '1rem' }}>
      <div className="relative rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20 max-h-[90vh] overflow-y-auto mx-auto my-auto animate-scale-in overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1566665797739-1674de7a421a" 
            alt="Luxury hotel bedroom in Matheran" 
            className="w-full h-full object-cover animate-pulse"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        
        {/* Content Overlay */}
        <div className="relative z-10 text-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Zen Den</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Trust Indicators - Top */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-base font-bold text-primary drop-shadow-md">4.3★</div>
                <div className="text-xs text-gray-200 drop-shadow-sm">Rating</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary drop-shadow-md">500+</div>
                <div className="text-xs text-gray-200 drop-shadow-sm">Guests</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary drop-shadow-md">24/7</div>
                <div className="text-xs text-gray-200 drop-shadow-sm">Support</div>
              </div>
            </div>
          </div>

          {/* Price - Left Aligned Below Title */}
          <div className="text-left mb-6">
            <div className="text-2xl font-bold drop-shadow-lg text-primary">₹1,500</div>
            <div className="text-sm drop-shadow-md text-white">per night • Starting price</div>
            <div className="text-xs font-medium mt-1 drop-shadow-md text-white">✓ No hidden charges</div>
          </div>

          {/* Contact Options - Bottom */}
          <div className="flex items-center justify-center space-x-2">
            <a
              href="tel:+919876543210"
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <Phone className="w-4 h-4 inline mr-1" />
              Call
            </a>
            
            <a
              href="https://wa.me/919876543210?text=Hi! I'd like to book a room at Horseland Hotel. Can you help me with availability and pricing?"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <MessageCircle className="w-4 h-4 inline mr-1" />
              WhatsApp
            </a>

            <button
              onClick={() => {
                // You can replace this with your actual booking system URL
                window.open('https://booking.example.com', '_blank');
              }}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
            >
              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm10-4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 00-1-1h-3z" clipRule="evenodd" />
              </svg>
              Online
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;