-- Create invitations table for admin user invitations
CREATE TABLE public.admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('content_editor', 'admin', 'super_admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for admin invitations
CREATE POLICY "Admin users can view all invitations" 
ON public.admin_invitations 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admin users can create invitations" 
ON public.admin_invitations 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin users can update invitations" 
ON public.admin_invitations 
FOR UPDATE 
USING (public.is_admin());

-- Create index for performance
CREATE INDEX idx_admin_invitations_token ON public.admin_invitations(invitation_token);
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX idx_admin_invitations_expires_at ON public.admin_invitations(expires_at);

-- Create trigger for updating timestamps
CREATE TRIGGER update_admin_invitations_updated_at
BEFORE UPDATE ON public.admin_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();