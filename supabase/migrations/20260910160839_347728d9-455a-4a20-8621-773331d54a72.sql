UPDATE public.activities
SET rules_regulations = 'Pool Timings: 9:00 AM to 6:00 PM.
• Please follow all instructions displayed at the poolside.
• Cooperate with the lifeguard/staff on duty.
• Guests are requested to shower before entering the swimming pool for water hygiene.
• Nylon swimwear is compulsory while using the swimming pool. Cotton clothing, denim, or any other non-swimwear attire is not allowed in the pool.
• Food and drinks are not allowed inside the pool area.
• Glassware, and any breakable items are not allowed inside the pool area.
• Children must be accompanied and supervised by a responsible adult guardian at all times while in or around the pool area.
• Running, diving, or rough play around the pool is not permitted for safety reasons.
• The management reserves the right to restrict pool access in case of non-compliance with the above guidelines.',
updated_at = now()
WHERE id = 'a5f213d7-371f-4612-b4b0-c51f14aa2d46';

UPDATE public.faq_items
SET answer = 'Pool timings are 9:00 AM to 6:00 PM. Please follow all instructions displayed at the poolside and cooperate with the lifeguard/staff on duty. Guests are requested to shower before entering the swimming pool for water hygiene. Nylon swimwear is compulsory; cotton clothing, denim, or any other non-swimwear attire is not allowed. Food, drinks, glassware, and breakable items are not allowed inside the pool area. Children must be accompanied and supervised by a responsible adult guardian at all times. Running, diving, or rough play around the pool is not permitted. The management reserves the right to restrict pool access in case of non-compliance.',
updated_at = now()
WHERE question ILIKE '%swimming pool timings%';