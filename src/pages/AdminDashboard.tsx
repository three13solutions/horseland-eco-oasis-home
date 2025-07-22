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
  DollarSign
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
  const [userRole] = useState<string>('admin'); // Hardcoded as admin for now
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Skip authentication checks for now
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Use mock data since we don't have real data yet
      setStats({
        totalBookings: 125,
        todayBookings: 8,
        occupancyRate: 85,
        revenue: 45000,
        activeRooms: 12,
        publishedPosts: 15,
        pendingReviews: 3,
        unreadMessages: 7,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    toast({
      title: "Demo mode",
      description: "Authentication is disabled for now.",
    });
    navigate('/');
  };

  const menuItems = [
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
            <Badge variant="secondary" className="capitalize">
              {userRole.replace('_', ' ')} (Demo Mode)
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Exit Demo
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
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReviews}</div>
              <p className="text-xs text-muted-foreground">
                {stats.unreadMessages} unread messages
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
