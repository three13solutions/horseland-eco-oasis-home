import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingValidationRequest {
  roomTypeId?: string
  roomUnitId?: string
  checkIn: string
  checkOut: string
  guestsCount: number
  bookingId?: string // For updates
}

interface ValidationResult {
  isValid: boolean
  message: string
  availableUnits: number
  suggestedWaitlist: boolean
  conflictingBookings?: any[]
  availableRoomUnits?: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: BookingValidationRequest = await req.json()
    const { roomTypeId, roomUnitId, checkIn, checkOut, guestsCount, bookingId } = requestData

    console.log('Validating booking request:', requestData)

    // Validate required fields
    if (!checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Check-in and check-out dates are required',
          availableUnits: 0,
          suggestedWaitlist: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate date logic
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    
    if (checkOutDate <= checkInDate) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Check-out date must be after check-in date',
          availableUnits: 0,
          suggestedWaitlist: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result: ValidationResult

    if (roomUnitId) {
      // Specific room unit validation
      result = await validateSpecificRoomUnit(supabase, roomUnitId, checkIn, checkOut, bookingId)
    } else if (roomTypeId) {
      // Room type validation (find available units)
      result = await validateRoomType(supabase, roomTypeId, checkIn, checkOut, guestsCount, bookingId)
    } else {
      // General availability check across all room types
      result = await validateGeneralAvailability(supabase, checkIn, checkOut, guestsCount, bookingId)
    }

    console.log('Validation result:', result)

    return new Response(
      JSON.stringify(result),
      { 
        status: result.isValid ? 200 : 409, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Booking validation error:', error)
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        message: 'Internal server error during validation',
        availableUnits: 0,
        suggestedWaitlist: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateSpecificRoomUnit(
  supabase: any, 
  roomUnitId: string, 
  checkIn: string, 
  checkOut: string, 
  excludeBookingId?: string
): Promise<ValidationResult> {
  
  console.log('Validating specific room unit:', roomUnitId, 'for dates:', checkIn, 'to', checkOut)

  // Check for conflicting bookings
  let conflictQuery = supabase
    .from('bookings')
    .select(`
      id, booking_id, guest_name, check_in, check_out, payment_status,
      room_units(unit_number, unit_name)
    `)
    .eq('room_unit_id', roomUnitId)
    .neq('payment_status', 'cancelled')
    .or(`and(check_in.lte.${checkOut},check_out.gt.${checkIn})`)

  // Exclude current booking if updating
  if (excludeBookingId) {
    conflictQuery = conflictQuery.neq('id', excludeBookingId)
  }

  const { data: conflictingBookings, error: conflictError } = await conflictQuery

  if (conflictError) {
    console.error('Error checking conflicts:', conflictError)
    return {
      isValid: false,
      message: 'Error checking room availability',
      availableUnits: 0,
      suggestedWaitlist: false
    }
  }

  if (conflictingBookings && conflictingBookings.length > 0) {
    console.log('Found conflicting bookings:', conflictingBookings)
    
    return {
      isValid: false,
      message: `Room is already booked for overlapping dates. ${conflictingBookings.length} conflicting booking(s) found.`,
      availableUnits: 0,
      suggestedWaitlist: true,
      conflictingBookings: conflictingBookings
    }
  }

  // Check if room unit exists and is active
  const { data: roomUnit, error: roomError } = await supabase
    .from('room_units')
    .select('id, unit_number, unit_name, status, is_active')
    .eq('id', roomUnitId)
    .eq('is_active', true)
    .single()

  if (roomError || !roomUnit) {
    return {
      isValid: false,
      message: 'Room unit not found or inactive',
      availableUnits: 0,
      suggestedWaitlist: false
    }
  }

  return {
    isValid: true,
    message: `Room ${roomUnit.unit_number} (${roomUnit.unit_name}) is available for the selected dates`,
    availableUnits: 1,
    suggestedWaitlist: false,
    availableRoomUnits: [roomUnitId]
  }
}

async function validateRoomType(
  supabase: any, 
  roomTypeId: string, 
  checkIn: string, 
  checkOut: string, 
  guestsCount: number,
  excludeBookingId?: string
): Promise<ValidationResult> {
  
  console.log('Validating room type:', roomTypeId, 'for dates:', checkIn, 'to', checkOut)

  // Use existing room availability function
  const { data: availabilityData, error: availabilityError } = await supabase
    .rpc('check_room_availability', {
      p_room_type_id: roomTypeId,
      p_check_in: checkIn,
      p_check_out: checkOut
    })

  if (availabilityError) {
    console.error('Error checking availability:', availabilityError)
    return {
      isValid: false,
      message: 'Error checking room type availability',
      availableUnits: 0,
      suggestedWaitlist: false
    }
  }

  if (!availabilityData || availabilityData.length === 0) {
    return {
      isValid: false,
      message: 'No availability data found for this room type',
      availableUnits: 0,
      suggestedWaitlist: true
    }
  }

  const availability = availabilityData[0]
  const availableUnits = availability.available_units || 0

  // If updating an existing booking, we need to check if it would exclude the current assignment
  if (excludeBookingId && availableUnits === 0) {
    const { data: currentBooking } = await supabase
      .from('bookings')
      .select('room_unit_id')
      .eq('id', excludeBookingId)
      .single()

    if (currentBooking?.room_unit_id) {
      // Check if the current room would be available if we exclude this booking
      const specificValidation = await validateSpecificRoomUnit(
        supabase, 
        currentBooking.room_unit_id, 
        checkIn, 
        checkOut, 
        excludeBookingId
      )
      
      if (specificValidation.isValid) {
        return {
          isValid: true,
          message: 'Current room assignment remains valid',
          availableUnits: 1,
          suggestedWaitlist: false,
          availableRoomUnits: [currentBooking.room_unit_id]
        }
      }
    }
  }

  if (availableUnits === 0) {
    // Check how many total units exist for waitlist suggestion
    const { data: totalUnits } = await supabase
      .from('room_units')
      .select('id')
      .eq('room_type_id', roomTypeId)
      .eq('is_active', true)

    return {
      isValid: false,
      message: `No available rooms of this type for the selected dates. All ${totalUnits?.length || 0} units are booked.`,
      availableUnits: 0,
      suggestedWaitlist: true
    }
  }

  return {
    isValid: true,
    message: `${availableUnits} room(s) available for the selected dates`,
    availableUnits: availableUnits,
    suggestedWaitlist: false,
    availableRoomUnits: availability.unit_ids
  }
}

async function validateGeneralAvailability(
  supabase: any, 
  checkIn: string, 
  checkOut: string, 
  guestsCount: number,
  excludeBookingId?: string
): Promise<ValidationResult> {
  
  console.log('Validating general availability for dates:', checkIn, 'to', checkOut, 'guests:', guestsCount)

  // Get all room types that can accommodate the guest count
  const { data: suitableRoomTypes, error: roomTypesError } = await supabase
    .from('room_types')
    .select('id, name, max_guests')
    .gte('max_guests', guestsCount)
    .eq('is_published', true)

  if (roomTypesError) {
    console.error('Error fetching room types:', roomTypesError)
    return {
      isValid: false,
      message: 'Error checking available room types',
      availableUnits: 0,
      suggestedWaitlist: false
    }
  }

  if (!suitableRoomTypes || suitableRoomTypes.length === 0) {
    return {
      isValid: false,
      message: `No room types can accommodate ${guestsCount} guests`,
      availableUnits: 0,
      suggestedWaitlist: false
    }
  }

  let totalAvailableUnits = 0
  const availableRoomUnits: string[] = []

  // Check availability for each suitable room type
  for (const roomType of suitableRoomTypes) {
    const typeValidation = await validateRoomType(
      supabase, 
      roomType.id, 
      checkIn, 
      checkOut, 
      guestsCount, 
      excludeBookingId
    )

    if (typeValidation.isValid) {
      totalAvailableUnits += typeValidation.availableUnits
      if (typeValidation.availableRoomUnits) {
        availableRoomUnits.push(...typeValidation.availableRoomUnits)
      }
    }
  }

  if (totalAvailableUnits === 0) {
    return {
      isValid: false,
      message: `No rooms available for ${guestsCount} guests on the selected dates across all room types`,
      availableUnits: 0,
      suggestedWaitlist: true
    }
  }

  return {
    isValid: true,
    message: `${totalAvailableUnits} room(s) available across ${suitableRoomTypes.length} room type(s)`,
    availableUnits: totalAvailableUnits,
    suggestedWaitlist: false,
    availableRoomUnits: availableRoomUnits
  }
}