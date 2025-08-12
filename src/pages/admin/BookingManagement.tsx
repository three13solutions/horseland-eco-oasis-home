import React, { useState, useEffect } from 'react';
import { Calendar, Eye, Search, Filter, Users, IndianRupee, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Bot, RefreshCw, Edit, Plus, Phone, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_amount: number;
  payment_status: string;
  notes?: string;
  created_at: string;
  room_unit_id?: string;
  room_type_id?: string;
  package_id?: string;
  selected_meals?: any[];
  selected_activities?: any[];
  selected_spa_services?: any[];
  selected_bedding?: any[];
  room_units?: {
    unit_number: string;
    unit_name?: string;
    room_types?: {
      name: string;
    };
  };
  room_types?: {
    name: string;
    max_guests?: number;
  };
  packages?: {
    title: string;
    inclusions?: string[];
    components?: any;
  } | null;
}

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name?: string;
  status: string;
  room_type_id: string;
  is_active: boolean;
  room_types?: {
    name: string;
  };
}

interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  pendingPayments: number;
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomUnits, setRoomUnits] = useState<RoomUnit[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);
  const [selectedRoomOverride, setSelectedRoomOverride] = useState<string>('');
  const [overrideBookingId, setOverrideBookingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    pendingPayments: 0,
  });

  // Create booking form state
  const [createFormData, setCreateFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: undefined as Date | undefined,
    check_out: undefined as Date | undefined,
    guests_count: 2,
    room_type_id: '',
    total_amount: 0,
    payment_status: 'pending',
    notes: '',
    selected_meals: [] as any[],
    selected_activities: [] as any[],
    selected_spa_services: [] as any[],
    selected_bedding: [] as any[],
  });

  // Available services for addon selection
  const [availableMeals, setAvailableMeals] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [availableSpaServices, setAvailableSpaServices] = useState<any[]>([]);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
    loadRoomUnits();
    loadRoomTypes();
    loadAddonServices();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room_units(unit_number, unit_name, room_types(name)),
          room_types(name),
          packages(title, inclusions, components)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data || []) as any);
      calculateStats((data || []) as any);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    }
  };

  const loadRoomUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('room_units')
        .select(`
          *,
          room_types(name)
        `)
        .eq('is_active', true)
        .order('unit_number');

      if (error) throw error;
      setRoomUnits(data || []);
    } catch (error) {
      console.error('Error loading room units:', error);
      toast({
        title: "Error",
        description: "Failed to load room units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAddonServices = async () => {
    try {
      // Load meals using any type to bypass TypeScript error
      const { data: mealsData, error: mealsError } = await (supabase as any)
        .from('meals')
        .select('*')
        .eq('is_active', true);
      
      if (!mealsError) {
        setAvailableMeals(mealsData || []);
      }

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true);
      
      if (!activitiesError) {
        setAvailableActivities(activitiesData || []);
      }

      // Load spa services
      const { data: spaData, error: spaError } = await supabase
        .from('spa_services')
        .select('*')
        .eq('is_active', true);
      
      if (!spaError) {
        setAvailableSpaServices(spaData || []);
      }
    } catch (error) {
      console.error('Error loading addon services:', error);
    }
  };

  const loadRoomTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .eq('is_published', true)
        .order('name');

      if (error) throw error;
      setRoomTypes(data || []);
    } catch (error) {
      console.error('Error loading room types:', error);
    }
  };

  const calculateStats = (bookingData: Booking[]) => {
    const totalBookings = bookingData.length;
    const totalRevenue = bookingData.reduce((sum, booking) => sum + Number(booking.total_amount), 0);
    const pendingPayments = bookingData.filter(b => b.payment_status === 'pending').length;
    
    // Calculate occupancy rate (simplified - active bookings vs total units)
    const activeBookings = bookingData.filter(b => {
      const today = new Date();
      const checkIn = parseISO(b.check_in);
      const checkOut = parseISO(b.check_out);
      return (isBefore(checkIn, today) || isToday(checkIn)) && isAfter(checkOut, today);
    }).length;
    
    const occupancyRate = roomUnits.length > 0 ? (activeBookings / roomUnits.length) * 100 : 0;

    setStats({
      totalBookings,
      totalRevenue,
      occupancyRate: Math.round(occupancyRate),
      pendingPayments,
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      confirmed: { variant: 'default' as const, icon: CheckCircle, label: 'Confirmed' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getBookingStatusForToday = (booking: Booking) => {
    const today = new Date();
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);

    if (isToday(checkIn)) return 'checking-in';
    if (isToday(checkOut)) return 'checking-out';
    if (isBefore(checkIn, today) && isAfter(checkOut, today)) return 'active';
    if (isAfter(checkIn, today)) return 'upcoming';
    if (isBefore(checkOut, today)) return 'past';
    return 'unknown';
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.room_units?.unit_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.payment_status === statusFilter;

    const matchesDate = (() => {
      if (dateFilter === 'all') return true;
      const today = new Date();
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      
      switch (dateFilter) {
        case 'active':
          return (isBefore(checkIn, today) || isToday(checkIn)) && isAfter(checkOut, today);
        case 'upcoming':
          return isAfter(checkIn, today);
        case 'past':
          return isBefore(checkOut, today);
        case 'today':
          return isToday(checkIn) || isToday(checkOut);
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleAutoAssign = async (booking: Booking) => {
    if (!booking.room_type_id) {
      toast({
        title: "Error",
        description: "Please select a room type first",
        variant: "destructive",
      });
      return;
    }

    setAutoAssigning(booking.id);

    try {
      const { data, error } = await supabase.functions.invoke('auto-assign-room', {
        body: {
          bookingId: booking.id,
          roomTypeId: booking.room_type_id,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          guestsCount: booking.guests_count
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Auto-assignment Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Room Assigned Successfully",
        description: `Automatically assigned unit to ${booking.guest_name}`,
      });

      loadBookings(); // Refresh the bookings list
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast({
        title: "Error",
        description: "Failed to auto-assign room",
        variant: "destructive",
      });
    } finally {
      setAutoAssigning(null);
    }
  };

  const handleManualOverride = async (bookingId: string, roomUnitId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ room_unit_id: roomUnitId })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Room Assignment Updated",
        description: "Room assignment changed successfully",
      });

      setOverrideBookingId(null);
      setSelectedRoomOverride('');
      loadBookings();
    } catch (error: any) {
      console.error('Manual override error:', error);
      toast({
        title: "Error",
        description: "Failed to update room assignment",
        variant: "destructive",
      });
    }
  };

  const getAvailableUnitsForBooking = (booking: Booking) => {
    if (!booking.room_type_id) return [];
    
    return roomUnits.filter(unit => 
      unit.room_type_id === booking.room_type_id && 
      unit.status === 'available' &&
      unit.is_active
    );
  };

  const getUnitAvailabilityStatus = (unit: RoomUnit) => {
    const activeBooking = bookings.find(booking => {
      if (booking.room_unit_id !== unit.id) return false;
      const today = new Date();
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      return (isBefore(checkIn, today) || isToday(checkIn)) && isAfter(checkOut, today);
    });

    if (activeBooking) {
      return {
        status: 'occupied',
        guest: activeBooking.guest_name,
        checkOut: activeBooking.check_out,
        variant: 'destructive' as const
      };
    }

    if (unit.status === 'maintenance') {
      return {
        status: 'maintenance',
        variant: 'secondary' as const
      };
    }

    return {
      status: 'available',
      variant: 'default' as const
    };
  };

  const renderAddons = (booking: Booking) => {
    const hasAddons = 
      (booking.selected_meals && booking.selected_meals.length > 0) ||
      (booking.selected_activities && booking.selected_activities.length > 0) ||
      (booking.selected_spa_services && booking.selected_spa_services.length > 0) ||
      (booking.selected_bedding && booking.selected_bedding.length > 0) ||
      (booking.packages); // Include packages here

    if (!hasAddons) return null;

    return (
      <div className="mt-2 space-y-1">
        {booking.selected_meals && booking.selected_meals.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-orange-600">🍽️ Meals:</span>
            <span className="text-muted-foreground ml-1">
              {booking.selected_meals.map((meal: any) => 
                `${meal.name} (${meal.quantity})`
              ).join(', ')}
            </span>
          </div>
        )}
        {booking.selected_activities && booking.selected_activities.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-green-600">🏃 Activities:</span>
            <span className="text-muted-foreground ml-1">
              {booking.selected_activities.map((activity: any) => 
                `${activity.name} (${activity.quantity})`
              ).join(', ')}
            </span>
          </div>
        )}
        {booking.selected_spa_services && booking.selected_spa_services.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-purple-600">🧘 Spa:</span>
            <span className="text-muted-foreground ml-1">
              {booking.selected_spa_services.map((spa: any) => 
                `${spa.name} (${spa.quantity})`
              ).join(', ')}
            </span>
          </div>
        )}
        {booking.selected_bedding && booking.selected_bedding.length > 0 && (
          <div className="text-xs">
            <span className="font-medium text-blue-600">🛏️ Extra Bedding:</span>
            <span className="text-muted-foreground ml-1">
              {booking.selected_bedding.map((bedding: any) => 
                `${bedding.name} (${bedding.quantity})`
              ).join(', ')}
            </span>
          </div>
        )}
        {booking.packages && (
          <div className="text-xs">
            <span className="font-medium text-indigo-600">📦 Package:</span>
            <span className="text-muted-foreground ml-1">
              {booking.packages.title}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderPackageDetails = (booking: Booking) => {
    if (!booking.packages) return null;

    return (
      <div className="mt-2 space-y-1">
        <div className="text-sm font-medium text-blue-600">
          📦 {booking.packages.title}
        </div>
        {booking.packages.inclusions && booking.packages.inclusions.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Includes:</span> {booking.packages.inclusions.slice(0, 3).join(', ')}
            {booking.packages.inclusions.length > 3 && '...'}
          </div>
        )}
        {booking.packages.components && (
          <div className="text-xs space-y-0.5">
            {booking.packages.components.meals && booking.packages.components.meals.length > 0 && (
              <div>
                <span className="font-medium text-orange-600">🍽️ Package Meals:</span>
                <span className="text-muted-foreground ml-1">
                  {booking.packages.components.meals.map((meal: any) => meal.name).join(', ')}
                </span>
              </div>
            )}
            {booking.packages.components.spa_services && booking.packages.components.spa_services.length > 0 && (
              <div>
                <span className="font-medium text-purple-600">🧘 Package Spa:</span>
                <span className="text-muted-foreground ml-1">
                  {booking.packages.components.spa_services.map((spa: any) => spa.name).join(', ')}
                </span>
              </div>
            )}
            {booking.packages.components.activities && booking.packages.components.activities.length > 0 && (
              <div>
                <span className="font-medium text-green-600">🏃 Package Activities:</span>
                <span className="text-muted-foreground ml-1">
                  {booking.packages.components.activities.map((activity: any) => activity.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleUpdatePaymentStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Payment Status Updated",
        description: `Payment status changed to ${newStatus}`,
      });

      setEditingPaymentStatus(null);
      setSelectedPaymentStatus('');
      loadBookings();
    } catch (error: any) {
      console.error('Payment status update error:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const addAddonToBooking = (type: 'meals' | 'activities' | 'spa_services', service: any) => {
    const addonItem = {
      id: service.id,
      name: service.title,
      price: Number(service.price || service.price_amount || 0),
      quantity: 1
    };

    setCreateFormData(prev => ({
      ...prev,
      [`selected_${type}`]: [...prev[`selected_${type}` as keyof typeof prev] as any[], addonItem]
    }));
  };

  const removeAddonFromBooking = (type: 'meals' | 'activities' | 'spa_services', index: number) => {
    setCreateFormData(prev => ({
      ...prev,
      [`selected_${type}`]: (prev[`selected_${type}` as keyof typeof prev] as any[]).filter((_, i) => i !== index)
    }));
  };

  const updateAddonQuantity = (type: 'meals' | 'activities' | 'spa_services', index: number, quantity: number) => {
    setCreateFormData(prev => ({
      ...prev,
      [`selected_${type}`]: (prev[`selected_${type}` as keyof typeof prev] as any[]).map((item, i) => 
        i === index ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    }));
  };

  const calculateAddonTotal = () => {
    const mealsTotal = createFormData.selected_meals.reduce((sum, meal) => sum + (meal.price * meal.quantity), 0);
    const activitiesTotal = createFormData.selected_activities.reduce((sum, activity) => sum + (activity.price * activity.quantity), 0);
    const spaTotal = createFormData.selected_spa_services.reduce((sum, spa) => sum + (spa.price * spa.quantity), 0);
    const beddingTotal = createFormData.selected_bedding.reduce((sum, bedding) => sum + (bedding.price * bedding.quantity), 0);
    return mealsTotal + activitiesTotal + spaTotal + beddingTotal;
  };

  // Calculate fixed bed capacity for a room type
  const getFixedBedCapacity = (roomTypeId: string) => {
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    if (!roomType) return 2; // Default capacity
    
    // If room type has max_guests, use that as fixed capacity
    // In a real scenario, you'd calculate from bed_configuration
    return roomType.max_guests || 2;
  };

  // Get available bedding options
  const getBeddingOptions = () => [
    { id: 'floor_mattress', name: 'Floor Mattress', price: 500, description: 'Comfortable floor mattress with bedding' },
    { id: 'roll_on_bed', name: 'Roll-on Bed', price: 800, description: 'Portable roll-on bed with mattress' },
  ];

  // Add bedding to booking
  const addBeddingToBooking = (bedding: any) => {
    const existingIndex = createFormData.selected_bedding.findIndex(b => b.id === bedding.id);
    
    if (existingIndex >= 0) {
      // Update quantity if already exists
      const updated = [...createFormData.selected_bedding];
      updated[existingIndex].quantity += 1;
      setCreateFormData(prev => ({ ...prev, selected_bedding: updated }));
    } else {
      // Add new bedding with quantity 1
      setCreateFormData(prev => ({
        ...prev,
        selected_bedding: [...prev.selected_bedding, { ...bedding, quantity: 1 }]
      }));
    }
  };

  // Update bedding quantity
  const updateBeddingQuantity = (index: number, quantity: number) => {
    const updated = [...createFormData.selected_bedding];
    updated[index].quantity = Math.max(1, quantity);
    setCreateFormData(prev => ({ ...prev, selected_bedding: updated }));
  };

  // Remove bedding from booking
  const removeBeddingFromBooking = (index: number) => {
    const updated = createFormData.selected_bedding.filter((_, i) => i !== index);
    setCreateFormData(prev => ({ ...prev, selected_bedding: updated }));
  };

  const resetCreateForm = () => {
    setCreateFormData({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      check_in: undefined,
      check_out: undefined,
      guests_count: 2,
      room_type_id: '',
      total_amount: 0,
      payment_status: 'pending',
      notes: '',
      selected_meals: [],
      selected_activities: [],
      selected_spa_services: [],
      selected_bedding: [],
    });
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.guest_name || !createFormData.check_in || !createFormData.check_out) {
      toast({
        title: "Validation Error",
        description: "Please fill in guest name, check-in, and check-out dates",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate booking ID
      const bookingId = `BK${Date.now().toString().slice(-6)}`;

      const bookingData = {
        booking_id: bookingId,
        guest_name: createFormData.guest_name,
        guest_email: createFormData.guest_email || null,
        guest_phone: createFormData.guest_phone || null,
        check_in: format(createFormData.check_in, 'yyyy-MM-dd'),
        check_out: format(createFormData.check_out, 'yyyy-MM-dd'),
        guests_count: createFormData.guests_count,
        room_type_id: createFormData.room_type_id || null,
        total_amount: createFormData.total_amount,
        payment_status: createFormData.payment_status,
        notes: createFormData.notes || null,
        selected_meals: createFormData.selected_meals,
        selected_activities: createFormData.selected_activities,
        selected_spa_services: createFormData.selected_spa_services,
        selected_bedding: createFormData.selected_bedding,
      };

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Booking Created",
        description: `Booking ${bookingId} created successfully for ${createFormData.guest_name}`,
      });

      // Auto-assign room if room type is selected
      if (createFormData.room_type_id && newBooking) {
        await handleAutoAssign({
          ...newBooking,
          room_type_id: createFormData.room_type_id,
          room_types: { name: roomTypes.find(rt => rt.id === createFormData.room_type_id)?.name || '' }
        });
      }

      setShowCreateForm(false);
      resetCreateForm();
      loadBookings();

    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Booking Management</h1>
            <p className="text-muted-foreground">
              Manage reservations, room availability, and guest information
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Create Phone Booking
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bookings">All Bookings</TabsTrigger>
          <TabsTrigger value="availability">Room Availability</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by guest name, booking ID, email, or room..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="active">Active Stays</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                            ? 'No bookings match your filters'
                            : 'No bookings found'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.booking_id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.guest_name}</div>
                            {booking.guest_email && (
                              <div className="text-sm text-muted-foreground">{booking.guest_email}</div>
                            )}
                            {booking.guest_phone && (
                              <div className="text-sm text-muted-foreground">{booking.guest_phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {booking.room_unit_id ? (
                              <div>
                                <div className="font-medium">
                                  {booking.room_units?.unit_number}
                                  {booking.room_units?.unit_name && ` - ${booking.room_units.unit_name}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {booking.room_units?.room_types?.name}
                                </div>
                                {renderAddons(booking)}
                                {overrideBookingId === booking.id ? (
                                  <div className="flex gap-2 mt-2">
                                    <Select value={selectedRoomOverride} onValueChange={setSelectedRoomOverride}>
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getAvailableUnitsForBooking(booking).map((unit) => (
                                          <SelectItem key={unit.id} value={unit.id}>
                                            {unit.unit_number} - {unit.unit_name || 'No name'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      onClick={() => handleManualOverride(booking.id, selectedRoomOverride)}
                                      disabled={!selectedRoomOverride}
                                    >
                                      Update
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setOverrideBookingId(null);
                                        setSelectedRoomOverride('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1"
                                    onClick={() => setOverrideBookingId(booking.id)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Change Room
                                  </Button>
                                )}
                              </div>
                            ) : booking.room_type_id ? (
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                  {booking.room_types?.name} (No unit assigned)
                                </div>
                                {renderAddons(booking)}
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAutoAssign(booking)}
                                    disabled={autoAssigning === booking.id}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    {autoAssigning === booking.id ? (
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Bot className="h-3 w-3 mr-1" />
                                    )}
                                    Auto-assign
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOverrideBookingId(booking.id)}
                                  >
                                    Manual
                                  </Button>
                                </div>
                                {overrideBookingId === booking.id && (
                                  <div className="flex gap-2 mt-2">
                                    <Select value={selectedRoomOverride} onValueChange={setSelectedRoomOverride}>
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getAvailableUnitsForBooking(booking).map((unit) => (
                                          <SelectItem key={unit.id} value={unit.id}>
                                            {unit.unit_number} - {unit.unit_name || 'No name'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="sm"
                                      onClick={() => handleManualOverride(booking.id, selectedRoomOverride)}
                                      disabled={!selectedRoomOverride}
                                    >
                                      Assign
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setOverrideBookingId(null);
                                        setSelectedRoomOverride('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-medium text-muted-foreground">
                                  No room assigned
                                </div>
                                {renderAddons(booking)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(parseISO(booking.check_in), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(parseISO(booking.check_out), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{booking.guests_count}</TableCell>
                        <TableCell>₹{Number(booking.total_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          {editingPaymentStatus === booking.id ? (
                            <div className="flex gap-2 items-center">
                              <Select 
                                value={selectedPaymentStatus} 
                                onValueChange={setSelectedPaymentStatus}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePaymentStatus(booking.id, selectedPaymentStatus)}
                                disabled={!selectedPaymentStatus}
                              >
                                Update
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPaymentStatus(null);
                                  setSelectedPaymentStatus('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {getPaymentStatusBadge(booking.payment_status)}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPaymentStatus(booking.id);
                                  setSelectedPaymentStatus(booking.payment_status);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Booking Details - {booking.booking_id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Guest Name</Label>
                                    <p className="text-sm text-muted-foreground">{booking.guest_name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Email</Label>
                                    <p className="text-sm text-muted-foreground">{booking.guest_email || '-'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Phone</Label>
                                    <p className="text-sm text-muted-foreground">{booking.guest_phone || '-'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Guests Count</Label>
                                    <p className="text-sm text-muted-foreground">{booking.guests_count}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Check-in</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {format(parseISO(booking.check_in), 'EEEE, MMMM dd, yyyy')}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Check-out</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {format(parseISO(booking.check_out), 'EEEE, MMMM dd, yyyy')}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Total Amount</Label>
                                    <p className="text-sm text-muted-foreground">₹{Number(booking.total_amount).toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Payment Status</Label>
                                    <div className="mt-1">{getPaymentStatusBadge(booking.payment_status)}</div>
                                  </div>
                                </div>
                                {booking.notes && (
                                  <div>
                                    <Label className="text-sm font-medium">Notes</Label>
                                    <p className="text-sm text-muted-foreground mt-1">{booking.notes}</p>
                                  </div>
                                )}
                                <div>
                                  <Label className="text-sm font-medium">Booking Created</Label>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(booking.created_at), 'MMMM dd, yyyy at h:mm a')}
                                  </p>
                                </div>

                                {/* Combined Services & Packages */}
                                {renderAddons(booking) && (
                                  <div>
                                    <Label className="text-sm font-medium">Services & Add-ons</Label>
                                    {renderAddons(booking)}
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Availability Status</CardTitle>
              <CardDescription>
                Real-time status of all room units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {roomUnits.map((unit) => {
                  const availability = getUnitAvailabilityStatus(unit);
                  return (
                    <Card key={unit.id} className="relative">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">
                              {unit.unit_number}
                              {unit.unit_name && ` - ${unit.unit_name}`}
                            </h3>
                            <Badge variant={availability.variant}>
                              {availability.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {unit.room_types?.name}
                          </p>
                          {availability.status === 'occupied' && availability.guest && (
                            <div className="text-sm">
                              <p className="font-medium">Guest: {availability.guest}</p>
                              <p className="text-muted-foreground">
                                Check-out: {format(parseISO(availability.checkOut!), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {roomUnits.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No room units found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Create Phone Booking
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateBooking} className="space-y-6">
            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Guest Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_name">Guest Name *</Label>
                  <Input
                    id="guest_name"
                    value={createFormData.guest_name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                    placeholder="Enter guest name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_email">Email</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={createFormData.guest_email}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guest_email: e.target.value }))}
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="guest_phone">Phone Number</Label>
                  <Input
                    id="guest_phone"
                    value={createFormData.guest_phone}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guest_phone: e.target.value }))}
                    placeholder="+91-9876543210"
                  />
                </div>
                <div>
                  <Label htmlFor="guests_count">Number of Guests</Label>
                  <Input
                    id="guests_count"
                    type="number"
                    min="1"
                    max="10"
                    value={createFormData.guests_count}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, guests_count: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Booking Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Check-in Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !createFormData.check_in && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createFormData.check_in ? format(createFormData.check_in, "PPP") : "Select check-in date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={createFormData.check_in}
                        onSelect={(date) => setCreateFormData(prev => ({ ...prev, check_in: date }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Check-out Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !createFormData.check_out && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {createFormData.check_out ? format(createFormData.check_out, "PPP") : "Select check-out date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={createFormData.check_out}
                        onSelect={(date) => setCreateFormData(prev => ({ ...prev, check_out: date }))}
                        disabled={(date) => date <= (createFormData.check_in || new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="room_type">Room Type</Label>
                  <Select
                    value={createFormData.room_type_id}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, room_type_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType.id} value={roomType.id}>
                          {roomType.name} - ₹{roomType.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="total_amount">Total Amount (₹)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createFormData.total_amount}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select
                    value={createFormData.payment_status}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, payment_status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special requests, preferences, etc."
                  rows={3}
                />
              </div>
            </div>

            {/* Add-on Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add-on Services (Optional)</h3>
              
              {/* Meals */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-orange-600">🍽️ Meals</Label>
                {createFormData.selected_meals.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {createFormData.selected_meals.map((meal, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-md">
                        <span className="flex-1 text-sm">{meal.name}</span>
                        <Input
                          type="number"
                          min="1"
                          value={meal.quantity}
                          onChange={(e) => updateAddonQuantity('meals', index, parseInt(e.target.value) || 1)}
                          className="w-16 h-8"
                        />
                        <span className="text-sm">₹{(meal.price * meal.quantity).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAddonFromBooking('meals', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Select onValueChange={(value) => {
                  const meal = availableMeals.find(m => m.id === value);
                  if (meal) addAddonToBooking('meals', meal);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add meals" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {availableMeals.map((meal) => (
                      <SelectItem key={meal.id} value={meal.id}>
                        {meal.title} - ₹{meal.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-600">🏃 Activities</Label>
                {createFormData.selected_activities.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {createFormData.selected_activities.map((activity, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                        <span className="flex-1 text-sm">{activity.name}</span>
                        <Input
                          type="number"
                          min="1"
                          value={activity.quantity}
                          onChange={(e) => updateAddonQuantity('activities', index, parseInt(e.target.value) || 1)}
                          className="w-16 h-8"
                        />
                        <span className="text-sm">₹{(activity.price * activity.quantity).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAddonFromBooking('activities', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Select onValueChange={(value) => {
                  const activity = availableActivities.find(a => a.id === value);
                  if (activity) addAddonToBooking('activities', activity);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add activities" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {availableActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.title} - ₹{activity.price_amount || 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spa Services */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-purple-600">🧘 Spa Services</Label>
                {createFormData.selected_spa_services.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {createFormData.selected_spa_services.map((spa, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                        <span className="flex-1 text-sm">{spa.name}</span>
                        <Input
                          type="number"
                          min="1"
                          value={spa.quantity}
                          onChange={(e) => updateAddonQuantity('spa_services', index, parseInt(e.target.value) || 1)}
                          className="w-16 h-8"
                        />
                        <span className="text-sm">₹{(spa.price * spa.quantity).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeAddonFromBooking('spa_services', index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Select onValueChange={(value) => {
                  const spa = availableSpaServices.find(s => s.id === value);
                  if (spa) addAddonToBooking('spa_services', spa);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add spa services" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {availableSpaServices.map((spa) => (
                      <SelectItem key={spa.id} value={spa.id}>
                        {spa.title} - ₹{spa.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Optional Bedding - only show when guests exceed room capacity */}
              {createFormData.room_type_id && createFormData.guests_count > getFixedBedCapacity(createFormData.room_type_id) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-blue-600">🛏️ Extra Bedding</Label>
                    <Badge variant="secondary" className="text-xs">
                      {createFormData.guests_count - getFixedBedCapacity(createFormData.room_type_id)} extra bed(s) needed
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Room capacity: {getFixedBedCapacity(createFormData.room_type_id)} guests | Booking for: {createFormData.guests_count} guests
                  </div>
                  {createFormData.selected_bedding.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {createFormData.selected_bedding.map((bedding, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                          <span className="flex-1 text-sm">{bedding.name}</span>
                          <Input
                            type="number"
                            min="1"
                            value={bedding.quantity}
                            onChange={(e) => updateBeddingQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 h-8"
                          />
                          <span className="text-sm">₹{(bedding.price * bedding.quantity).toLocaleString()}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBeddingFromBooking(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Select onValueChange={(value) => {
                    const bedding = getBeddingOptions().find(b => b.id === value);
                    if (bedding) addBeddingToBooking(bedding);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add extra bedding" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {getBeddingOptions().map((bedding) => (
                        <SelectItem key={bedding.id} value={bedding.id}>
                          {bedding.name} - ₹{bedding.price} ({bedding.description})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Addon Total */}
              {calculateAddonTotal() > 0 && (
                <div className="p-3 bg-gray-100 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Add-ons Total:</span>
                    <span className="font-bold">₹{calculateAddonTotal().toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}