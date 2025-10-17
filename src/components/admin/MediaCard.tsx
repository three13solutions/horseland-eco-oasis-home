import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Camera, Heart, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { useMediaUsage } from '@/hooks/useMediaUsage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MediaCardProps {
  image: any;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ image, selected, onSelect, onEdit, onDelete }) => {
  const { data: usages = [] } = useMediaUsage(image.image_url);

  return (
    <Card className={`overflow-hidden ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="relative">
        <Checkbox
          className="absolute top-2 left-2 z-10 bg-background"
          checked={selected}
          onCheckedChange={onSelect}
        />
        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
          {image.media_type === 'video' ? (
            <Video className="h-12 w-12 text-muted-foreground" />
          ) : (
            <img
              src={image.image_url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="absolute top-2 right-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold truncate flex items-center gap-2">
              {image.media_type === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
              {image.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{image.caption}</p>
            {image.alt_text && (
              <p className="text-xs text-muted-foreground mt-1">Alt: {image.alt_text}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center">
            <Camera className="w-3 h-3 mr-1" />
            {image.gallery_categories?.name || 'Uncategorized'}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {image.source_type}
            </Badge>
            {usages.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 px-2">
                    <Eye className="w-3 h-3 mr-1" />
                    {usages.length}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Used In:</h4>
                    {usages.map((usage, idx) => (
                      <div key={idx} className="text-xs">
                        <Badge variant="secondary" className="mr-2">{usage.type}</Badge>
                        <span>{usage.title}</span>
                        <span className="text-muted-foreground ml-2">({usage.field})</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {image.gallery_categories?.slug === 'guests' && image.likes_count && (
              <span className="flex items-center">
                <Heart className="w-3 h-3 mr-1 text-red-400" />
                {image.likes_count}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
