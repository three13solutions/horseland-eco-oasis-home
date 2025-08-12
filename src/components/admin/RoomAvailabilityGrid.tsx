import React, { useState, useMemo } from 'react';
import { format, addDays, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, User, CreditCard, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ManualBookingModal } from './ManualBookingModal';

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
  onBookingUpdate?: () => void; // Callback to refresh bookings after update
}

type TimeframeOption = 'week' | 'nextweek' | '14days' | '30days';

export const RoomAvailabilityGrid: React.FC<RoomAvailabilityGridProps> = ({
  roomUnits,
  bookings,
  onBookingUpdate
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('14days');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [timelinePosition, setTimelinePosition] = useState<number>(0); // Days offset from today
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<{
    roomUnitId: string;
    roomName: string;
    selectedDate: Date;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{roomId: string, date: Date} | null>(null);
  const [dragEnd, setDragEnd] = useState<{roomId: string, date: Date} | null>(null);
  const { toast } = useToast();

  // Generate date range based on timeframe and timeline position
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = addDays(today, timelinePosition);
    const nextMonday = new Date(startDate);
    nextMonday.setDate(startDate.getDate() + (7 - startDate.getDay() + 1) % 7);
    
    switch (selectedTimeframe) {
      case 'week':
        return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
      case 'nextweek':
        return Array.from({ length: 7 }, (_, i) => addDays(nextMonday, i));
      case '30days':
        return Array.from({ length: 30 }, (_, i) => addDays(startDate, i));
      case '14days':
      default:
        return Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
    }
  }, [selectedTimeframe, timelinePosition]);

  // Timeline range based on timeframe
  const timelineRange = useMemo(() => {
    switch (selectedTimeframe) {
      case 'week':
      case '14days':
        return { min: -90, max: 90 }; // 3 months before/after
      case '30days':
        return { min: -180, max: 180 }; // 6 months before/after
      default:
        return { min: -90, max: 90 };
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

    // Check for booking on this date - now including all payment statuses
    const booking = bookings.find(b => {
      if (b.room_unit_id !== roomId) return false;
      
      const checkIn = startOfDay(parseISO(b.check_in));
      const checkOut = startOfDay(parseISO(b.check_out)); // Check-out day is available
      const targetDate = startOfDay(date);
      
      // Room is occupied from check-in date until (but not including) check-out date
      return targetDate >= checkIn && targetDate < checkOut;
    });

    if (booking) {
      // Return different statuses based on payment status
      if (booking.payment_status === 'cancelled') {
        return { status: 'cancelled', booking };
      } else if (booking.payment_status === 'pending') {
        return { status: 'pending', booking };
      } else if (booking.payment_status === 'confirmed') {
        return { status: 'confirmed', booking };
      } else {
        return { status: 'booked', booking }; // fallback
      }
    }

    return { status: 'available', booking: null };
  };

  // Get color for status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'pending':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'cancelled':
        return 'bg-gray-400 hover:bg-gray-500 text-white line-through';
      case 'available':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'maintenance':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      default:
        return 'bg-gray-300 text-white';
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

  const updatePaymentStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingPayment(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Payment Status Updated",
        description: `Payment status updated to ${newStatus}`,
      });

      // Close dialog and refresh data
      setSelectedBooking(null);
      if (onBookingUpdate) {
        onBookingUpdate();
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleMouseDown = (roomId: string, date: Date, status: string) => {
    if (status === 'available') {
      setIsDragging(true);
      setDragStart({ roomId, date });
      setDragEnd({ roomId, date });
    }
  };

  const handleMouseEnter = (roomId: string, date: Date, status: string) => {
    if (isDragging && dragStart && status === 'available' && roomId === dragStart.roomId) {
      setDragEnd({ roomId, date });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragEnd) {
      const startDate = dragStart.date < dragEnd.date ? dragStart.date : dragEnd.date;
      const endDate = dragStart.date < dragEnd.date ? dragEnd.date : dragStart.date;
      
      setSelectedRoomForBooking({
        roomUnitId: dragStart.roomId,
        roomName: `${roomUnits.find(r => r.id === dragStart.roomId)?.unit_number}${roomUnits.find(r => r.id === dragStart.roomId)?.unit_name ? ` (${roomUnits.find(r => r.id === dragStart.roomId)?.unit_name})` : ''}`,
        selectedDate: startDate
      });
      setIsManualBookingOpen(true);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragRange = (roomId: string, date: Date) => {
    if (!isDragging || !dragStart || !dragEnd || roomId !== dragStart.roomId) return false;
    const startDate = dragStart.date < dragEnd.date ? dragStart.date : dragEnd.date;
    const endDate = dragStart.date < dragEnd.date ? dragEnd.date : dragStart.date;
    return date >= startDate && date <= endDate;
  };

  const timeframeOptions = [
    { value: 'week' as TimeframeOption, label: 'This Week' },
    { value: 'nextweek' as TimeframeOption, label: 'Next Week' },
    { value: '14days' as TimeframeOption, label: '14 Days' },
    { value: '30days' as TimeframeOption, label: '30 Days' },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Timeframe Toggle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Room Availability Calendar</CardTitle>
            <CardDescription>
              Click on any booking block for details, or click and drag on green (available) slots to select date range for manual booking
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

            {/* Timeline Slider */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Navigate Timeline</Label>
                <div className="text-xs text-muted-foreground">
                  {timelinePosition === 0 ? 'Today' : 
                   timelinePosition > 0 ? `${timelinePosition} days ahead` : 
                   `${Math.abs(timelinePosition)} days ago`}
                  {bookings.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      • {bookings.filter(b => b.room_unit_id && b.payment_status !== 'cancelled').length} active bookings
                    </span>
                  )}
                </div>
              </div>
              <div className="px-3">
                <Slider
                  value={[timelinePosition]}
                  onValueChange={(value) => setTimelinePosition(value[0])}
                  min={timelineRange.min}
                  max={timelineRange.max}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{timelineRange.min} days ago</span>
                <span>Today</span>
                <span>{timelineRange.max} days ahead</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Available (Click & drag to select range)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Confirmed Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Pending Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span>Cancelled</span>
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
                                        className={`w-full h-12 ${getStatusColor(status)} text-xs transition-colors relative select-none ${
                                          isInDragRange(room.id, date) ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                        onMouseDown={() => handleMouseDown(room.id, date, status)}
                                        onMouseEnter={() => handleMouseEnter(room.id, date, status)}
                                        onMouseUp={handleMouseUp}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (!isDragging && booking) {
                                            setSelectedBooking(booking);
                                          }
                                        }}
                                      >
                                       {booking && (
                                         <div className={`truncate px-1 ${status === 'cancelled' ? 'line-through' : ''}`}>
                                           {booking.guest_name.split(' ')[0]}
                                           {status === 'pending' && <span className="text-xs block">⏳</span>}
                                           {status === 'cancelled' && <span className="text-xs block">❌</span>}
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
                                        <div>Available for booking - Click and drag to select date range</div>
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
            <DialogContent className="max-w-2xl" aria-describedby="booking-dialog-description">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Booking Details - {selectedBooking.booking_id}
                </DialogTitle>
              </DialogHeader>
              <div id="booking-dialog-description" className="sr-only">
                Booking details and payment status management for {selectedBooking.booking_id}
              </div>
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
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Payment Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={selectedBooking.payment_status === 'confirmed' ? 'default' : 'secondary'}>
                            {selectedBooking.payment_status}
                          </Badge>
                          <Select 
                            defaultValue={selectedBooking.payment_status} 
                            onValueChange={(value) => updatePaymentStatus(selectedBooking.id, value)}
                            disabled={updatingPayment}
                          >
                            <SelectTrigger className="w-32 h-8">
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedBooking(null)}
                  >
                    Close
                  </Button>
                  {selectedBooking.payment_status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => updatePaymentStatus(selectedBooking.id, 'confirmed')}
                      disabled={updatingPayment}
                    >
                      {updatingPayment ? 'Updating...' : 'Mark as Paid'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Manual Booking Modal */}
        {selectedRoomForBooking && (
          <ManualBookingModal
            isOpen={isManualBookingOpen}
            onClose={() => {
              setIsManualBookingOpen(false);
              setSelectedRoomForBooking(null);
            }}
            roomUnitId={selectedRoomForBooking.roomUnitId}
            roomName={selectedRoomForBooking.roomName}
            preSelectedDates={
              dragStart && dragEnd && selectedRoomForBooking ? {
                checkIn: dragStart.date < dragEnd.date ? dragStart.date : dragEnd.date,
                checkOut: addDays(dragStart.date < dragEnd.date ? dragEnd.date : dragStart.date, 1)
              } : selectedRoomForBooking ? {
                checkIn: selectedRoomForBooking.selectedDate,
                checkOut: addDays(selectedRoomForBooking.selectedDate, 1)
              } : undefined
            }
            onBookingCreated={() => {
              if (onBookingUpdate) {
                onBookingUpdate();
              }
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
};