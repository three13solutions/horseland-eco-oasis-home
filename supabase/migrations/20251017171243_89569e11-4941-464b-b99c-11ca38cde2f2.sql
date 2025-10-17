
-- Drop the existing permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

-- Create new admin-only upload policy for uploads bucket
CREATE POLICY "Admin users can upload files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'uploads' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

-- Also restrict updates and deletes to admins
DROP POLICY IF EXISTS "Authenticated users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads" ON storage.objects;

CREATE POLICY "Admin users can update uploads"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'uploads' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admin users can delete uploads"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'uploads' 
  AND EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);
