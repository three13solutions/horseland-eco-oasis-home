import React from 'react';
import NavigationV5 from '../components/v5/NavigationV5';
import HeroSectionV5 from '../components/v5/HeroSectionV5';
import WelcomeStripV5 from '../components/v5/WelcomeStripV5';
import WhyMatheranV5 from '../components/v5/WhyMatheranV5';
import StayPreviewV5 from '../components/v5/StayPreviewV5';
import ExperiencesTeaserV5 from '../components/v5/ExperiencesTeaserV5';
import PackagesPreviewV5 from '../components/v5/PackagesPreviewV5';
import GuestReviewsV5 from '../components/v5/GuestReviewsV5';
import TrustedByV5 from '../components/v5/TrustedByV5';
import GalleryV5 from '../components/v5/GalleryV5';
import JournalPreviewV5 from '../components/v5/JournalPreviewV5';
import FooterV5 from '../components/v5/FooterV5';
import FloatingElementsV5 from '../components/v5/FloatingElementsV5';

const IndexV5 = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <NavigationV5 />
      <HeroSectionV5 />
      <WelcomeStripV5 />
      <WhyMatheranV5 />
      <StayPreviewV5 />
      <ExperiencesTeaserV5 />
      <PackagesPreviewV5 />
      <GuestReviewsV5 />
      <TrustedByV5 />
      <GalleryV5 />
      <JournalPreviewV5 />
      <FooterV5 />
      <FloatingElementsV5 />
    </div>
  );
};

export default IndexV5;