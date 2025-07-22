
-- Create an admin user in auth.users and add corresponding admin profile
-- First, let's insert a user into auth.users (this simulates what Supabase Auth would do)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@horselandhotel.com',
  crypt('admin123', gen_salt('bf')), -- Password: admin123
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
);

-- Now create the corresponding admin profile
INSERT INTO admin_profiles (user_id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@horselandhotel.com'),
  'admin@horselandhotel.com',
  'admin'
);
