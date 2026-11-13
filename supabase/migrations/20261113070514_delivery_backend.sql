create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 100),
 is_rider boolean not null default false
);
create table public.deliveries (
 id uuid primary key default gen_random_uuid(), reference text not null unique default ('PC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
 sender_id uuid not null references public.profiles(id), recipient_id uuid not null references public.profiles(id), rider_id uuid references public.profiles(id),
 description text not null check(length(description) between 1 and 500), size text not null check(size in ('small','medium','large')),
 pickup jsonb not null, dropoff jsonb not null, entrance jsonb not null default '{"instructions":""}',
 window_start timestamptz not null, window_end timestamptz not null, window_version integer not null default 1,
 status text not null default 'booked' check(status in ('booked','accepted','picked_up','out_for_delivery','delivered','cancelled')),
 availability text not null default 'pending' check(availability in ('pending','available','unavailable','alternative_confirmed')),
 availability_version integer not null default 1, responded_at timestamptz,
 receiver_id uuid references public.profiles(id), receiver_status text check(receiver_status in ('pending','accepted','declined','revoked')),
 receiver_auth_id uuid, receiver_version integer, receiver_expires_at timestamptz,
 reschedule jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), delivered_at timestamptz,
 check(window_end > window_start), check(sender_id <> recipient_id)
);
create index deliveries_sender_idx on public.deliveries(sender_id,created_at desc);
create index deliveries_recipient_idx on public.deliveries(recipient_id,created_at desc);
create index deliveries_rider_idx on public.deliveries(rider_id,created_at desc);
create index deliveries_receiver_idx on public.deliveries(receiver_id) where receiver_id is not null;
create table public.receiver_authorizations (
 id uuid primary key, delivery_id uuid not null references public.deliveries(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id), status text not null,
 window_version integer not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index receiver_authorizations_delivery_idx on public.receiver_authorizations(delivery_id);
create table public.delivery_events (
 id uuid primary key default gen_random_uuid(), delivery_id uuid not null references public.deliveries(id) on delete cascade,
 actor_id uuid not null references public.profiles(id), type text not null, message text not null, created_at timestamptz not null default now()
);
create index delivery_events_delivery_idx on public.delivery_events(delivery_id,created_at,id);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 delivery_id uuid not null references public.deliveries(id) on delete cascade,
 title text not null, body text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create index notifications_user_idx on public.notifications(user_id,created_at desc);
create table public.device_push_tokens (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 device_id text not null check(length(device_id) between 1 and 200), token text not null unique check(length(token) between 20 and 300),
 updated_at timestamptz not null default now(), unique(user_id,device_id)
);
create table private.handoff_challenges (
 delivery_id uuid primary key references public.deliveries(id) on delete cascade,
 code_digest text not null, authorized_user_id uuid not null, window_version integer not null,
 expires_at timestamptz not null, attempts integer not null default 0, consumed_at timestamptz, revoked_at timestamptz
);
create table private.challenge_issues (
 id bigint generated always as identity primary key, delivery_id uuid not null references public.deliveries(id) on delete cascade,
 actor_id uuid not null, issued_at timestamptz not null default now()
);
create index challenge_issues_rate_idx on private.challenge_issues(delivery_id,issued_at desc);
create table private.command_receipts (
 actor_id uuid not null, idempotency_key text not null, delivery_id uuid not null references public.deliveries(id),
 result jsonb not null, primary key(actor_id,idempotency_key)
);
create table private.notification_outbox (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id) on delete cascade,
 token_id uuid not null references public.device_push_tokens(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','leased','receipt','complete','failed')),
 attempts integer not null default 0, available_at timestamptz not null default now(), lease_id uuid, lease_until timestamptz,
 receipt_id text, created_at timestamptz not null default now(), unique(notification_id,token_id)
);
create index outbox_pending_idx on private.notification_outbox(available_at) where status in ('pending','receipt','leased');

alter table public.profiles enable row level security;
alter table public.deliveries enable row level security;
alter table public.receiver_authorizations enable row level security;
alter table public.delivery_events enable row level security;
alter table public.notifications enable row level security;
alter table public.device_push_tokens enable row level security;
alter table private.handoff_challenges enable row level security;
alter table private.challenge_issues enable row level security;
alter table private.command_receipts enable row level security;
alter table private.notification_outbox enable row level security;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles,public.deliveries,public.receiver_authorizations,public.delivery_events,public.notifications,public.device_push_tokens to authenticated;
grant all on public.profiles,public.deliveries,public.receiver_authorizations,public.delivery_events,public.notifications,public.device_push_tokens to service_role;
grant all on private.handoff_challenges,private.challenge_issues,private.command_receipts,private.notification_outbox to service_role;
grant usage, select on all sequences in schema private to service_role;
create policy profiles_directory on public.profiles for select to authenticated using (true);
create policy delivery_participants on public.deliveries for select to authenticated using (
 (select auth.uid()) in (sender_id,recipient_id,rider_id)
);
create policy receiver_invitation on public.receiver_authorizations for select to authenticated using (
 receiver_id=(select auth.uid()) or exists(select 1 from public.deliveries d where d.id=delivery_id)
);
create policy event_participants on public.delivery_events for select to authenticated using (
 exists(select 1 from public.deliveries d where d.id=delivery_id)
);
create policy notification_owner on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy token_owner on public.device_push_tokens for select to authenticated using(user_id=(select auth.uid()));

create function private.on_auth_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'ParcelConnect user'),100));
 return new;
