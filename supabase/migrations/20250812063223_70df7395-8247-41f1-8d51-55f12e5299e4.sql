-- Create storage bucket for activity media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('activity-media', 'activity-media', true);

-- Create policies for activity media storage
CREATE POLICY "Activity media is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'activity-media');

CREATE POLICY "Admin users can upload activity media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'activity-media' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can update activity media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'activity-media' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete activity media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'activity-media' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);