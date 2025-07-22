-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Create policies for uploads bucket
CREATE POLICY "Anyone can view uploads" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their uploads" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their uploads" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');