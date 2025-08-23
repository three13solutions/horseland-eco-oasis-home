
import React from 'react';
import { useMediaAsset } from '@/hooks/useMediaAsset';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaAssetProps {
  hardcodedKey?: string;
  fallbackUrl?: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

const MediaAsset: React.FC<MediaAssetProps> = ({
  hardcodedKey,
  fallbackUrl,
  alt = '',
  className = '',
  width,
  height,
  priority = false
}) => {
  const { asset, loading, error } = useMediaAsset(hardcodedKey, fallbackUrl);

  if (loading) {
    return (
      <Skeleton 
        className={className} 
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '200px' }} 
      />
    );
  }

  if (error && !asset) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-sm">Failed to load media</span>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  if (asset.media_type === 'video' && asset.video_url) {
    return (
      <video
        src={asset.video_url}
        className={className}
        width={width}
        height={height}
        controls
        title={asset.title}
      />
    );
  }

  return (
    <img
      src={asset.image_url}
      alt={alt || asset.title}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      title={asset.title}
    />
  );
};

export default MediaAsset;
