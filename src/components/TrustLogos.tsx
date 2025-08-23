
import React from 'react';
import { useMediaAsset } from '@/hooks/useMediaAsset';

const TrustLogos = () => {
  const { asset: primaryLogo } = useMediaAsset('branding.logo.primary', '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png');

  const logos = [
    { name: 'TripAdvisor', width: 120 },
    { name: 'Times Travel', width: 100 },
    { name: 'India Today', width: 90 },
    { name: 'Conde Nast', width: 110 },
    { name: 'Travel + Leisure', width: 130 },
    { name: 'National Geographic', width: 140 }
  ];

  return (
    <section className="py-12 bg-background border-y">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Featured In
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-80 transition-opacity">
          {logos.map((logo, index) => (
            <div 
              key={index} 
              className="flex items-center justify-center h-12"
              style={{ width: `${logo.width}px` }}
            >
              <div className="bg-gray-300 w-full h-8 rounded flex items-center justify-center">
                <span className="text-xs text-gray-600 font-medium">
                  {logo.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Example of using branded logo asset */}
        {primaryLogo && (
          <div className="text-center mt-8 opacity-50">
            <img 
              src={primaryLogo.image_url} 
              alt={primaryLogo.title}
              className="h-8 mx-auto"
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default TrustLogos;
