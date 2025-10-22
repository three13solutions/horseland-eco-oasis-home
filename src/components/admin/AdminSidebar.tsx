import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
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
  Plug,
  ChevronDown,
  ChevronRight,
  Boxes,
  BookOpen,
  FileCode,
  Grid3x3,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Home as HomeIcon,
  CalendarRange,
  Calculator
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainMenuItems = [
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
  }
];

const pricingMenuItems = [
  { 
    icon: DollarSign, 
    label: 'Pricing Rules', 
    path: '/admin/pricing/rules', 
    description: 'Dynamic pricing engine' 
  },
  { 
    icon: Tag, 
    label: 'Category Pricing', 
    path: '/admin/pricing/categories', 
    description: 'Room category rates' 
  },
  { 
    icon: HomeIcon, 
    label: 'Unit Pricing', 
    path: '/admin/pricing/units', 
    description: 'Individual unit rates' 
  },
  { 
    icon: CalendarRange, 
    label: 'Season Rules', 
    path: '/admin/pricing/seasons', 
    description: 'Seasonal definitions' 
  },
  { 
    icon: Calculator, 
    label: 'Rounding Rule', 
    path: '/admin/pricing/rounding', 
    description: 'Price rounding settings' 
  }
];

const serviceMenuItems = [
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
    icon: Boxes, 
    label: 'Addons', 
    path: '/admin/addons', 
    description: 'Additional services' 
  }
];

const mediaMenuItems = [
  { 
    icon: Camera, 
    label: 'Media Library', 
    path: '/admin/media', 
    description: 'All media files' 
  },
  { 
    icon: Grid3x3, 
    label: 'Categories', 
    path: '/admin/categories', 
    description: 'Category management' 
  },
  { 
    icon: ImageIcon, 
    label: 'Galleries', 
    path: '/admin/galleries', 
    description: 'Public galleries' 
  }
];

const systemMenuItems = [
  { 
    icon: BookOpen, 
    label: 'Blog', 
    path: '/admin/blog', 
    description: 'Journal posts' 
  },
  { 
    icon: FileCode, 
    label: 'Pages', 
    path: '/admin/pages', 
    description: 'Page content & translations' 
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
  const [pricingOpen, setPricingOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(true);

  const isActive = (item: any) => {
    return item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
  };

  const hasActivePricing = pricingMenuItems.some(item => isActive(item));
  const hasActiveService = serviceMenuItems.some(item => isActive(item));
  const hasActiveMedia = mediaMenuItems.some(item => isActive(item));

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
        {/* Main Menu Items */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
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

        {/* Pricing & Rates Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'Pricing & Rates'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isCollapsed ? (
                <Collapsible open={pricingOpen} onOpenChange={setPricingOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-4 w-4" />
                      <span>Pricing</span>
                    </div>
                    {pricingOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {pricingMenuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton asChild isActive={isActive(item)} size="sm">
                            <Link
                              to={item.path}
                              className={`flex items-center space-x-3 transition-colors ${
                                isActive(item)
                                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                              }`}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Collapsed state - show pricing items as individual items
                pricingMenuItems.map((item) => (
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
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Services Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'Services'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isCollapsed ? (
                <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4" />
                      <span>Services</span>
                    </div>
                    {servicesOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {serviceMenuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton asChild isActive={isActive(item)} size="sm">
                            <Link
                              to={item.path}
                              className={`flex items-center space-x-3 transition-colors ${
                                isActive(item)
                                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                              }`}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Collapsed state - show services as individual items
                serviceMenuItems.map((item) => (
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
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Media Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'Media'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isCollapsed ? (
                <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
                    <div className="flex items-center space-x-3">
                      <Camera className="h-4 w-4" />
                      <span>Media</span>
                    </div>
                    {mediaOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1">
                      {mediaMenuItems.map((item) => (
                        <SidebarMenuItem key={item.label}>
                          <SidebarMenuButton asChild isActive={isActive(item)} size="sm">
                            <Link
                              to={item.path}
                              className={`flex items-center space-x-3 transition-colors ${
                                isActive(item)
                                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                              }`}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Collapsed state - show media items individually
                mediaMenuItems.map((item) => (
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
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Menu Items */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium">
            {isCollapsed ? '' : 'System'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemMenuItems.map((item) => (
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