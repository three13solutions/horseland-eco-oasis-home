import React from 'react';
import { Phone, MessageCircle, X } from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl transform animate-scale-in">
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

        {/* Price Highlight */}
        <div className="bg-primary/10 rounded-xl p-4 mb-6 text-center">
          <div className="text-2xl font-bold text-primary">₹1,500</div>
          <div className="text-sm text-muted-foreground">per night • Starting price</div>
          <div className="text-xs text-accent font-medium mt-1">✓ No hidden charges</div>
        </div>

        {/* Contact Options */}
        <div className="space-y-3">
          <a
            href="tel:+919876543210"
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 px-4 rounded-xl font-semibold text-center block hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <Phone className="w-5 h-5 inline mr-2" />
            Call: +91 98765 43210
          </a>
          
          <a
            href="https://wa.me/919876543210?text=Hi! I'd like to book a room at Horseland Hotel. Can you help me with availability and pricing?"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 text-white py-3 px-4 rounded-xl font-semibold text-center block hover:shadow-lg transform hover:scale-105 transition-all"
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            WhatsApp Booking
          </a>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 pt-4 border-t border-border/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-primary">4.3★</div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground">Guests</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;