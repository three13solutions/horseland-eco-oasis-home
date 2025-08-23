import { Link, useLocation } from 'react-router-dom';
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
  Plug
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

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

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();

  const activeMenuItem = menuItems.find(item => 
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  const isActive = (item: any) => {
    return item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
  };

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-4 py-4">
          <h1 className={`font-heading font-bold text-sidebar-foreground transition-all duration-200 ${
            isCollapsed ? 'text-lg' : 'text-2xl'
          }`}>
            {isCollapsed ? 'AP' : 'Admin Panel'}
          </h1>
          {!isCollapsed && (
            <p className="text-sm text-sidebar-foreground/70 mt-1">Manage your site</p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'Management'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <Link
                      to={item.path}
                      className={`flex items-center space-x-3 transition-colors ${
                        isActive(item)
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}