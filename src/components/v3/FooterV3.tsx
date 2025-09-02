import React from 'react';
import { MapPin, Phone, Mail, Clock, Wifi, Car, Coffee, Star } from 'lucide-react';

const FooterV3 = () => {
  return (
    <footer className="bg-card border-t border-border/20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            
            {/* Hotel Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src="/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png" 
                  alt="Horseland Hotel" 
                  className="h-12 w-12 md:h-16 md:w-16"
                />
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-primary">HORSELAND</h3>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Affordable Mountain Getaway</p>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Your home away from home in Matheran. We believe great experiences shouldn't cost a fortune. 
                Quality accommodation at honest prices.
              </p>

              {/* Quick Features */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Wifi className="w-4 h-4 mr-2 text-primary" />
                  Free WiFi
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Car className="w-4 h-4 mr-2 text-primary" />
                  Free Parking
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Coffee className="w-4 h-4 mr-2 text-primary" />
                  Complimentary Tea
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Star className="w-4 h-4 mr-2 text-primary" />
                  4.3★ Rating
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-6">Contact Us</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Near Railway Station<br />
                      Matheran, Maharashtra 410102
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <a href="tel:+919876543210" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      +91 98765 43210
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <a href="mailto:info@horselandmatheran.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      info@horselandmatheran.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Check-in: 12:00 PM<br />
                      Check-out: 11:00 AM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-6">Quick Links</h4>
              <div className="space-y-3">
                <a href="#rooms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Our Rooms
                </a>
                <a href="#pricing" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </a>
                <a href="#activities" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Things to Do
                </a>
                <a href="#contact" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </a>
                <a href="#location" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Location
                </a>
                <a href="#reviews" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Guest Reviews
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border/20 mt-12 pt-8">
            <div className="flex flex-col space-y-4">
              {/* Policies */}
              <div className="flex items-center justify-center md:justify-start space-x-3 text-sm text-muted-foreground">
                <a href="/policies#booking" className="hover:text-primary transition-colors whitespace-nowrap">Booking</a>
                <a href="/policies#cancellation" className="hover:text-primary transition-colors whitespace-nowrap">Cancellation</a>
                <a href="/policies#payment" className="hover:text-primary transition-colors whitespace-nowrap">Payment</a>
                <a href="/policies#privacy" className="hover:text-primary transition-colors whitespace-nowrap">Privacy</a>
                <a href="/policies#terms" className="hover:text-primary transition-colors whitespace-nowrap">Terms</a>
                <a href="/policies#guest" className="hover:text-primary transition-colors whitespace-nowrap">Guest Conduct</a>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                  © 2024 Horseland Hotel. All rights reserved.
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">₹1,500</div>
                    <div className="text-xs text-muted-foreground">Starting from</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">4.3★</div>
                    <div className="text-xs text-muted-foreground">Guest Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">500+</div>
                    <div className="text-xs text-muted-foreground">Happy Guests</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV3;