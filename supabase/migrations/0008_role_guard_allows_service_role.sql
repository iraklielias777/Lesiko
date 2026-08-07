-- protect_profile_role() blocked every role change where is_admin() was false,
-- which includes the service role and any SQL run from the dashboard or a
-- migration (auth.uid() is null there). That made bootstrapping the very first
-- admin impossible: the update ran, the trigger silently reverted it.
--
-- The guard now only applies to requests that actually carry a JWT. Anonymous
-- browser requests are not a hole here because the profiles RLS policies
-- already restrict updates to the row owner or an admin.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_role() from public, anon, authenticated;
