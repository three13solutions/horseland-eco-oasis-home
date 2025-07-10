
import React from 'react';
import Navigation from '../components/Navigation';
import HeroSection from '../components/HeroSection';
import WelcomeStrip from '../components/WelcomeStrip';
import WhyMatheranStrip from '../components/WhyMatheranStrip';
import StayPreview from '../components/StayPreview';
import ExperiencesTeaser from '../components/ExperiencesTeaser';
import GuestReviews from '../components/GuestReviews';
import TrustLogos from '../components/TrustLogos';
import GallerySection from '../components/GallerySection';
import Footer from '../components/Footer';
import WhatsAppFloat from '../components/WhatsAppFloat';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <WelcomeStrip />
      <WhyMatheranStrip />
      <StayPreview />
      <ExperiencesTeaser />
      <GuestReviews />
      <TrustLogos />
      <GallerySection />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
