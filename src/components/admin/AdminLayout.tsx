import { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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

export default function AdminLayout() {
  const location = useLocation();

  // Query for session
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['adminSession'],
    queryFn: async () => {
      const result = await supabase.auth.getSession();
      console.debug('[AdminLayout] Session check:', result.data.session?.user?.id);
      return result;
    },
  });

  // Query for admin profile (only runs if session exists)
  const { data: adminProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['adminProfile', sessionData?.data?.session?.user?.id],
    queryFn: async () => {
      if (!sessionData?.data?.session?.user?.id) return null;
      
      console.debug('[AdminLayout] Checking admin profile for:', sessionData.data.session.user.id);
      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', sessionData.data.session.user.id)
        .single();

      if (error) {
        console.debug('[AdminLayout] Admin profile error:', error.message);
        return null;
      }

      console.debug('[AdminLayout] Admin profile found:', profile?.role);
      return profile;
    },
    enabled: !!sessionData?.data?.session?.user?.id,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Show loading while checking session and profile
  if (sessionLoading || profileLoading) {
    console.debug('[AdminLayout] Loading state - session:', sessionLoading, 'profile:', profileLoading);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no session
  if (!sessionData?.data?.session && location.pathname !== '/admin/login') {
    console.debug('[AdminLayout] No session, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect to login if session exists but user is not an admin
  if (sessionData?.data?.session && !adminProfile && !profileLoading && location.pathname !== '/admin/login') {
    console.debug('[AdminLayout] Session exists but no admin profile, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  const getPageInfo = () => {
    const path = location.pathname;
    
    if (path === '/admin') return { label: 'Dashboard', description: 'Overview and analytics' };
    if (path.startsWith('/admin/bookings')) return { label: 'Bookings', description: 'Manage reservations' };
    if (path.startsWith('/admin/guests')) return { label: 'Guests', description: 'Guest management' };
    if (path.startsWith('/admin/payments')) return { label: 'Payments', description: 'Payment tracking' };
    if (path.startsWith('/admin/invoices')) return { label: 'Invoices', description: 'Invoice management' };
    if (path.startsWith('/admin/rooms')) return { label: 'Rooms', description: 'Room types & units' };
    if (path.startsWith('/admin/packages')) return { label: 'Packages', description: 'Vacation packages' };
    if (path.startsWith('/admin/dining')) return { label: 'Dining', description: 'Meals & menus' };
    if (path.startsWith('/admin/activities')) return { label: 'Activities', description: 'Activity management' };
    if (path.startsWith('/admin/spa')) return { label: 'Spa', description: 'Spa services' };
    if (path.startsWith('/admin/addons')) return { label: 'Addons', description: 'Additional services' };
    if (path.startsWith('/admin/media')) return { label: 'Media', description: 'Gallery & uploads' };
    if (path.startsWith('/admin/content')) return { label: 'Content', description: 'Website content' };
    if (path.startsWith('/admin/blog')) return { label: 'Blog', description: 'Blog posts' };
    if (path.startsWith('/admin/pages')) return { label: 'Pages', description: 'Page management' };
    if (path.startsWith('/admin/faq')) return { label: 'FAQ Management', description: 'Manage FAQ sections' };
    if (path.startsWith('/admin/integrations')) return { label: 'Integrations', description: 'API connections' };
    if (path.startsWith('/admin/users')) return { label: 'Users', description: 'Admin users' };
    if (path.startsWith('/admin/settings')) return { label: 'Settings', description: 'Site configuration' };
    
    return { label: 'Dashboard', description: 'Welcome to the admin panel' };
  };

  const pageInfo = getPageInfo();

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
                  {pageInfo.label}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {pageInfo.description}
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
                    <span className="w-full">
                      {adminProfile?.email} ({adminProfile?.role})
                    </span>
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
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}