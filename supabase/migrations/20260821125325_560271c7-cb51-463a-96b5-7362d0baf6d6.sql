-- Column-level lockdown: authenticated users may not write profiles.plan
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;
GRANT UPDATE (display_name, avatar_url, email, preferences, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Defense in depth: hard-fail any non-service_role attempt to change plan
CREATE OR REPLACE FUNCTION public.prevent_profile_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     AND auth.uid() IS NOT NULL
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Subscription plan can only be changed by the server';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_plan_change() FROM PUBLIC, anon, authenticated;