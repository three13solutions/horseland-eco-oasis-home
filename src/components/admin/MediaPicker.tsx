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

interface MediaPickerProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  categoryId?: string;
  categorySlug?: string;
  folder?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  label,
  value,
  onChange,
  categoryId,
  categorySlug,
  folder = 'media',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrl, setSelectedUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: mediaList, refetch } = useMediaList({
    categoryId,
    categorySlug,
    searchTerm,
  });

  const { uploadMedia, uploading } = useMediaUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await uploadMedia(file, {
      folder,
      category: categorySlug || 'hotel',
      categoryId,
      title: file.name,
    });

    if (result) {
      setSelectedUrl(result.image_url);
      refetch();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectMedia = (url: string) => {
    setSelectedUrl(url);
  };

  const handleConfirm = () => {
    onChange(selectedUrl);
    setIsOpen(false);
  };

  const handleRemove = () => {
    onChange('');
    setSelectedUrl('');
  };

  return (
    <div className="space-y-4">
      <Label>{label}</Label>

      {/* Preview Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-6">
        {value ? (
          <div className="relative inline-block">
            <img
              src={value}
              alt="Preview"
              className="max-w-full max-h-48 object-contain rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No image selected
            </p>
          </div>
        )}
      </div>

      {/* Select/Upload Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <ImageIcon className="w-4 h-4 mr-2" />
            {value ? 'Change Image' : 'Select Image'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select or Upload Media</DialogTitle>
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
                <div className="grid grid-cols-3 gap-4 p-2">
                  {mediaList?.map((media) => (
                    <div
                      key={media.id}
                      className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                        selectedUrl === media.image_url
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-transparent hover:border-muted-foreground'
                      }`}
                      onClick={() => handleSelectMedia(media.image_url)}
                    >
                      <img
                        src={media.image_url}
                        alt={media.title}
                        className="w-full h-32 object-cover"
                      />
                      {selectedUrl === media.image_url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <div className="p-2 bg-background/95">
                        <p className="text-xs truncate">{media.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Click to upload or drag and drop
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Supported formats: JPG, PNG, GIF, MP4. Max size: 10MB
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedUrl}
            >
              Select Media
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Select from media library or upload a new file
      </p>
    </div>
  );
};
