import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Image as ImageIcon, Video, Eye, AlertTriangle } from 'lucide-react';
import { useMediaUsage } from '@/hooks/useMediaUsage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MediaListRowProps {
  image: any;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: (usages: any[]) => void;
}

export const MediaListRow: React.FC<MediaListRowProps> = ({ image, selected, onSelect, onEdit, onDelete }) => {
  const { data: usages = [] } = useMediaUsage(image.image_url);

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
        />
      </TableCell>
      <TableCell>
        <div className="w-16 h-16 bg-muted flex items-center justify-center rounded overflow-hidden">
          {image.media_type === 'video' ? (
            <Video className="h-6 w-6 text-muted-foreground" />
          ) : (
            <img
              src={image.image_url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{image.title}</div>
          {image.alt_text && (
            <div className="text-xs text-muted-foreground">Alt: {image.alt_text}</div>
          )}
        </div>
      </TableCell>
      <TableCell>{image.gallery_categories?.name || 'Uncategorized'}</TableCell>
      <TableCell>
        <Badge variant="outline">
          {image.media_type}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {image.source_type}
        </Badge>
      </TableCell>
      <TableCell>
        {usages.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-green-600 dark:text-green-400">
                <Eye className="w-4 h-4 mr-1" />
                {usages.length} location{usages.length > 1 ? 's' : ''}
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
        ) : (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">Unused</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(usages)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
