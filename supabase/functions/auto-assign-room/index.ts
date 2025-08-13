import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { bookingId, roomTypeId, checkIn, checkOut, guestsCount } = await req.json()

    console.log('Auto-assigning room for booking:', {
      bookingId,
      roomTypeId,
      checkIn,
      checkOut,
      guestsCount
    })

    // Validate required fields
    if (!bookingId || !roomTypeId || !checkIn || !checkOut) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, roomTypeId, checkIn, checkOut' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First validate the booking using the validation service
    console.log('Validating booking before assignment...')
    
    const validateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        roomTypeId: roomTypeId,
        checkIn: checkIn,
        checkOut: checkOut,
        guestsCount: guestsCount,
        bookingId: bookingId // Exclude current booking from validation
      })
    })

    if (!validateResponse.ok) {
      const validationError = await validateResponse.json()
      console.error('Validation failed:', validationError)
      return new Response(
        JSON.stringify({ 
          error: validationError.message || 'Room validation failed',
          suggestedWaitlist: validationError.suggestedWaitlist || false
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const validationResult = await validateResponse.json()
    console.log('Validation result:', validationResult)

    if (!validationResult.isValid) {
      return new Response(
        JSON.stringify({ 
          error: validationResult.message,
          suggestedWaitlist: validationResult.suggestedWaitlist,
          conflictingBookings: validationResult.conflictingBookings
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validation passed, proceed with assignment
    if (!validationResult.availableRoomUnits || validationResult.availableRoomUnits.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No available units found despite validation passing',
          availableUnits: 0
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the first available unit from validation result
    const selectedUnitId = validationResult.availableRoomUnits[0]

    console.log('Assigning unit:', selectedUnitId, 'to booking:', bookingId)

    // Update the booking with the assigned room unit
    const { data: updateData, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        room_unit_id: selectedUnitId,
        room_type_id: roomTypeId
      })
      .eq('id', bookingId)
      .select(`
        *,
        room_units(unit_number, unit_name, room_types(name)),
        room_types(name)
      `)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to assign room unit to booking' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully assigned room unit:', updateData)

    return new Response(
      JSON.stringify({ 
        success: true,
        assignedUnit: selectedUnitId,
        availableUnits: validationResult.availableUnits,
        totalUnits: validationResult.availableRoomUnits.length,
        booking: updateData[0]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Auto-assign error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})