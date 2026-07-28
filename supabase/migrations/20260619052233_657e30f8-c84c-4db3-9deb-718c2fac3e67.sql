
-- has_role: super_admin implicitly satisfies admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin'::public.app_role AND role = 'super_admin'::public.app_role)
      )
  )
$$;

-- Strip the redundant admin role from the demo super admin if present
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'superadmin@demo.cpd');
