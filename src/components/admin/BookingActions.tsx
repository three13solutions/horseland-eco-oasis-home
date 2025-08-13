import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Bot, RefreshCw, Edit, Home, RotateCcw, MoreVertical, Eye, CreditCard, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';

interface BookingActionsProps {
  booking: any;
  roomUnits: any[];
  roomTypes: any[];
  autoAssigning: string | null;
  overrideBookingId: string | null;
  changingRoomUnit: string | null;
  changingRoomType: string | null;
  selectedRoomOverride: string;
  selectedNewRoomUnit: string;
  selectedNewRoomType: string;
  onAutoAssign: (booking: any) => void;
  onManualOverride: (bookingId: string, roomUnitId: string) => void;
  onChangeRoomUnit: (bookingId: string, newRoomUnitId: string) => void;
  onChangeRoomType: (bookingId: string, newRoomTypeId: string) => void;
  setOverrideBookingId: (id: string | null) => void;
  setChangingRoomUnit: (id: string | null) => void;
  setChangingRoomType: (id: string | null) => void;
  setSelectedRoomOverride: (id: string) => void;
  setSelectedNewRoomUnit: (id: string) => void;
  setSelectedNewRoomType: (id: string) => void;
  renderAddons: (booking: any) => React.ReactNode;
  getAvailableUnitsForBooking: (booking: any) => any[];
  onProcessPayment: (booking: any) => void;
  onUpdateBooking: (booking: any) => void;
  getPaymentStatusBadge: (booking: any) => React.ReactNode;
}

export function BookingActions({
  booking,
  roomUnits,
  roomTypes,
  autoAssigning,
  overrideBookingId,
  changingRoomUnit,
  changingRoomType,
  selectedRoomOverride,
  selectedNewRoomUnit,
  selectedNewRoomType,
  onAutoAssign,
  onManualOverride,
  onChangeRoomUnit,
  onChangeRoomType,
  setOverrideBookingId,
  setChangingRoomUnit,
  setChangingRoomType,
  setSelectedRoomOverride,
  setSelectedNewRoomUnit,
  setSelectedNewRoomType,
  renderAddons,
  getAvailableUnitsForBooking,
  onProcessPayment,
  onUpdateBooking,
  getPaymentStatusBadge,
}: BookingActionsProps) {
  const hasPaymentMethod = booking.payment_method || booking.payment_id;
  const needsPaymentButton = !hasPaymentMethod;

  return (
    <div className="flex items-center gap-2">
      {/* View Details Dialog */}
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
                <p className="text-sm text-muted-foreground">{booking.guest_email || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Phone</Label>
                <p className="text-sm text-muted-foreground">{booking.guest_phone || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Payment Status</Label>
                <div className="mt-1">{getPaymentStatusBadge(booking)}</div>
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
            {renderAddons(booking) && (
              <div>
                <Label className="text-sm font-medium">Services & Add-ons</Label>
                {renderAddons(booking)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>


      {/* Room Management Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Auto-assign (for bookings with room type but no unit) */}
          {booking.room_type_id && !booking.room_unit_id && (
            <DropdownMenuItem
              onClick={() => onAutoAssign(booking)}
              disabled={autoAssigning === booking.id}
            >
              {autoAssigning === booking.id ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bot className="h-4 w-4 mr-2" />
              )}
              Auto-assign Room
            </DropdownMenuItem>
          )}

          {/* Manual assign (for bookings with room type but no unit) */}
          {booking.room_type_id && !booking.room_unit_id && (
            <DropdownMenuItem onClick={() => setOverrideBookingId(booking.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Manual Assign
            </DropdownMenuItem>
          )}

          {/* Change unit (for bookings with assigned unit) */}
          {booking.room_unit_id && (
            <DropdownMenuItem onClick={() => setChangingRoomUnit(booking.id)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Change Unit
            </DropdownMenuItem>
          )}

          {/* Change room type */}
          <DropdownMenuItem onClick={() => setChangingRoomType(booking.id)}>
            <Home className="h-4 w-4 mr-2" />
            {booking.room_type_id ? 'Change Room Type' : 'Set Room Type'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Payment option */}
          {needsPaymentButton && (
            <DropdownMenuItem onClick={() => onProcessPayment(booking)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
            </DropdownMenuItem>
          )}
          
          {/* Update booking option */}
          <DropdownMenuItem onClick={() => onUpdateBooking(booking)}>
            <Edit3 className="h-4 w-4 mr-2" />
            Update Booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline Action Forms */}
      {overrideBookingId === booking.id && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50 min-w-72">
          <div className="flex gap-2">
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
              onClick={() => onManualOverride(booking.id, selectedRoomOverride)}
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
        </div>
      )}

      {changingRoomUnit === booking.id && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50 min-w-72">
          <div className="flex gap-2">
            <Select value={selectedNewRoomUnit} onValueChange={setSelectedNewRoomUnit}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {roomUnits
                  .filter(unit => 
                    unit.room_type_id === booking.room_type_id && 
                    unit.is_active && 
                    unit.id !== booking.room_unit_id
                  )
                  .map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number} - {unit.unit_name || 'No name'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => onChangeRoomUnit(booking.id, selectedNewRoomUnit)}
              disabled={!selectedNewRoomUnit}
            >
              Change
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setChangingRoomUnit(null);
                setSelectedNewRoomUnit('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {changingRoomType === booking.id && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white border rounded-lg shadow-lg z-50 min-w-72">
          <div className="flex gap-2">
            <Select value={selectedNewRoomType} onValueChange={setSelectedNewRoomType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => onChangeRoomType(booking.id, selectedNewRoomType)}
              disabled={!selectedNewRoomType}
            >
              {booking.room_type_id ? 'Change' : 'Set Type'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setChangingRoomType(null);
                setSelectedNewRoomType('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}