import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Image as ImageIcon, Search, Check } from 'lucide-react';
import { useMediaList } from '@/hooks/useMediaList';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MultiMediaPickerProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  categoryId?: string;
  categorySlug?: string;
  folder?: string;
}

export const MultiMediaPicker: React.FC<MultiMediaPickerProps> = ({
  label,
  values,
  onChange,
  categoryId,
  categorySlug,
  folder = 'media',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>(values);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaList, refetch } = useMediaList({
    categoryId,
    categorySlug,
    searchTerm,
  });

  const { uploadMedia, uploading } = useMediaUpload();

  const openDialog = (open: boolean) => {
    if (open) setSelected(values);
    setIsOpen(open);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const uploaded: string[] = [];
    for (const file of files) {
      const result = await uploadMedia(file, {
        folder,
        category: categorySlug || 'hotel',
        categoryId,
        title: file.name,
      });
      if (result) uploaded.push(result.image_url);
    }

    if (uploaded.length > 0) {
      setSelected((prev) => Array.from(new Set([...prev, ...uploaded])));
      refetch();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (url: string) => {
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleConfirm = () => {
    onChange(selected);
    setIsOpen(false);
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      {/* Preview grid */}
      <div className="border-2 border-dashed border-border rounded-lg p-4">
        {values.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {values.map((url, index) => (
              <div key={`${url}-${index}`} className="relative group">
                <img
                  src={url}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={() => removeAt(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No images selected</p>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={openDialog}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <ImageIcon className="w-4 h-4 mr-2" />
            {values.length > 0 ? 'Add / Manage Images' : 'Select Images'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select or Upload Images</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="library" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library">Media Library</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[400px] w-full">
                <div className="grid grid-cols-3 gap-4 p-4 pr-4">
                  {mediaList?.map((media) => {
                    const isSelected = selected.includes(media.image_url);
                    return (
                      <div
                        key={media.id}
                        className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent hover:border-muted-foreground'
                        }`}
                        onClick={() => toggleSelect(media.image_url)}
                      >
                        <img
                          src={media.image_url}
                          alt={media.title}
                          className="w-full h-32 object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        <div className="p-2 bg-background/95">
                          <p className="text-xs truncate">{media.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload one or more images
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Supported formats: JPG, PNG, GIF. Max size: 10MB each
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{selected.length} selected</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Add {selected.length > 0 ? `(${selected.length})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Select multiple images from the library or upload new ones in one go
      </p>
    </div>
  );
};
