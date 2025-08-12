import React, { useState, useMemo } from 'react';
import { format, addDays, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarDays, User, CreditCard, MapPin, Phone, Mail } from 'lucide-react';

interface RoomUnit {
  id: string;
  unit_number: string;
  unit_name?: string;
  status: string;
  room_types?: {
    name: string;
  };
}

interface Booking {
  id: string;
  booking_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  payment_status: string;
  notes?: string;
  room_unit_id?: string;
}

interface RoomAvailabilityGridProps {
  roomUnits: RoomUnit[];
  bookings: Booking[];
}

type TimeframeOption = 'today' | 'tomorrow' | 'week' | 'nextweek' | '14days';

export const RoomAvailabilityGrid: React.FC<RoomAvailabilityGridProps> = ({
  roomUnits,
  bookings
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('14days');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Generate date range based on timeframe
  const dateRange = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (7 - today.getDay() + 1) % 7);
    
    switch (selectedTimeframe) {
      case 'today':
        return [today];
      case 'tomorrow':
        return [tomorrow];
      case 'week':
        return Array.from({ length: 7 }, (_, i) => addDays(today, i));
      case 'nextweek':
        return Array.from({ length: 7 }, (_, i) => addDays(nextMonday, i));
      case '14days':
      default:
        return Array.from({ length: 14 }, (_, i) => addDays(today, i));
    }
  }, [selectedTimeframe]);

  // Group rooms by type
  const groupedRooms = useMemo(() => {
    const groups: { [key: string]: RoomUnit[] } = {};
    
    roomUnits.forEach(room => {
      const roomType = room.room_types?.name || 'Other';
      if (!groups[roomType]) {
        groups[roomType] = [];
      }
      groups[roomType].push(room);
    });

    // Sort groups and rooms within groups
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => a.unit_number.localeCompare(b.unit_number));
    });

    return groups;
  }, [roomUnits]);

  // Get booking status for a specific room and date
  const getRoomStatus = (roomId: string, date: Date) => {
    const roomUnit = roomUnits.find(r => r.id === roomId);
    
    // Check if room is in maintenance
    if (roomUnit?.status === 'maintenance') {
      return { status: 'maintenance', booking: null };
    }

    // Check for booking on this date
    const booking = bookings.find(b => {
      if (b.room_unit_id !== roomId) return false;
      
      const checkIn = startOfDay(parseISO(b.check_in));
      const checkOut = endOfDay(parseISO(b.check_out));
      const targetDate = startOfDay(date);
      
      return isWithinInterval(targetDate, { start: checkIn, end: checkOut });
    });

    if (booking) {
      return { status: 'booked', booking };
    }

    return { status: 'available', booking: null };
  };

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-red-500 hover:bg-red-600';
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'maintenance':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-300';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const timeframeOptions = [
    { value: 'today' as TimeframeOption, label: 'Focus on Today' },
    { value: 'tomorrow' as TimeframeOption, label: 'Focus on Tomorrow' },
    { value: 'week' as TimeframeOption, label: 'This Week' },
    { value: 'nextweek' as TimeframeOption, label: 'Next Week' },
    { value: '14days' as TimeframeOption, label: '14 Days' },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Timeframe Toggle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Room Availability Calendar</CardTitle>
            <CardDescription>
              Click on any booking block for details, or hover for quick info
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {timeframeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedTimeframe === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTimeframe(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Maintenance</span>
              </div>
            </div>

            {/* Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header with dates */}
              <div className="bg-gray-50 border-b">
                <div className="grid" style={{ gridTemplateColumns: `200px repeat(${dateRange.length}, 1fr)` }}>
                  <div className="p-3 font-medium border-r">Room</div>
                  {dateRange.map((date) => (
                    <div key={date.toISOString()} className="p-2 text-center border-r text-sm font-medium">
                      <div>{format(date, 'EEE')}</div>
                      <div className="text-xs text-muted-foreground">{format(date, 'MMM d')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room rows grouped by type */}
              <div className="max-h-96 overflow-y-auto">
                {Object.entries(groupedRooms).map(([roomType, rooms]) => (
                  <div key={roomType}>
                    {/* Room type header */}
                    <div className="bg-blue-50 border-b">
                      <div className="grid" style={{ gridTemplateColumns: `200px repeat(${dateRange.length}, 1fr)` }}>
                        <div className="p-2 font-medium text-blue-700 border-r">
                          {roomType} ({rooms.length} rooms)
                        </div>
                        <div className="col-span-full"></div>
                      </div>
                    </div>

                    {/* Individual rooms */}
                    {rooms.map((room) => (
                      <div key={room.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <div className="grid" style={{ gridTemplateColumns: `200px repeat(${dateRange.length}, 1fr)` }}>
                          <div className="p-3 border-r">
                            <div className="font-medium">{room.unit_number}</div>
                            {room.unit_name && (
                              <div className="text-xs text-muted-foreground">{room.unit_name}</div>
                            )}
                          </div>
                          {dateRange.map((date) => {
                            const { status, booking } = getRoomStatus(room.id, date);
                            return (
                              <div key={date.toISOString()} className="border-r">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={`w-full h-12 ${getStatusColor(status)} text-white text-xs transition-colors`}
                                      onClick={() => booking && setSelectedBooking(booking)}
                                    >
                                      {booking && (
                                        <div className="truncate px-1">
                                          {booking.guest_name.split(' ')[0]}
                                        </div>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-64">
                                    <div className="space-y-1">
                                      <div className="font-medium">
                                        {room.unit_number} - {format(date, 'MMM d, yyyy')}
                                      </div>
                                      {booking ? (
                                        <>
                                          <div>Guest: {booking.guest_name}</div>
                                          <div>Booking: {booking.booking_id}</div>
                                          <div>Check-in: {format(parseISO(booking.check_in), 'MMM d')}</div>
                                          <div>Check-out: {format(parseISO(booking.check_out), 'MMM d')}</div>
                                          <div className={getPaymentStatusColor(booking.payment_status)}>
                                            Payment: {booking.payment_status}
                                          </div>
                                          {booking.notes && <div>Notes: {booking.notes}</div>}
                                        </>
                                      ) : status === 'maintenance' ? (
                                        <div>Room under maintenance</div>
                                      ) : (
                                        <div>Available for booking</div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details Dialog */}
        {selectedBooking && (
          <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Booking Details - {selectedBooking.booking_id}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Guest Name</Label>
                        <p className="text-sm text-muted-foreground">{selectedBooking.guest_name}</p>
                      </div>
                    </div>
                    {selectedBooking.guest_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm text-muted-foreground">{selectedBooking.guest_email}</p>
                        </div>
                      </div>
                    )}
                    {selectedBooking.guest_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <p className="text-sm text-muted-foreground">{selectedBooking.guest_phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Check-in</Label>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedBooking.check_in), 'EEEE, MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Check-out</Label>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(selectedBooking.check_out), 'EEEE, MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-sm font-medium">Payment Status</Label>
                        <Badge variant={selectedBooking.payment_status === 'confirmed' ? 'default' : 'secondary'}>
                          {selectedBooking.payment_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedBooking.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedBooking.notes}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    Edit Booking
                  </Button>
                  <Button variant="outline" size="sm">
                    Reassign Room
                  </Button>
                  <Button variant="destructive" size="sm">
                    Cancel Booking
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
};