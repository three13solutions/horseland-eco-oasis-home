import React from 'react';
import Navigation from '@/components/Navigation';
import DynamicFooter from '@/components/DynamicFooter';
import CombinedFloating from '@/components/CombinedFloating';
import STAAHBookingEmbed from '@/components/STAAHBookingEmbed';

const STAAHBooking = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navigation />

      {/* Hero / Heading Section */}
      <section className="relative pt-28 pb-12 bg-muted/30">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight text-primary">
            Book Your Stay
          </h1>
          <p className="text-lg md:text-xl font-body text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Select your dates and discover available stays at Horseland Hotel & Mountain Spa.
          </p>
        </div>
      </section>

      {/* STAAH SwiftBook Widget */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-card border border-border/20 rounded-2xl shadow-sm overflow-visible relative z-10">
            <div className="p-4 md:p-8">
              <STAAHBookingEmbed />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-20">
        <DynamicFooter />
      </div>
      <CombinedFloating />
    </div>
  );
};

export default STAAHBooking;