end $$;
revoke all on function private.on_auth_user_created() from public,anon,authenticated;
create trigger parcelconnect_profile after insert on auth.users for each row execute function private.on_auth_user_created();

create function private.can_access(d public.deliveries,a uuid) returns boolean language sql stable set search_path='' as $$
 select a in (d.sender_id,d.recipient_id,d.rider_id) or
 (a=d.receiver_id and d.receiver_status='accepted' and d.receiver_version=d.window_version and d.receiver_expires_at>now())
$$;
create function private.fail(code text,message text) returns void language plpgsql set search_path='' as $$
begin raise exception '%|%',code,message using errcode='P0001'; end $$;
create function private.delivery_json(d public.deliveries) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object(
 'id',d.id,'reference',d.reference,'senderId',d.sender_id,'recipientId',d.recipient_id,'riderId',d.rider_id,
 'description',d.description,'size',d.size,'pickup',d.pickup,'dropoff',d.dropoff,'entrance',d.entrance,
 'window',jsonb_build_object('start',d.window_start,'end',d.window_end,'version',d.window_version),'status',d.status,
 'availability',jsonb_build_object('status',d.availability,'windowVersion',d.availability_version,'respondedAt',d.responded_at),
 'receiver',case when d.receiver_auth_id is null then null else jsonb_build_object('id',d.receiver_auth_id,'receiverId',d.receiver_id,'status',d.receiver_status,'windowVersion',d.receiver_version,'expiresAt',d.receiver_expires_at) end,
 'reschedule',d.reschedule,'createdAt',d.created_at,'updatedAt',d.updated_at,'deliveredAt',d.delivered_at,
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'deliveryId',e.delivery_id,'actorId',e.actor_id,'type',e.type,'message',e.message,'createdAt',e.created_at) order by e.created_at,e.id) from public.delivery_events e where e.delivery_id=d.id),'[]'::jsonb))
$$;

create function private.delivery_for_actor(d public.deliveries,a uuid) returns jsonb language sql stable set search_path='' as $$
 select case when coalesce(private.can_access(d,a),false) and not (a is not distinct from d.receiver_id and a not in(d.sender_id,d.recipient_id,coalesce(d.rider_id,d.sender_id))) then private.delivery_json(d)
 when a=d.receiver_id and d.receiver_status='accepted' and d.receiver_version=d.window_version and d.receiver_expires_at>now() then private.delivery_json(d) || jsonb_build_object('pickup',jsonb_build_object('label','Pickup','address',''))
 else private.delivery_json(d) || jsonb_build_object('pickup',jsonb_build_object('label','Pickup','address',''),'dropoff',jsonb_build_object('label','Drop-off','address',''),'entrance',jsonb_build_object('instructions',''),'events','[]'::jsonb) end
$$;

create function private.notify(p_user uuid,p_delivery uuid,p_title text) returns void language plpgsql set search_path='' as $$
declare notice uuid;
begin
 insert into public.notifications(user_id,delivery_id,title,body) values(p_user,p_delivery,p_title,'Open ParcelConnect to view the delivery update.') returning id into notice;
 insert into private.notification_outbox(notification_id,token_id) select notice,id from public.device_push_tokens where user_id=p_user on conflict do nothing;
