
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Validation schema for admin profile forms
const adminProfileSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255, 'Email is too long')
    .refine((email) => !email.includes('<') && !email.includes('>'), {
      message: 'Invalid email format'
    }),
  role: z.enum(['content_editor', 'admin', 'super_admin'])
});

interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const UserManagement = () => {
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    role: 'content_editor' as string
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkPermissions();
    loadAdminProfiles();
  }, []);

  const checkPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('admin_profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (!profile) {
        navigate('/admin/login');
        return;
      }

      setCurrentUserRole(profile.role);
    } catch (error) {
      console.error('Permission check error:', error);
      navigate('/admin/login');
    }
  };

  const loadAdminProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminProfiles(data || []);
    } catch (error) {
      console.error('Error loading admin profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load admin profiles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ email: '', role: 'content_editor' });
    setError('');
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: AdminProfile) => {
    setEditingUser(user);
    setFormData({ email: user.email, role: user.role });
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      // Validate form data using Zod schema
      const validatedData = adminProfileSchema.parse(formData);
      
      // Additional XSS protection - sanitize input
      const sanitizedEmail = validatedData.email.trim().toLowerCase();
      const sanitizedRole = validatedData.role;

      if (editingUser) {
        // Update existing user with audit logging
        const { error } = await supabase
          .from('admin_profiles')
          .update({ 
            email: sanitizedEmail,
            role: sanitizedRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (error) throw error;

        // Log admin action for audit trail
        await supabase.rpc('log_admin_action', {
          action_type: 'UPDATE_ADMIN_PROFILE',
          table_name: 'admin_profiles',
          record_id: editingUser.id,
          old_data: { email: editingUser.email, role: editingUser.role },
          new_data: { email: sanitizedEmail, role: sanitizedRole }
        });

        toast({
          title: "Success",
          description: "Admin profile updated successfully.",
        });
      } else {
        // For adding new users, we would need to handle auth user creation
        // This is a simplified approach - in production you'd want proper user invitation flow
        setError('Adding new users requires implementing an invitation system with proper email verification.');
        setFormLoading(false);
        return;
      }

      setIsDialogOpen(false);
      loadAdminProfiles();
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        setError(error.errors[0]?.message || 'Invalid input data');
      } else {
        setError(error.message || 'An error occurred');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (user: AdminProfile) => {
    if (!confirm(`Are you sure you want to remove ${user.email} from admin access?`)) {
      return;
    }

    try {
      // Additional security check - prevent deletion if user is only super admin
      if (user.role === 'super_admin') {
        const { data: superAdmins } = await supabase
          .from('admin_profiles')
          .select('id')
          .eq('role', 'super_admin');
        
        if (superAdmins && superAdmins.length <= 1) {
          toast({
            title: "Error",
            description: "Cannot delete the last super admin. System must have at least one super admin.",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // Log admin action for audit trail
      await supabase.rpc('log_admin_action', {
        action_type: 'DELETE_ADMIN_PROFILE',
        table_name: 'admin_profiles',
        record_id: user.id,
        old_data: { email: user.email, role: user.role },
        new_data: null
      });

      toast({
        title: "Success",
        description: "Admin profile removed successfully.",
      });

      loadAdminProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin profile.",
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default';
      case 'admin':
        return 'destructive';
      case 'content_editor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-serif font-semibold">User Management</h1>
          </div>
          
          {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddUser}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Edit Admin User' : 'Add Admin User'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser 
                      ? 'Update admin user details and permissions.'
                      : 'Add a new admin user to the system.'
                    }
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="admin@horselandhotel.com"
                      required
                      disabled={formLoading || !!editingUser}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      disabled={formLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content_editor">Content Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {currentUserRole === 'super_admin' && (
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? 'Saving...' : (editingUser ? 'Update' : 'Add')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Admin Users</h2>
            <p className="text-muted-foreground">
              Manage admin users and their permissions. Only admins can add or remove users.
            </p>
          </div>

          {currentUserRole !== 'admin' && currentUserRole !== 'super_admin' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                You have content editor permissions. Contact an admin to modify user roles.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {adminProfiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{profile.email}</CardTitle>
                        <CardDescription>
                          Added {new Date(profile.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(profile.role)}>
                        {profile.role.replace('_', ' ')}
                      </Badge>
                      {(currentUserRole === 'admin' || currentUserRole === 'super_admin') && (
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(profile)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {adminProfiles.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No admin users found.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
