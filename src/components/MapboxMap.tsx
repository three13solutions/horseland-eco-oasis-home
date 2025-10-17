import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface MapboxMapProps {
  accessToken: string;
  center?: [number, number];
  zoom?: number;
  markerTitle?: string;
  markerDescription?: string;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  accessToken,
  center = [73.2673, 18.9847], // Horseland Hotel coordinates (lng, lat)
  zoom = 14,
  markerTitle = "Horseland Hotel",
  markerDescription = "Matheran, Maharashtra"
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    try {
      // Initialize map
      mapboxgl.accessToken = accessToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add marker
      const marker = new mapboxgl.Marker({ color: '#8B4513' })
        .setLngLat(center)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<h3 class="font-semibold">${markerTitle}</h3><p class="text-sm">${markerDescription}</p>`)
        )
        .addTo(map.current);

      // Show popup on load
      marker.togglePopup();

      // Cleanup
      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to load map');
    }
  }, [accessToken, center, zoom, markerTitle, markerDescription]);

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
    <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-lg" />
  );
};

export default MapboxMap;
