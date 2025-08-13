import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, RefreshCw, Edit, Home, RotateCcw } from 'lucide-react';

interface BookingRoomCellProps {
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
}

export function BookingRoomCell({
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
}: BookingRoomCellProps) {
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
        
        {changingRoomUnit === booking.id ? (
          <div className="flex gap-2 mt-2">
            <Select value={selectedNewRoomUnit} onValueChange={setSelectedNewRoomUnit}>
              <SelectTrigger className="w-40 bg-background border z-50">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {roomUnits
                  .filter(unit => unit.room_type_id === booking.room_type_id && unit.is_active && unit.id !== booking.room_unit_id)
                  .map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="bg-background hover:bg-accent">
                      {unit.unit_number} - {unit.unit_name || 'No name'}
                    </SelectItem>
                  ))}
                {roomUnits.filter(unit => unit.room_type_id === booking.room_type_id && unit.is_active && unit.id !== booking.room_unit_id).length === 0 && (
                  <SelectItem value="" disabled className="bg-background text-muted-foreground">
                    No other units available for this room type
                  </SelectItem>
                )}
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
        ) : changingRoomType === booking.id ? (
          <div className="flex gap-2 mt-2">
            <Select value={selectedNewRoomType} onValueChange={setSelectedNewRoomType}>
              <SelectTrigger className="w-40 bg-background border z-50">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id} className="bg-background hover:bg-accent">
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
              Change
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
        ) : (
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChangingRoomUnit(booking.id)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Change Unit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChangingRoomType(booking.id)}
            >
              <Home className="h-3 w-3 mr-1" />
              Change Type
            </Button>
          </div>
        )}
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
        
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={() => onAutoAssign(booking)}
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
          {overrideBookingId === booking.id ? (
            <div className="flex gap-2">
              <Select value={selectedRoomOverride} onValueChange={setSelectedRoomOverride}>
                <SelectTrigger className="w-40 bg-background border z-50">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {getAvailableUnitsForBooking(booking).map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="bg-background hover:bg-accent">
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
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOverrideBookingId(booking.id)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Manual
            </Button>
          )}
        </div>
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
        
        <div className="mt-2">
          <div className="text-xs text-orange-600 mb-2">Please select a room type first</div>
          {changingRoomType === booking.id ? (
            <div className="flex gap-2">
              <Select value={selectedNewRoomType} onValueChange={setSelectedNewRoomType}>
                <SelectTrigger className="w-40 bg-background border z-50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {roomTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="bg-background hover:bg-accent">
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
                Set Type
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
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChangingRoomType(booking.id)}
            >
              <Home className="h-3 w-3 mr-1" />
              Select Room Type
            </Button>
          )}
        </div>
      </div>
    );
  }
}