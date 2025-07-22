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
      <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/20 max-h-[90vh] overflow-y-auto mx-auto my-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Quick Booking</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Image - Pulsating Matheran */}
        <div className="mb-4 rounded-xl overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4" 
            alt="Beautiful Matheran mountain landscape" 
            className="w-full h-32 object-cover animate-pulse"
          />
        </div>

        {/* Price Highlight */}
        <div className="bg-primary/10 rounded-xl p-3 mb-4 text-center">
          <div className="text-xl font-bold text-primary">₹1,500</div>
          <div className="text-xs text-muted-foreground">per night • Starting price</div>
          <div className="text-xs text-accent font-medium mt-1">✓ No hidden charges</div>
        </div>

        {/* Contact Options - Single Row */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <a
            href="tel:+919876543210"
            className="flex-1 bg-gradient-to-r from-primary to-accent text-white py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <Phone className="w-4 h-4 inline mr-1" />
            Call
          </a>
          
          <a
            href="https://wa.me/919876543210?text=Hi! I'd like to book a room at Horseland Hotel. Can you help me with availability and pricing?"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <MessageCircle className="w-4 h-4 inline mr-1" />
            WhatsApp
          </a>

          <button
            onClick={() => {
              // You can replace this with your actual booking system URL
              window.open('https://booking.example.com', '_blank');
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-medium text-center text-sm hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm10-4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 00-1-1h-3z" clipRule="evenodd" />
            </svg>
            Reserve
          </button>
        </div>

        {/* Trust Indicators - Compact */}
        <div className="pt-3 border-t border-border/20">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-base font-bold text-primary">4.3★</div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div>
              <div className="text-base font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground">Guests</div>
            </div>
            <div>
              <div className="text-base font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;