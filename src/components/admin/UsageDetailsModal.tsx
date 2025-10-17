import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Package, MapPin, Dumbbell, Sparkles, UtensilsCrossed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UsageLocation {
  type: string;
  id: string;
  title: string;
  field: string;
}

interface UsageDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  usages: UsageLocation[];
  onReplace?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'page': return <FileText className="h-4 w-4" />;
    case 'blog': return <FileText className="h-4 w-4" />;
    case 'room': return <MapPin className="h-4 w-4" />;
    case 'package': return <Package className="h-4 w-4" />;
    case 'activity': return <Dumbbell className="h-4 w-4" />;
    case 'spa': return <Sparkles className="h-4 w-4" />;
    case 'meal': return <UtensilsCrossed className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getEditLink = (usage: UsageLocation) => {
  switch (usage.type) {
    case 'page': return `/admin/pages?edit=${usage.id}`;
    case 'blog': return `/admin/blog?edit=${usage.id}`;
    case 'room': return `/admin/rooms?edit=${usage.id}`;
    case 'package': return `/admin/packages?edit=${usage.id}`;
    case 'activity': return `/admin/activities?edit=${usage.id}`;
    case 'spa': return `/admin/spa?edit=${usage.id}`;
    case 'meal': return `/admin/dining?edit=${usage.id}`;
    default: return '#';
  }
};

export const UsageDetailsModal: React.FC<UsageDetailsModalProps> = ({
  open,
  onOpenChange,
  imageUrl,
  usages,
  onReplace,
}) => {
  const groupedUsages = usages.reduce((acc, usage) => {
    if (!acc[usage.type]) {
      acc[usage.type] = [];
    }
    acc[usage.type].push(usage);
    return acc;
  }, {} as Record<string, UsageLocation[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media Usage Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Used in {usages.length} location{usages.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {Object.keys(groupedUsages).length} content type{Object.keys(groupedUsages).length > 1 ? 's' : ''}
              </p>
            </div>
            {onReplace && (
              <Button size="sm" variant="outline" onClick={onReplace}>
                Replace Media
              </Button>
            )}
          </div>

          {/* Usage List */}
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {Object.entries(groupedUsages).map(([type, locations]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(type)}
                    <h4 className="font-semibold capitalize">
                      {type === 'blog' ? 'Blog Posts' : `${type}s`}
                    </h4>
                    <Badge variant="secondary">{locations.length}</Badge>
                  </div>
                  <div className="space-y-2 pl-6">
                    {locations.map((location, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{location.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Field: {location.field}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a
                            href={getEditLink(location)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer Info */}
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <p>
              💡 Tip: Deleting this media will not automatically remove it from these locations.
              Consider using "Replace Media" to update all usages at once.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
