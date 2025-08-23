import { useEffect, useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  BarChart3, 
  FileText, 
  UserCheck, 
  Building, 
  UtensilsCrossed, 
  Camera, 
  Dumbbell, 
  Sparkles, 
  Package,
  LogOut,
  Plug // Added for integrations
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  description: string;
  exact?: boolean;
}

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

  const menuItems = [
    { 
      icon: BarChart3, 
      label: 'Dashboard', 
      path: '/admin', 
      description: 'Overview and analytics',
      exact: true 
    },
    { 
      icon: Calendar, 
      label: 'Bookings', 
      path: '/admin/bookings', 
      description: 'Manage reservations' 
    },
    { 
      icon: Users, 
      label: 'Guests', 
      path: '/admin/guests', 
      description: 'Guest management' 
    },
    { 
      icon: CreditCard, 
      label: 'Payments', 
      path: '/admin/payments', 
      description: 'Payment tracking' 
    },
    { 
      icon: FileText, 
      label: 'Invoices', 
      path: '/admin/invoices', 
      description: 'Invoice management' 
    },
    { 
      icon: Building, 
      label: 'Rooms', 
      path: '/admin/rooms', 
      description: 'Room types & units' 
    },
    { 
      icon: Package, 
      label: 'Packages', 
      path: '/admin/packages', 
      description: 'Vacation packages' 
    },
    { 
      icon: UtensilsCrossed, 
      label: 'Dining', 
      path: '/admin/dining', 
      description: 'Meals & menus' 
    },
    { 
      icon: Dumbbell, 
      label: 'Activities', 
      path: '/admin/activities', 
      description: 'Activity management' 
    },
    { 
      icon: Sparkles, 
      label: 'Spa', 
      path: '/admin/spa', 
      description: 'Spa services' 
    },
    { 
      icon: Camera, 
      label: 'Media', 
      path: '/admin/media', 
      description: 'Gallery & uploads' 
    },
    { 
      icon: FileText, 
      label: 'Content', 
      path: '/admin/content', 
      description: 'Website content' 
    },
    { 
      icon: Plug, 
      label: 'Integrations', 
      path: '/admin/integrations', 
      description: 'API connections' 
    },
    { 
      icon: UserCheck, 
      label: 'Users', 
      path: '/admin/users', 
      description: 'Admin users' 
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      path: '/admin/settings', 
      description: 'Site configuration' 
    }
  ];

  const activeMenuItem = menuItems.find(item => 
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-none bg-gray-100 border-r border-gray-200 py-4 px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-600">Manage your site</p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center space-x-3 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors ${
                activeMenuItem?.label === item.label ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {activeMenuItem ? activeMenuItem.label : 'Dashboard'}
            </h2>
            <p className="text-gray-600">
              {activeMenuItem ? activeMenuItem.description : 'Welcome to the admin panel'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://avatar.vercel.sh/${adminProfile?.email}.png`} alt={adminProfile?.email} />
                  <AvatarFallback>
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

        {/* Content area */}
        <div className="bg-white rounded-md shadow-md p-6">
          {/* You can render different content based on the active menu item here */}
          {/* For example: */}
          {activeMenuItem?.label === 'Dashboard' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>New Booking</CardTitle>
                    <CardDescription>Create a new reservation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Create Booking</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Add Guest</CardTitle>
                    <CardDescription>Register a new guest profile</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Add Guest</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Process Payment</CardTitle>
                    <CardDescription>Record a new payment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">Process Payment</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Add more content sections for other menu items */}
          {/* Example: */}
          {/* {activeMenuItem?.label === 'Bookings' && <BookingManagement />} */}
        </div>
      </div>
    </div>
  );
}
