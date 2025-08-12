import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Hotel, 
  Package, 
  Calendar, 
  UtensilsCrossed, 
  Sparkles, 
  BookOpen, 
  Star, 
  MessageSquare, 
  Settings, 
  LogOut,
  Users,
  TrendingUp,
  DollarSign,
  UserCog,
  Image as ImageIcon,
  Languages
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  occupancyRate: number;
  revenue: number;
  activeRooms: number;
  publishedPosts: number;
  pendingReviews: number;
  unreadMessages: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    todayBookings: 0,
    occupancyRate: 0,
    revenue: 0,
    activeRooms: 0,
    publishedPosts: 0,
    pendingReviews: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthentication();
    loadDashboardStats();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin/login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (!profile) {
        toast({
          title: "Access denied",
          description: "Admin privileges required.",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        navigate('/admin/login');
        return;
      }

      setUserRole(profile.role);
      setUserEmail(profile.email);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/admin/login');
    }
  };

  const loadDashboardStats = async () => {
    try {
      // Load real stats from database
      const [
        bookingsResult,
        roomTypesResult,
        blogPostsResult,
        reviewsResult,
        messagesResult
      ] = await Promise.all([
        supabase.from('bookings').select('*'),
        supabase.from('room_types').select('*').eq('is_published', true),
        supabase.from('blog_posts').select('*').eq('is_published', true),
        supabase.from('guest_reviews').select('*').eq('is_published', false),
        supabase.from('contact_messages').select('*').eq('is_read', false)
      ]);

      const bookings = bookingsResult.data || [];
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings.filter(b => 
        new Date(b.created_at).toISOString().split('T')[0] === today
      );

      // Calculate total revenue
      const totalRevenue = bookings.reduce((sum, booking) => 
        sum + Number(booking.total_amount), 0
      );

      setStats({
        totalBookings: bookings.length,
        todayBookings: todayBookings.length,
        occupancyRate: Math.round((bookings.length / 30) * 100), // Simplified calculation
        revenue: totalRevenue,
        activeRooms: roomTypesResult.data?.length || 0,
        publishedPosts: blogPostsResult.data?.length || 0,
        pendingReviews: reviewsResult.data?.length || 0,
        unreadMessages: messagesResult.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Keep stats at 0 if there's an error
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const menuItems = [
    { 
      title: 'User Management', 
      description: 'Manage admin users and roles',
      icon: UserCog, 
      path: '/admin/users',
      color: 'bg-red-500'
    },
    { 
      title: 'Guest Management', 
      description: 'Manage guest profiles, documents & credit wallet',
      icon: Users, 
      path: '/admin/guests',
      color: 'bg-violet-500'
    },
    { 
      title: 'Room Management', 
      description: 'Manage room types and availability',
      icon: Hotel, 
      path: '/admin/rooms',
      color: 'bg-blue-500'
    },
    { 
      title: 'Package Management', 
      description: 'Create and edit packages',
      icon: Package, 
      path: '/admin/packages',
      color: 'bg-purple-500'
    },
    { 
      title: 'Bookings', 
      description: 'View and manage reservations',
      icon: Calendar, 
      path: '/admin/bookings',
      color: 'bg-green-500'
    },
    { 
      title: 'Activities', 
      description: 'Manage hotel activities',
      icon: UtensilsCrossed, 
      path: '/admin/activities',
      color: 'bg-orange-500'
    },
    { 
      title: 'Spa & Wellness', 
      description: 'Manage spa services',
      icon: Sparkles, 
      path: '/admin/spa',
      color: 'bg-pink-500'
    },
    { 
      title: 'Dining Management', 
      description: 'Manage meals and dining options',
      icon: UtensilsCrossed, 
      path: '/admin/dining',
      color: 'bg-amber-500'
    },
    { 
      title: 'Blog & Journal', 
      description: 'Manage blog posts and content',
      icon: BookOpen, 
      path: '/admin/blog',
      color: 'bg-indigo-500'
    },
    { 
      title: 'Reviews', 
      description: 'Manage guest testimonials',
      icon: Star, 
      path: '/admin/reviews',
      color: 'bg-yellow-500'
    },
    { 
      title: 'Messages', 
      description: 'View contact form submissions',
      icon: MessageSquare, 
      path: '/admin/messages',
      color: 'bg-cyan-500'
    },
    { 
      title: 'Media Management', 
      description: 'Manage gallery images and media',
      icon: ImageIcon, 
      path: '/admin/media',
      color: 'bg-emerald-500'
    },
    { 
      title: 'Content Management', 
      description: 'Manage translations and website content',
      icon: Languages, 
      path: '/admin/content',
      color: 'bg-teal-500'
    },
    { 
      title: 'Settings', 
      description: 'Global site settings',
      icon: Settings, 
      path: '/admin/settings',
      color: 'bg-gray-500'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            <LayoutDashboard className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-serif font-semibold">Horseland Admin</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              {userEmail}
            </div>
            <Badge variant="secondary" className="capitalize">
              {userRole.replace('_', ' ')}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayBookings}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.totalBookings} total bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRooms} active rooms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalBookings} bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReviews + stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReviews} reviews, {stats.unreadMessages} messages
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Card 
                key={item.path}
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate(item.path)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${item.color} text-white group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
