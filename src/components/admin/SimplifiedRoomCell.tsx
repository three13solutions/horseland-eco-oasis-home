import React from 'react';

interface SimplifiedRoomCellProps {
  booking: any;
  renderAddons: (booking: any) => React.ReactNode;
}

export function SimplifiedRoomCell({ booking, renderAddons }: SimplifiedRoomCellProps) {
  if (booking.room_unit_id) {
    // Has room unit assigned
    return (
      <div>
        <div className="font-medium">
          {booking.room_units?.unit_number}
          {booking.room_units?.unit_name && ` - ${booking.room_units.unit_name}`}
        </div>
        <div className="text-sm text-muted-foreground">
          {booking.room_units?.room_types?.name}
        </div>
        {renderAddons(booking)}
      </div>
    );
  } else if (booking.room_type_id) {
    // Has room type but no unit
    return (
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {booking.room_types?.name} (No unit assigned)
        </div>
        {renderAddons(booking)}
      </div>
    );
  } else {
    // No room type assigned
    return (
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          No room type selected
        </div>
        {renderAddons(booking)}
      </div>
    );
  }
}