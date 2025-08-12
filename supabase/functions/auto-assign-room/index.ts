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

    // Check room availability using the existing database function
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('check_room_availability', {
        p_room_type_id: roomTypeId,
        p_check_in: checkIn,
        p_check_out: checkOut
      })

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError)
      return new Response(
        JSON.stringify({ error: 'Failed to check room availability' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Availability check result:', availabilityData)

    // Check if any units are available
    if (!availabilityData || availabilityData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No availability data returned' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const availability = availabilityData[0]
    
    if (!availability.available_units || availability.available_units === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No available units found for the selected dates',
          availableUnits: 0
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the first available unit
    const selectedUnitId = availability.unit_ids[0]

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
        availableUnits: availability.available_units,
        totalUnits: availability.unit_ids.length,
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