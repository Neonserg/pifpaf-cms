CREATE OR REPLACE FUNCTION public.submit_form(p_form_id uuid, p_data jsonb, p_ip_hash text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  recent_count int;
begin
  if p_ip_hash is null or length(p_ip_hash) = 0 or length(p_ip_hash) > 128 then
    raise exception 'invalid_request';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid_request';
  end if;
  if not exists (select 1 from forms where id = p_form_id) then
    raise exception 'invalid_form';
  end if;

  select count(*) into recent_count
    from form_submissions
   where ip_hash = p_ip_hash
     and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then
    raise exception 'rate_limited';
  end if;

  insert into form_submissions (form_id, data, ip_hash)
  values (p_form_id, p_data, p_ip_hash);
end;
$function$
