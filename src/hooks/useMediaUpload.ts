import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadOptions {
  bucketName?: string;
  folder?: string;
  category?: string;
  categoryId?: string;
  title?: string;
  caption?: string;
}

interface MediaEntry {
  id: string;
  image_url: string;
  title: string;
  category: string;
  category_id?: string;
}

export const useMediaUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadMedia = async (
    file: File,
    options: UploadOptions = {}
  ): Promise<MediaEntry | null> => {
    const {
      bucketName = 'uploads',
      folder = 'media',
      category = 'hotel',
      categoryId,
      title,
      caption,
    } = options;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Invalid file type. Please select an image or video file.');
      return null;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Please select a file smaller than 10MB.');
      return null;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file. Please try again.');
        return null;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Determine media type
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      const urlField = mediaType === 'image' ? 'image_url' : 'video_url';

      // Create entry in gallery_images table
      const insertData: any = {
        title: title || file.name,
        category,
        caption: caption || `Uploaded on ${new Date().toLocaleDateString()}`,
        media_type: mediaType,
        source_type: 'upload',
        is_hardcoded: false,
      };

      // Add URL field based on media type
      if (mediaType === 'image') {
        insertData.image_url = publicUrl;
      } else {
        insertData.video_url = publicUrl;
        insertData.image_url = ''; // Required field, use empty string for videos
      }

      // Add category_id if provided
      if (categoryId) {
        insertData.category_id = categoryId;
      }

      const { data: mediaEntry, error: dbError } = await supabase
        .from('gallery_images')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to create media entry in library.');
        return null;
      }

      toast.success('Media uploaded successfully');
      return mediaEntry;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An unexpected error occurred');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadMedia,
    uploading,
  };
};
