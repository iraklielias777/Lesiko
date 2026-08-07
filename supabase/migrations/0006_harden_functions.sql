-- Advisory follow-ups from get_advisors(security).
--
-- Postgres grants EXECUTE to PUBLIC on every new function, which makes each one
-- reachable as a PostgREST RPC endpoint. The trigger functions are never meant
-- to be called directly (a trigger fires them regardless of the caller's
-- EXECUTE privilege, which is only checked when the trigger is created), so the
-- grant is dropped outright.
--
-- public.is_admin() is the exception: RLS policy expressions are evaluated with
-- the caller's privileges, so anon and authenticated must keep EXECUTE or every
-- admin policy errors out. It leaks nothing beyond "am I an admin".

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.protect_profile_role()     from public, anon, authenticated;
revoke execute on function public.set_updated_at()           from public, anon, authenticated;

revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to anon, authenticated;
