import React from 'react';
import NavigationV4 from '../components/v4/NavigationV4';
import HeroSectionV4 from '../components/v4/HeroSectionV4';
import BookingWidgetV4 from '../components/v4/BookingWidgetV4';
import WelcomeStripV4 from '../components/v4/WelcomeStripV4';
import WhyMatheranV4 from '../components/v4/WhyMatheranV4';
import StayPreviewV4 from '../components/v4/StayPreviewV4';
import ExperiencesTeaserV4 from '../components/v4/ExperiencesTeaserV4';
import PackagesPreviewV4 from '../components/v4/PackagesPreviewV4';
import GuestReviewsV4 from '../components/v4/GuestReviewsV4';
import TrustedByV4 from '../components/v4/TrustedByV4';
import GalleryV4 from '../components/v4/GalleryV4';
import JournalPreviewV4 from '../components/v4/JournalPreviewV4';
import FooterV4 from '../components/v4/FooterV4';
import WhatsAppFloatingV4 from '../components/v4/WhatsAppFloatingV4';

const IndexV4 = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV4 />
      <HeroSectionV4 />
      <BookingWidgetV4 />
      <WelcomeStripV4 />
      <WhyMatheranV4 />
      <StayPreviewV4 />
      <ExperiencesTeaserV4 />
      <PackagesPreviewV4 />
      <GuestReviewsV4 />
      <TrustedByV4 />
      <GalleryV4 />
      <JournalPreviewV4 />
      <FooterV4 />
      <WhatsAppFloatingV4 />
    </div>
  );
};

export default IndexV4;