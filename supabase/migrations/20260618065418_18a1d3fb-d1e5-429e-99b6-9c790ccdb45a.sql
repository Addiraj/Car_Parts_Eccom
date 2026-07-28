
revoke execute on function public.get_user_customer_type(uuid) from anon, authenticated, public;
grant execute on function public.get_user_customer_type(uuid) to service_role;
