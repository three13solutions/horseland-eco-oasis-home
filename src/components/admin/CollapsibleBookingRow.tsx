import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableCell, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { BookingActions } from './BookingActions';
import { SimplifiedRoomCell } from './SimplifiedRoomCell';
import { PaymentModal } from './PaymentModal';
import { UpdateBookingModal } from './UpdateBookingModal';

interface CollapsibleBookingRowProps {
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
  getPaymentStatusBadge: (booking: any) => React.ReactNode;
  getBookingStatusBadge: (status: string) => React.ReactNode;
  onReloadBookings: () => void;
}

export function CollapsibleBookingRow({
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
  getPaymentStatusBadge,
  getBookingStatusBadge,
  onReloadBookings,
}: CollapsibleBookingRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const hasPaymentMethod = booking.payment_method || booking.payment_id;

  return (
    <>
      <TableRow className="group relative">
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        
        <TableCell className="font-medium">
          <div>
            <p className="font-semibold">{booking.booking_id}</p>
            <p className="text-sm text-muted-foreground">{booking.guest_name}</p>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="text-sm">
            <p>{format(parseISO(booking.check_in), 'MMM dd')}</p>
            <p className="text-muted-foreground">to {format(parseISO(booking.check_out), 'MMM dd')}</p>
          </div>
        </TableCell>
        
        <TableCell>
          <SimplifiedRoomCell booking={booking} renderAddons={renderAddons} />
        </TableCell>
        
        <TableCell>
          <div className="space-y-1">
            {hasPaymentMethod ? (
              getPaymentStatusBadge(booking)
            ) : (
              getBookingStatusBadge(booking.payment_status)
            )}
          </div>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2">
            <BookingActions
              booking={booking}
              roomUnits={roomUnits}
              roomTypes={roomTypes}
              autoAssigning={autoAssigning}
              overrideBookingId={overrideBookingId}
              changingRoomUnit={changingRoomUnit}
              changingRoomType={changingRoomType}
              selectedRoomOverride={selectedRoomOverride}
              selectedNewRoomUnit={selectedNewRoomUnit}
              selectedNewRoomType={selectedNewRoomType}
              onAutoAssign={onAutoAssign}
              onManualOverride={onManualOverride}
              onChangeRoomUnit={onChangeRoomUnit}
              onChangeRoomType={onChangeRoomType}
              setOverrideBookingId={setOverrideBookingId}
              setChangingRoomUnit={setChangingRoomUnit}
              setChangingRoomType={setChangingRoomType}
              setSelectedRoomOverride={setSelectedRoomOverride}
              setSelectedNewRoomUnit={setSelectedNewRoomUnit}
              setSelectedNewRoomType={setSelectedNewRoomType}
              renderAddons={renderAddons}
              getAvailableUnitsForBooking={getAvailableUnitsForBooking}
              onProcessPayment={() => setShowPaymentModal(true)}
              onUpdateBooking={() => setShowUpdateModal(true)}
              getPaymentStatusBadge={getPaymentStatusBadge}
            />
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Content */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <Card className="border-0 border-t border-border/50 rounded-none">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Contact Information */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Contact Details</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Email:</span> {booking.guest_email || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {booking.guest_phone || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Guests:</span> {booking.guests_count}</p>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Payment Details</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Total Amount:</span> ₹{booking.total_amount.toLocaleString()}</p>
                      <p><span className="text-muted-foreground">Status:</span> {getPaymentStatusBadge(booking)}</p>
                      {booking.payment_method && (
                        <p><span className="text-muted-foreground">Method:</span> {booking.payment_method}</p>
                      )}
                      {booking.payment_id && (
                        <p><span className="text-muted-foreground">Payment ID:</span> {booking.payment_id}</p>
                      )}
                    </div>
                  </div>

                  {/* Booking Information */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Booking Details</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Created:</span> {format(parseISO(booking.created_at), 'MMM dd, yyyy')}</p>
                      <p><span className="text-muted-foreground">Duration:</span> {Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24))} night(s)</p>
                      {booking.notes && (
                        <p><span className="text-muted-foreground">Notes:</span> {booking.notes}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                {renderAddons(booking) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">Services & Add-ons</h4>
                    {renderAddons(booking)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TableCell>
        </TableRow>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          onReloadBookings();
        }}
        booking={booking}
      />

      {/* Update Booking Modal */}
      <UpdateBookingModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        booking={booking}
        onSuccess={() => {
          setShowUpdateModal(false);
          onReloadBookings();
        }}
      />
    </>
  );
}