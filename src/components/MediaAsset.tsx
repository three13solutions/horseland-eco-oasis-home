
import React from 'react';
import { useMediaAsset } from '@/hooks/useMediaAsset';
import { Skeleton } from './ui/skeleton';

interface MediaAssetProps {
  hardcodedKey: string;
  fallbackUrl?: string;
  alt?: string;
  className?: string;
  title?: string;
}

const MediaAsset: React.FC<MediaAssetProps> = ({ 
  hardcodedKey, 
  fallbackUrl, 
  alt, 
  className = "",
  title
}) => {
  const { asset, loading, error } = useMediaAsset(hardcodedKey, fallbackUrl);

  if (loading) {
    return <Skeleton className={`bg-muted ${className}`} />;
  }

  if (error && !fallbackUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-sm">Image unavailable</span>
      </div>
    );
  }

  const imageUrl = asset?.image_url || fallbackUrl;
  const imageAlt = alt || asset?.title || 'Media asset';
  const imageTitle = title || asset?.title;

  return (
    <img
      src={imageUrl}
      alt={imageAlt}
      title={imageTitle}
      className={className}
    />
  );
};

export default MediaAsset;
