import { useEffect, useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";


interface AdminProfile {
  id: string;
  email: string;
  user_id: string;
  role: string;
}

export default function AdminDashboard() {
  const location = useLocation();

  // Query for session
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['adminSession'],
    queryFn: async () => {
      const result = await supabase.auth.getSession();
      console.debug('[AdminDashboard] Session check:', result.data.session?.user?.id);
      return result;
    },
  });

  // Query for admin profile (only runs if session exists)
  const { data: adminProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['adminProfile', sessionData?.data?.session?.user?.id],
    queryFn: async () => {
      if (!sessionData?.data?.session?.user?.id) return null;
      
      console.debug('[AdminDashboard] Checking admin profile for:', sessionData.data.session.user.id);
      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', sessionData.data.session.user.id)
        .single();

      if (error) {
        console.debug('[AdminDashboard] Admin profile error:', error.message);
        return null;
      }

      console.debug('[AdminDashboard] Admin profile found:', profile?.role);
      return profile;
    },
    enabled: !!sessionData?.data?.session?.user?.id,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Show loading while checking session and profile
  if (sessionLoading || profileLoading) {
    console.debug('[AdminDashboard] Loading state - session:', sessionLoading, 'profile:', profileLoading);
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no session
  if (!sessionData?.data?.session && location.pathname !== '/admin/login') {
    console.debug('[AdminDashboard] No session, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect to login if session exists but user is not an admin
  if (sessionData?.data?.session && !adminProfile && !profileLoading && location.pathname !== '/admin/login') {
    console.debug('[AdminDashboard] Session exists but no admin profile, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  const activeMenuItem = location.pathname === '/admin' 
    ? { label: 'Dashboard', description: 'Overview and analytics' }
    : location.pathname.startsWith('/admin/bookings') 
    ? { label: 'Bookings', description: 'Manage reservations' }
    : location.pathname.startsWith('/admin/guests') 
    ? { label: 'Guests', description: 'Guest management' }
    : location.pathname.startsWith('/admin/payments') 
    ? { label: 'Payments', description: 'Payment tracking' }
    : location.pathname.startsWith('/admin/invoices') 
    ? { label: 'Invoices', description: 'Invoice management' }
    : location.pathname.startsWith('/admin/rooms') 
    ? { label: 'Rooms', description: 'Room types & units' }
    : location.pathname.startsWith('/admin/packages') 
    ? { label: 'Packages', description: 'Vacation packages' }
    : location.pathname.startsWith('/admin/dining') 
    ? { label: 'Dining', description: 'Meals & menus' }
    : location.pathname.startsWith('/admin/activities') 
    ? { label: 'Activities', description: 'Activity management' }
    : location.pathname.startsWith('/admin/spa') 
    ? { label: 'Spa', description: 'Spa services' }
    : location.pathname.startsWith('/admin/media') 
    ? { label: 'Media', description: 'Gallery & uploads' }
    : location.pathname.startsWith('/admin/content') 
    ? { label: 'Content', description: 'Website content' }
    : location.pathname.startsWith('/admin/integrations') 
    ? { label: 'Integrations', description: 'API connections' }
    : location.pathname.startsWith('/admin/users') 
    ? { label: 'Users', description: 'Admin users' }
    : location.pathname.startsWith('/admin/settings') 
    ? { label: 'Settings', description: 'Site configuration' }
    : { label: 'Dashboard', description: 'Welcome to the admin panel' };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground font-heading">
                  {activeMenuItem.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activeMenuItem.description}
                </p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${adminProfile?.email}.png`} alt={adminProfile?.email} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {adminProfile?.email ? adminProfile?.email[0].toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link to="/admin/users" className="w-full h-full block">
                      {adminProfile?.email} ({adminProfile?.role})
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              {/* Dashboard Content */}
              {activeMenuItem.label === 'Dashboard' && (
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground mb-6 font-heading">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="hover:shadow-md transition-all duration-200 border-border">
                      <CardHeader>
                        <CardTitle className="text-card-foreground font-heading">New Booking</CardTitle>
                        <CardDescription>Create a new reservation</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">Create Booking</Button>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all duration-200 border-border">
                      <CardHeader>
                        <CardTitle className="text-card-foreground font-heading">Add Guest</CardTitle>
                        <CardDescription>Register a new guest profile</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">Add Guest</Button>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-all duration-200 border-border">
                      <CardHeader>
                        <CardTitle className="text-card-foreground font-heading">Process Payment</CardTitle>
                        <CardDescription>Record a new payment</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" className="w-full">Process Payment</Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
