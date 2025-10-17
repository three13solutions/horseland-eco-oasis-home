import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface GoogleMapProps {
  apiKey: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  markerTitle?: string;
  markerDescription?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  center = { lat: 18.9847, lng: 73.2673 }, // Horseland Hotel coordinates
  zoom = 14,
  markerTitle = "Horseland Hotel",
  markerDescription = "Matheran, Maharashtra"
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || !apiKey) return;

    const loadGoogleMaps = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        setMapError('Failed to load Google Maps');
        setIsLoading(false);
      };

      window.initMap = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      try {
        if (!mapContainer.current || !window.google || !window.google.maps) return;

        const map = new window.google.maps.Map(mapContainer.current, {
          center: center,
          zoom: zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        // Add marker
        const marker = new window.google.maps.Marker({
          position: center,
          map: map,
          title: markerTitle,
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-weight: 600;">${markerTitle}</h3>
            <p style="margin: 0; font-size: 14px;">${markerDescription}</p>
          </div>`,
        });

        // Show info window on marker click
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // Show info window by default
        infoWindow.open(map, marker);

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      delete window.initMap;
    };
  }, [apiKey, center.lat, center.lng, zoom, markerTitle, markerDescription]);

  if (mapError) {
    return (
      <div className="aspect-video bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
    </div>
  );
};

// Extend window type for initMap callback
declare global {
  interface Window {
    initMap?: () => void;
    google?: any;
  }
}

export default GoogleMap;
