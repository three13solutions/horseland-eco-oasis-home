import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  MEDIA_GALLERY_CLOSE_BUTTON_CLASS,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MultiMediaPicker } from '@/components/admin/MultiMediaPicker';
import { MediaPicker } from '@/components/admin/MediaPicker';

export default function CloseBtnProbe() {
  return (
    <div className="p-8 space-y-8">
      <MultiMediaPicker label="Probe multi" values={[]} onChange={() => {}} />
      <MediaPicker label="Probe single" value="" onChange={() => {}} />

      <Dialog>
        <DialogTrigger asChild>
          <Button id="probe-gallery">Open gallery window</Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-4xl max-h-[80vh]"
          closeButtonClassName={MEDIA_GALLERY_CLOSE_BUTTON_CLASS}
        >
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center justify-between">
              <span>Gallery Images - Matheran Panoramic Point Gallery</span>
              <div className="flex gap-2">
                <Button variant="default" size="sm">
                  Add Images
                </Button>
                <Button variant="outline" size="sm">
                  Media Library
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div data-admin-media-gallery className="h-40 bg-muted" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