end $$;
create function private.emit(p_delivery uuid,p_actor uuid,p_type text,p_message text) returns void language plpgsql set search_path='' as $$
declare d public.deliveries; recipient uuid; notice uuid;
begin
 select * into strict d from public.deliveries where id=p_delivery;
 insert into public.delivery_events(delivery_id,actor_id,type,message) values(p_delivery,p_actor,p_type,p_message);
 for recipient in select distinct u from unnest(array[d.sender_id,d.recipient_id,d.rider_id,
 case when d.receiver_status in ('pending','accepted') and d.receiver_expires_at>now() then d.receiver_id end]) u where u is not null loop
   insert into public.notifications(user_id,delivery_id,title,body) values(recipient,p_delivery,p_message,'Open ParcelConnect to view the delivery update.') returning id into notice;
   insert into private.notification_outbox(notification_id,token_id)
     select notice,t.id from public.device_push_tokens t where t.user_id=recipient on conflict do nothing;
 end loop;
end $$;
create function private.invalidate_code(p_delivery uuid) returns void language sql set search_path='' as $$
 update private.handoff_challenges set revoked_at=now() where delivery_id=p_delivery and consumed_at is null
$$;

create function public.delivery_api(p_actor uuid,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.deliveries; cmd text; did uuid; target uuid; input jsonb; result jsonb; receipt jsonb;
 ch private.handoff_challenges; previous_receiver uuid; notice uuid; acks jsonb; new_start timestamptz; new_end timestamptz; key text;
begin
 if p_actor is null or not exists(select 1 from public.profiles where id=p_actor) then perform private.fail('forbidden','Authentication required.'); end if;
 if p_action='execute' and p_payload->>'type'='book' and nullif(p_payload->>'idempotencyKey','') is not null then
   key=p_payload->>'idempotencyKey';
   if length(key)>200 then perform private.fail('invalid_input','Invalid idempotency key.'); end if;
   perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||key,0));
   select r.result into receipt from private.command_receipts r where r.actor_id=p_actor and r.idempotency_key=key;
   if found then return jsonb_build_object('data',receipt); end if;
 end if;
 if p_action='list_people' then
   select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'displayName',p.display_name,'roles',case when p.is_rider then '["sender","recipient","receiver","rider"]'::jsonb else '["sender","recipient","receiver"]'::jsonb end) order by p.display_name),'[]'::jsonb) into result from public.profiles p;
 elsif p_action='list_deliveries' then
   select coalesce(jsonb_agg(private.delivery_for_actor(x,p_actor) order by x.created_at desc),'[]'::jsonb) into result from public.deliveries x where private.can_access(x,p_actor) or x.receiver_id=p_actor and x.receiver_status='pending' and x.receiver_expires_at>now() and x.receiver_version=x.window_version;
 elsif p_action='list_available_jobs' then
   if not exists(select 1 from public.profiles where id=p_actor and is_rider) then perform private.fail('forbidden','Rider access required.'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'reference',x.reference,'description',x.description,'size',x.size,'window',jsonb_build_object('start',x.window_start,'end',x.window_end,'version',x.window_version),'status',x.status)),'[]'::jsonb) into result from public.deliveries x where x.status='booked' and x.rider_id is null and p_actor not in(x.sender_id,x.recipient_id);
 elsif p_action='list_notifications' then
   select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'userId',n.user_id,'deliveryId',n.delivery_id,'title',n.title,'body',n.body,'createdAt',n.created_at,'readAt',n.read_at) order by n.created_at desc),'[]'::jsonb) into result from public.notifications n where n.user_id=p_actor;
 elsif p_action='mark_notification_read' then
   update public.notifications set read_at=coalesce(read_at,now()) where id=(p_payload->>'notificationId')::uuid and user_id=p_actor;
   if not found then perform private.fail('not_found','Notification unavailable.'); end if; result='null'::jsonb;
 elsif p_action='register_push_token' then
   if coalesce(p_payload->>'token','')!~'^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$' or length(coalesce(p_payload->>'deviceId','')) not between 1 and 200 then perform private.fail('invalid_input','Valid device and Expo token required.'); end if;
   -- Serialize token transfer so logout/login cannot retain the former owner.
   perform pg_advisory_xact_lock(hashtextextended(p_payload->>'token',0));
   delete from public.device_push_tokens where token=p_payload->>'token' or (user_id=p_actor and device_id=p_payload->>'deviceId');
   insert into public.device_push_tokens(user_id,device_id,token) values(p_actor,p_payload->>'deviceId',p_payload->>'token'); result='null'::jsonb;
 elsif p_action='unregister_push_token' then
   delete from public.device_push_tokens where user_id=p_actor and device_id=p_payload->>'deviceId'; result='null'::jsonb;
 elsif p_action='execute' and p_payload->>'type'='book' then
   input=p_payload->'input'; target=(input->>'recipientId')::uuid;
   if target=p_actor or not exists(select 1 from public.profiles where id=target) then perform private.fail('invalid_input','Choose another recipient.'); end if;
   if jsonb_typeof(input->'pickup')<>'object' or jsonb_typeof(input->'dropoff')<>'object' or length(trim(coalesce(input#>>'{pickup,address}','')))=0 or length(trim(coalesce(input#>>'{dropoff,address}','')))=0 or length(trim(coalesce(input->>'description','')))=0 then perform private.fail('invalid_input','Parcel and address details are required.'); end if;
   new_start=(input#>>'{window,start}')::timestamptz; new_end=(input#>>'{window,end}')::timestamptz;
   if new_start is null or new_end is null or new_end<=new_start or new_end<=now() then perform private.fail('invalid_input','Choose a valid delivery window.'); end if;
   insert into public.deliveries(sender_id,recipient_id,description,size,pickup,dropoff,window_start,window_end,entrance)
   values(p_actor,target,trim(input->>'description'),input->>'size',input->'pickup',input->'dropoff',new_start,new_end,coalesce(input->'entrance','{"instructions":""}')) returning * into d;
   perform private.emit(d.id,p_actor,'booked','Delivery booked'); select private.delivery_json(x) into result from public.deliveries x where id=d.id;
   if key is not null then insert into private.command_receipts(actor_id,idempotency_key,delivery_id,result) values(p_actor,key,d.id,result); end if;
 elsif p_action in('get_delivery','execute','issue_handoff_code') then
   did=coalesce(p_payload->>'deliveryId',p_payload->>'id')::uuid;
   select * into d from public.deliveries where id=did for update;
   if not found then perform private.fail('not_found','Delivery unavailable.'); end if;
   cmd=p_payload->>'type'; previous_receiver=d.receiver_id;
   if p_action='get_delivery' then
     if not (coalesce(private.can_access(d,p_actor),false) or coalesce(p_actor=d.receiver_id and d.receiver_status='pending' and d.receiver_expires_at>now() and d.receiver_version=d.window_version,false)) then perform private.fail('not_found','Delivery unavailable.'); end if; result=private.delivery_for_actor(d,p_actor);
   elsif p_action='issue_handoff_code' then
     if p_actor=d.rider_id or d.window_end<=now() or d.status<>'out_for_delivery' or not (d.availability_version=d.window_version and (d.availability='available' and p_actor=d.recipient_id or d.availability='alternative_confirmed' and p_actor=d.receiver_id and d.receiver_status='accepted' and d.receiver_version=d.window_version and d.receiver_expires_at>now())) then perform private.fail('forbidden','Only the current receiver can issue a code during delivery.'); end if;
     if coalesce(p_payload->>'codeDigest','')!~'^[a-f0-9]{64}$' then perform private.fail('invalid_input','Invalid challenge digest.'); end if;
     if exists(select 1 from private.challenge_issues where delivery_id=did and issued_at>now()-interval '30 seconds') or (select count(*) from private.challenge_issues where delivery_id=did and issued_at>now()-interval '1 hour')>=5 then perform private.fail('rate_limited','Wait before requesting another code.'); end if;
     insert into private.challenge_issues(delivery_id,actor_id) values(did,p_actor);
     insert into private.handoff_challenges(delivery_id,code_digest,authorized_user_id,window_version,expires_at) values(did,p_payload->>'codeDigest',p_actor,d.window_version,least(now()+interval '15 minutes',d.window_end))
     on conflict(delivery_id) do update set code_digest=excluded.code_digest,authorized_user_id=excluded.authorized_user_id,window_version=excluded.window_version,expires_at=excluded.expires_at,attempts=0,consumed_at=null,revoked_at=null;
     result=jsonb_build_object('expiresAt',least(now()+interval '15 minutes',d.window_end),'simulated',false);
   else
     if cmd='verify_handoff' then
       if p_actor is distinct from d.rider_id then perform private.fail('forbidden','Assigned rider required.'); end if;
       key=nullif(p_payload->>'idempotencyKey','');
       if key is not null and exists(select 1 from private.command_receipts r where r.actor_id=p_actor and r.idempotency_key=key and r.delivery_id<>did) then perform private.fail('invalid_input','Idempotency key already belongs to another delivery.'); end if;
       if key is not null then select r.result into receipt from private.command_receipts r where r.actor_id=p_actor and r.idempotency_key=key and r.delivery_id=did; if found then return jsonb_build_object('data',receipt); end if; end if;
       select * into ch from private.handoff_challenges where delivery_id=did for update;
       if not found then return jsonb_build_object('error',jsonb_build_object('code','code_invalid','message','Request a handoff code first.')); end if;
       if ch.consumed_at is not null then return jsonb_build_object('error',jsonb_build_object('code','code_used','message','Code already used.')); end if;
       if d.status<>'out_for_delivery' then perform private.fail('invalid_transition','Parcel is not out for delivery.'); end if;
       if ch.revoked_at is not null or ch.window_version<>d.window_version or not(d.availability_version=d.window_version and ((d.availability='available' and ch.authorized_user_id=d.recipient_id) or (d.availability='alternative_confirmed' and ch.authorized_user_id=d.receiver_id and d.receiver_status='accepted' and d.receiver_expires_at>now() and d.receiver_version=d.window_version))) then return jsonb_build_object('error',jsonb_build_object('code','code_revoked','message','Receiver authorization changed.')); end if;
       if ch.expires_at<=now() or d.window_end<=now() then return jsonb_build_object('error',jsonb_build_object('code','code_expired','message','Code expired. Request another code.')); end if;
       if ch.attempts>=5 then return jsonb_build_object('error',jsonb_build_object('code','code_locked','message','Code locked. Request another code later.')); end if;
       if ch.code_digest is distinct from p_payload->>'codeDigest' then
         update private.handoff_challenges set attempts=attempts+1 where delivery_id=did;
         return jsonb_build_object('error',jsonb_build_object('code',case when ch.attempts+1>=5 then 'code_locked' else 'code_invalid' end,'message','Code not accepted. Check the current code.'));
       end if;
       update private.handoff_challenges set consumed_at=now() where delivery_id=did;
       update public.deliveries set status='delivered',delivered_at=now(),updated_at=now() where id=did;
       perform private.emit(did,p_actor,'delivered','Delivery completed');
     else
       if d.status in('delivered','cancelled') then perform private.fail('invalid_transition','Delivery is already complete.'); end if;
       case cmd
       when 'accept_job' then
         if d.status<>'booked' or d.rider_id is not null then perform private.fail('invalid_transition','Job already assigned.'); end if;
         if p_actor in(d.sender_id,d.recipient_id,d.receiver_id) or not exists(select 1 from public.profiles where id=p_actor and is_rider) then perform private.fail('forbidden','Trusted rider required.'); end if;
         update public.deliveries set rider_id=p_actor,status='accepted' where id=did;
       when 'respond_availability' then
         if p_actor<>d.recipient_id then perform private.fail('forbidden','Recipient required.'); end if;
         if d.window_end<=now() and coalesce((p_payload->>'available')::boolean,false) then perform private.fail('confirmation_required','Reschedule the expired delivery window first.'); end if;
         if jsonb_typeof(p_payload->'available') is distinct from 'boolean' then perform private.fail('invalid_input','Choose availability.'); end if;
         update public.deliveries set availability=case when (p_payload->>'available')::boolean then 'available' else 'unavailable' end,availability_version=window_version,responded_at=now(),receiver_status=case when receiver_id is null then null else 'revoked' end where id=did;
         update public.receiver_authorizations set status='revoked' where id=d.receiver_auth_id; perform private.invalidate_code(did);
       when 'invite_receiver' then
         if p_actor<>d.recipient_id then perform private.fail('forbidden','Recipient required.'); end if;
         if d.window_end<=now() then perform private.fail('confirmation_required','Reschedule the expired delivery window first.'); end if; target=(p_payload->>'receiverId')::uuid;
         if target in(d.recipient_id,d.rider_id) or not exists(select 1 from public.profiles where id=target) then perform private.fail('invalid_input','Choose another receiver.'); end if;
         update public.receiver_authorizations set status='revoked' where id=d.receiver_auth_id;
         update public.deliveries set receiver_id=target,receiver_status='pending',receiver_auth_id=gen_random_uuid(),receiver_version=window_version,receiver_expires_at=window_end,availability='unavailable',availability_version=window_version,responded_at=now() where id=did returning * into d;
         insert into public.receiver_authorizations(id,delivery_id,receiver_id,status,window_version,expires_at) values(d.receiver_auth_id,d.id,target,'pending',d.window_version,d.receiver_expires_at); perform private.invalidate_code(did);
       when 'respond_receiver' then
         if p_actor is distinct from d.receiver_id or d.receiver_status<>'pending' then perform private.fail('forbidden','Current invited receiver required.'); end if;
         if d.window_end<=now() or d.receiver_expires_at<=now() or d.receiver_version<>d.window_version then perform private.fail('invitation_expired','Invitation expired.'); end if;
         if jsonb_typeof(p_payload->'accept') is distinct from 'boolean' then perform private.fail('invalid_input','Choose an invitation response.'); end if;
         update public.deliveries set receiver_status=case when(p_payload->>'accept')::boolean then 'accepted' else 'declined' end,availability=case when(p_payload->>'accept')::boolean then 'alternative_confirmed' else 'unavailable' end,availability_version=window_version,responded_at=now() where id=did;
         update public.receiver_authorizations set status=case when(p_payload->>'accept')::boolean then 'accepted' else 'declined' end where id=d.receiver_auth_id; perform private.invalidate_code(did);
       when 'revoke_receiver' then
         if p_actor<>d.recipient_id then perform private.fail('forbidden','Recipient required.'); end if;
         update public.deliveries set receiver_status=case when receiver_id is null then null else 'revoked' end,availability='unavailable' where id=did;
         update public.receiver_authorizations set status='revoked' where id=d.receiver_auth_id; perform private.invalidate_code(did);
       when 'pickup','dispatch' then
         if p_actor is distinct from d.rider_id then perform private.fail('forbidden','Assigned rider required.'); end if;
         if (cmd='pickup' and d.status<>'accepted') or (cmd='dispatch' and d.status<>'picked_up') then perform private.fail('invalid_transition','Transport steps must occur in order.'); end if;
         if d.window_end<=now() or d.availability_version<>d.window_version or not(d.availability='available' or d.availability='alternative_confirmed' and d.receiver_status='accepted' and d.receiver_version=d.window_version and d.receiver_expires_at>now()) then perform private.fail('confirmation_required','Confirm a receiver for the active window first.'); end if;
         update public.deliveries set status=case when cmd='pickup' then 'picked_up' else 'out_for_delivery' end where id=did;
       when 'cancel' then
         if p_actor<>d.sender_id then perform private.fail('forbidden','Sender required.'); end if;
         if d.status not in('booked','accepted') then perform private.fail('invalid_transition','Cannot cancel after pickup.'); end if;
         update public.deliveries set status='cancelled',receiver_status=case when receiver_id is null then null else 'revoked' end where id=did;
         update public.receiver_authorizations set status='revoked' where id=d.receiver_auth_id; perform private.invalidate_code(did);
       when 'update_entrance' then
         if p_actor<>d.recipient_id then perform private.fail('forbidden','Recipient required.'); end if;
         if jsonb_typeof(p_payload->'entrance')<>'object' or length(coalesce(p_payload#>>'{entrance,instructions}',''))>2000 then perform private.fail('invalid_input','Invalid entrance instructions.'); end if;
       if (p_payload->'entrance' ? 'latitude') is distinct from (p_payload->'entrance' ? 'longitude') then perform private.fail('invalid_input','Provide both entrance coordinates or leave both empty.'); end if;
       if p_payload->'entrance' ? 'latitude' then
         if jsonb_typeof(p_payload#>'{entrance,latitude}') is distinct from 'number' or jsonb_typeof(p_payload#>'{entrance,longitude}') is distinct from 'number' then perform private.fail('invalid_input','Entrance coordinates must be numbers.'); end if;
         if (p_payload#>>'{entrance,latitude}')::numeric not between -90 and 90 or (p_payload#>>'{entrance,longitude}')::numeric not between -180 and 180 then perform private.fail('invalid_input','Entrance coordinates are outside valid bounds.'); end if;
       end if;
         if p_payload#>>'{entrance,photoPath}' is not null and p_payload#>>'{entrance,photoPath}' not like did::text||'/'||p_actor::text||'/%' then perform private.fail('invalid_input','Entrance photo must belong to this delivery.'); end if;
         update public.deliveries set entrance=p_payload->'entrance' where id=did;
       when 'request_reschedule' then
         if p_actor<>d.recipient_id then perform private.fail('forbidden','Recipient required.'); end if;
         new_start=(p_payload#>>'{window,start}')::timestamptz;new_end=(p_payload#>>'{window,end}')::timestamptz;
         if new_start is null or new_end is null or new_end<=new_start or new_end<=now() then perform private.fail('invalid_input','Invalid replacement window.'); end if;
         update public.deliveries set reschedule=jsonb_build_object('start',new_start,'end',new_end,'requestedBy',p_actor,'acknowledgements','[]'::jsonb) where id=did;
       when 'acknowledge_reschedule' then
         if p_actor not in(d.sender_id,coalesce(d.rider_id,d.sender_id)) or d.reschedule is null then perform private.fail('forbidden','Sender or assigned rider acknowledgement required.'); end if;
         acks=d.reschedule->'acknowledgements'; if not(acks ? p_actor::text) then acks=acks||to_jsonb(p_actor::text); end if;
         if acks ? d.sender_id::text and (d.rider_id is null or acks ? d.rider_id::text) then
           update public.deliveries set window_start=(reschedule->>'start')::timestamptz,window_end=(reschedule->>'end')::timestamptz,window_version=window_version+1,availability='pending',receiver_status=case when receiver_id is null then null else 'revoked' end,reschedule=null where id=did;
           update public.receiver_authorizations set status='revoked' where id=d.receiver_auth_id; perform private.invalidate_code(did);
         else update public.deliveries set reschedule=jsonb_set(reschedule,'{acknowledgements}',acks) where id=did; end if;
       else perform private.fail('invalid_input','Unknown delivery command.');
       end case;
       update public.deliveries set updated_at=now() where id=did;
       perform private.emit(did,p_actor,cmd,case cmd when 'invite_receiver' then 'Receiver invitation' when 'respond_receiver' then 'Receiver response' when 'dispatch' then 'Out for delivery' when 'cancel' then 'Delivery cancelled' else replace(initcap(cmd),'_',' ') end);
       if previous_receiver is not null and cmd in('respond_availability','invite_receiver','revoke_receiver','acknowledge_reschedule','cancel') and not exists(select 1 from public.deliveries x where x.id=did and x.receiver_id=previous_receiver and x.receiver_status in('pending','accepted') and x.status not in('cancelled','delivered')) then
         perform private.notify(previous_receiver,did,'Receiver authorization revoked');
       end if;
     end if;
     select private.delivery_for_actor(x,p_actor) into result from public.deliveries x where id=did;
     if cmd='verify_handoff' and key is not null then insert into private.command_receipts(actor_id,idempotency_key,delivery_id,result) values(p_actor,key,did,result) on conflict do nothing; end if;
   end if;
 else perform private.fail('invalid_input','Unknown API action.'); end if;
 return jsonb_build_object('data',result);
exception
 when sqlstate 'P0001' then return jsonb_build_object('error',jsonb_build_object('code',split_part(sqlerrm,'|',1),'message',split_part(sqlerrm,'|',2)));
 when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or not_null_violation or check_violation or foreign_key_violation then return jsonb_build_object('error',jsonb_build_object('code','invalid_input','message','Check the supplied delivery details.'));
end $$;
revoke all on function public.delivery_api(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.delivery_api(uuid,text,jsonb) to service_role;

create function public.notification_claim_batch(p_limit integer default 25) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update private.notification_outbox set status='failed',lease_id=null,lease_until=null where attempts>=8 and status='leased' and lease_until<now();
 with chosen as (
   select o.id from private.notification_outbox o join public.notifications n on n.id=o.notification_id join public.deliveries d on d.id=n.delivery_id
   where o.attempts<8 and o.available_at<=now() and (o.status in('pending','receipt') or o.status='leased' and o.lease_until<now())
   and (private.can_access(d,n.user_id) or (d.receiver_id=n.user_id and d.receiver_status='pending' and d.receiver_expires_at>now() and d.receiver_version=d.window_version) or (n.title='Receiver authorization revoked' and exists(select 1 from public.receiver_authorizations a where a.delivery_id=d.id and a.receiver_id=n.user_id)))
   order by o.created_at for update of o skip locked limit greatest(1,least(p_limit,100))
 ), claimed as (
   update private.notification_outbox o set status='leased',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
   where o.id in(select id from chosen) returning o.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'lease_id',c.lease_id,'attempts',c.attempts,'token',t.token,'notification_id',n.id,'user_id',n.user_id,'delivery_id',n.delivery_id,'title',n.title,'body',n.body,'receipt_id',c.receipt_id)),'[]'::jsonb)
 into result from claimed c join public.notifications n on n.id=c.notification_id join public.device_push_tokens t on t.id=c.token_id;
 return result;
end $$;
create function public.notification_record_result(p_outbox_id uuid,p_lease_id uuid,p_result text,p_receipt_id text default null,p_retry_at timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$
declare o private.notification_outbox;
begin
 select * into o from private.notification_outbox where id=p_outbox_id and lease_id=p_lease_id and status='leased' and lease_until>now() for update;
 if not found then return; end if;
 if p_result='invalid_token' then delete from public.device_push_tokens where id=o.token_id; return; end if;
 if p_result not in('sent','delivered','retry','failed') then raise exception 'Invalid worker result'; end if;
 update private.notification_outbox set status=case when p_result='delivered' then 'complete' when p_result='failed' or attempts>=8 then 'failed' when p_result='sent' then 'receipt' else case when coalesce(p_receipt_id,receipt_id) is null then 'pending' else 'receipt' end end,
 receipt_id=coalesce(p_receipt_id,receipt_id),available_at=greatest(coalesce(p_retry_at,now()+interval '1 minute'),now()),lease_id=null,lease_until=null where id=o.id;
end $$;
revoke all on function public.notification_claim_batch(integer),public.notification_record_result(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.notification_claim_batch(integer),public.notification_record_result(uuid,uuid,text,text,timestamptz) to service_role;
revoke all on all functions in schema private from public,anon,authenticated;
grant execute on all functions in schema private to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('entrance-photos','entrance-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- This boolean helper is the only authenticated private function. It derives identity
-- from auth.uid(), returns no row data, and lets receivers read entrance photos
-- without exposing sender pickup fields through the raw deliveries table.
create function private.can_read_entrance(p_delivery text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.deliveries d where d.id::text=p_delivery and coalesce(private.can_access(d,(select auth.uid())),false))
$$;
revoke all on function private.can_read_entrance(text) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.can_read_entrance(text) to authenticated;
create policy entrance_read on storage.objects for select to authenticated using(bucket_id='entrance-photos' and private.can_read_entrance((storage.foldername(name))[1]));
create policy entrance_insert on storage.objects for insert to authenticated with check(bucket_id='entrance-photos' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[1] and d.recipient_id=(select auth.uid()) and d.status not in('delivered','cancelled')));
create policy entrance_update on storage.objects for update to authenticated using(bucket_id='entrance-photos' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[1] and d.recipient_id=(select auth.uid()) and d.status not in('delivered','cancelled'))) with check(bucket_id='entrance-photos' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[1] and d.recipient_id=(select auth.uid()) and d.status not in('delivered','cancelled')));
create policy entrance_delete on storage.objects for delete to authenticated using(bucket_id='entrance-photos' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.deliveries d where d.id::text=(storage.foldername(name))[1] and d.recipient_id=(select auth.uid()) and d.status not in('delivered','cancelled')));

-- Realtime is a foreground invalidation signal; clients refetch after reconnect.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.deliveries,public.delivery_events,public.notifications;
 end if;
end $$;
