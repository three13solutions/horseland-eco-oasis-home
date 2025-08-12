import React, { useState, useEffect } from 'react';
import { Calendar, Eye, Search, Filter, Users, IndianRupee, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  room_units?: {
    unit_number: string;
    unit_name?: string;
    room_types?: {
      name: string;
    };
  };
  room_types?: {
    name: string;
  };
  packages?: {
    title: string;
  };
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    pendingPayments: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
    loadRoomUnits();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room_units(unit_number, unit_name, room_types(name)),
          room_types(name),
          packages(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      calculateStats(data || []);
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
                          {booking.room_unit_id ? (
                            <div>
                              <div className="font-medium">
                                {booking.room_units?.unit_number}
                                {booking.room_units?.unit_name && ` - ${booking.room_units.unit_name}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.room_units?.room_types?.name}
                              </div>
                            </div>
                          ) : booking.room_type_id ? (
                            <div className="text-sm text-muted-foreground">
                              {booking.room_types?.name} (Any unit)
                            </div>
                          ) : booking.package_id ? (
                            <div className="text-sm text-muted-foreground">
                              Package: {booking.packages?.title}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{format(parseISO(booking.check_in), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(parseISO(booking.check_out), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{booking.guests_count}</TableCell>
                        <TableCell>₹{Number(booking.total_amount).toLocaleString()}</TableCell>
                        <TableCell>{getPaymentStatusBadge(booking.payment_status)}</TableCell>
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
    </div>
  );
}