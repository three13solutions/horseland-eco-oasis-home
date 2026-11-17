CREATE OR REPLACE FUNCTION public.resolve_distribution_channel_id(p_channel text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT c.id FROM public.distribution_channels c
 WHERE c.id::text=lower(btrim(p_channel)) OR c.code=CASE lower(btrim(p_channel)) WHEN 'direct' THEN 'website' WHEN 'ota' THEN 'resavenue' WHEN 'phone_call' THEN 'phone_whatsapp' ELSE lower(btrim(p_channel)) END
 LIMIT 1
$function$
