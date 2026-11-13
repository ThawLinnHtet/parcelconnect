#!/usr/bin/env python3
"""Real SQL/RLS/transaction tests using disposable PostgreSQL + minimal Auth/Storage shims."""
from pathlib import Path
import concurrent.futures,json,os,subprocess,time,uuid
ROOT=Path(__file__).resolve().parents[2]
CONTAINER='parcelconnect-db-test-'+str(os.getpid())
IMAGE=os.environ.get('PARCELCONNECT_POSTGRES_IMAGE','postgres:17-alpine')

def run(*args,input=None,check=True):
 return subprocess.run(args,input=input,text=True,capture_output=True,check=check)
def sql(query,check=True):
 result=run('docker','exec','-i',CONTAINER,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-At',input=query,check=check)
 return result.stdout.strip() if check else result
S='00000000-0000-4000-8000-000000000001';P='00000000-0000-4000-8000-000000000002';R='00000000-0000-4000-8000-000000000003';V='00000000-0000-4000-8000-000000000004';U='00000000-0000-4000-8000-000000000005';R2='00000000-0000-4000-8000-000000000006'
checks=0
def expect(condition,message):
 global checks
 assert condition,message
 checks+=1
 print('ok',checks,message,flush=True)
def api(actor,action,payload=None):
 body=json.dumps(payload or {}).replace("'","''")
 output=sql(f"set role service_role; select public.delivery_api('{actor}'::uuid,'{action}','{body}'::jsonb);")
 return json.loads(output.splitlines()[-1])
def command(actor,kind,did=None,**extra):
 return api(actor,'execute',dict(type=kind,**({'deliveryId':did} if did else {}),**extra))
def book():
 return command(S,'book',input={'recipientId':P,'description':'Test parcel','size':'small','pickup':{'label':'Shop','address':'Private shop address'},'dropoff':{'label':'Home','address':'Private home address'},'window':{'start':'2030-01-01T10:00:00Z','end':'2030-01-01T12:00:00Z'}})['data']['id']
def error(result,code):return result.get('error',{}).get('code')==code
def ready(did,receiver=False):
 if receiver:
  command(P,'invite_receiver',did,receiverId=V);command(V,'respond_receiver',did,accept=True)
 else:command(P,'respond_availability',did,available=True)
 command(R,'accept_job',did);command(R,'pickup',did);command(R,'dispatch',did)

def main():
 run('docker','run','-d','--name',CONTAINER,'-e','POSTGRES_PASSWORD=local-test-only',IMAGE)
 for _ in range(60):
  if run('docker','exec',CONTAINER,'pg_isready','-U','postgres',check=False).returncode==0:break
  time.sleep(.5)
 sql((ROOT/'supabase/tests/bootstrap.sql').read_text())
 for path in sorted((ROOT/'supabase/migrations').glob('*.sql')):sql(path.read_text())
 sql('insert into auth.users(id) values '+','.join(f"('{a}')" for a in[S,P,R,V,U,R2])+';')
 sql(f"update public.profiles set is_rider=true where id in('{R}','{R2}');")
 did=book()
 expect(api(S,'get_delivery',{'id':did})['data']['status']=='booked','booking and document projection')
 expect(error(api(U,'get_delivery',{'id':did}),'not_found'),'unrelated actor cannot read a delivery')
 expect(error(command(P,'update_entrance',did,entrance={'instructions':'Pin','latitude':90.1,'longitude':1}),'invalid_input'),'backend rejects out-of-range entrance coordinates')
 expect(error(api(P,'execute',{'type':'accept_job','deliveryId':did}),'forbidden'),'ordinary account cannot self-grant rider')
 expect(error(api(R,'issue_handoff_code',{'deliveryId':did,'codeDigest':'a'*64}),'forbidden'),'rider cannot issue a handoff code')
 expect(error(command(R,'pickup',did),'forbidden'),'unassigned rider cannot transport')
 # Real RLS roles cannot see private rows or call privileged endpoints.
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{U}';select count(*) from public.deliveries;").splitlines()[-1]=='0','RLS denies unrelated SELECT')
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{S}';select count(*) from public.deliveries;").splitlines()[-1]=='1','RLS permits sender SELECT')
 expect(sql(f"set role authenticated;update public.deliveries set status='delivered' where id='{did}';",False).returncode!=0,'direct authenticated status updates denied')
 expect(sql(f"set role authenticated;select public.delivery_api('{S}','list_deliveries','{{}}');",False).returncode!=0,'privileged RPC is not callable by authenticated')
 expect(sql('set role anon;select * from public.deliveries;',False).returncode!=0,'signed-out SELECT denied')
 expect(sql('set role authenticated;select * from private.handoff_challenges;',False).returncode!=0,'challenge schema inaccessible')
 # Concurrent transactions race on the same row; exactly one rider wins.
 with concurrent.futures.ThreadPoolExecutor() as pool:claims=list(pool.map(lambda actor:command(actor,'accept_job',did),[R,R2]))
 expect(sum('data'in r for r in claims)==1,'two concurrent riders cannot both claim')
 assigned=api(S,'get_delivery',{'id':did})['data']['riderId']
 expect(error(command(assigned,'pickup',did),'confirmation_required'),'pickup waits for active confirmation')
 command(P,'respond_availability',did,available=True);command(assigned,'pickup',did);command(assigned,'dispatch',did)
 api(P,'issue_handoff_code',{'deliveryId':did,'codeDigest':'a'*64})
 for attempt in range(5):
  result=command(assigned,'verify_handoff',did,codeDigest='b'*64)
  expect(error(result,'code_locked' if attempt==4 else 'code_invalid'),f'failed attempt {attempt+1} returns expected error')
 expect(sql(f"select attempts from private.handoff_challenges where delivery_id='{did}';")=='5','failed attempt counters commit despite error envelopes')
 expect(error(command(assigned,'verify_handoff',did,codeDigest='a'*64),'code_locked'),'correct code cannot bypass lockout')
 # Accepted receiver authorizations, expiry, revocation, window revision.
 other=book();sql(f"update public.deliveries set pickup=pickup||'{{\"latitude\":12.5,\"longitude\":13.5}}'::jsonb where id='{other}';");command(P,'invite_receiver',other,receiverId=V)
 invitation=api(V,'get_delivery',{'id':other})['data']
 expect(invitation['pickup']['address']=='' and 'latitude' not in invitation['pickup'] and 'longitude' not in invitation['pickup'] and invitation['entrance']['instructions']=='','pending receiver sees sanitized context without sender pickup coordinates')
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{V}';select count(*) from public.deliveries where id='{other}';").splitlines()[-1]=='0','raw row RLS denies pending receiver')
 command(V,'respond_receiver',other,accept=True);command(R,'accept_job',other);command(R,'pickup',other);command(R,'dispatch',other)
 expect(api(V,'get_delivery',{'id':other})['data']['availability']['status']=='alternative_confirmed','receiver acceptance confirms active window')
 api(V,'issue_handoff_code',{'deliveryId':other,'codeDigest':'c'*64});command(P,'revoke_receiver',other)
 expect(error(api(V,'get_delivery',{'id':other}),'not_found'),'revoked receiver loses detail access')
 expect(error(command(R,'verify_handoff',other,codeDigest='c'*64),'code_revoked'),'receiver revocation invalidates prior code')
 command(P,'request_reschedule',other,window={'start':'2030-01-02T10:00:00Z','end':'2030-01-02T12:00:00Z'})
 first=command(S,'acknowledge_reschedule',other)['data'];expect(first['window']['version']==1,'sender acknowledgement alone waits for assigned rider')
 second=command(R,'acknowledge_reschedule',other)['data'];expect(second['window']['version']==2 and second['availability']['status']=='pending','applied reschedule invalidates old confirmation')
 # Expiry and successful idempotent/concurrent verification.
 complete=book();ready(complete);api(P,'issue_handoff_code',{'deliveryId':complete,'codeDigest':'d'*64})
 sql(f"update private.handoff_challenges set expires_at=now()-interval '1 second' where delivery_id='{complete}';")
 expect(error(command(R,'verify_handoff',complete,codeDigest='d'*64),'code_expired'),'expired challenge rejected')
 sql(f"update private.handoff_challenges set expires_at=now()+interval '1 minute' where delivery_id='{complete}';")
 with concurrent.futures.ThreadPoolExecutor() as pool:
  verified=list(pool.map(lambda _:command(R,'verify_handoff',complete,codeDigest='d'*64,idempotencyKey='handoff-once'),range(2)))
 expect(all(r.get('data',{}).get('status')=='delivered' for r in verified),'duplicate concurrent verification returns same completion')
 expect(sql(f"select count(*) from public.delivery_events where delivery_id='{complete}' and type='delivered';")=='1','exactly one completion event exists')
 expect(error(command(R,'verify_handoff',complete,codeDigest='d'*64),'code_used'),'consumed challenge cannot be reused without matching idempotency receipt')
 expect(error(command(S,'cancel',complete),'invalid_transition'),'terminal delivery cannot cancel')
 # Storage recipient ownership and active-participant read.
 photo=f'{complete}/{P}/entrance.jpg'
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{U}';insert into storage.objects(bucket_id,name) values('entrance-photos','{photo}');",False).returncode!=0,'unrelated photo upload denied')
 pending=book();photo=f'{pending}/{P}/entrance.jpg'
 sql(f"set role authenticated;set request.jwt.claim.sub='{P}';insert into storage.objects(bucket_id,name) values('entrance-photos','{photo}');")
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{U}';select count(*) from storage.objects;").splitlines()[-1]=='0','unrelated photo read denied')
 expect(sql(f"set role authenticated;set request.jwt.claim.sub='{S}';select count(*) from storage.objects;").splitlines()[-1]=='1','participant photo read allowed')
 # Device ownership transfer deletes former-user work; outbox leases are exclusive.
 token='ExponentPushToken[abcdefghijklmnopqrstuvwx]'
 api(P,'register_push_token',{'token':token,'deviceId':'phone'});api(U,'register_push_token',{'token':token,'deviceId':'phone'})
 expect(sql(f"select user_id from public.device_push_tokens where token='{token}';")==U,'Expo token registration transfers account ownership atomically')
 api(P,'register_push_token',{'token':'ExpoPushToken[zyxwvutsrqponmlkjihgfedcba]','deviceId':'recipient-phone'})
 command(P,'respond_availability',pending,available=True)
 with concurrent.futures.ThreadPoolExecutor() as pool:
  batches=list(pool.map(lambda _:json.loads(sql('set role service_role;select public.notification_claim_batch(100);').splitlines()[-1]),range(2)))
 ids=[row['id'] for batch in batches for row in batch]
 expect(len(ids)>0 and len(ids)==len(set(ids)),'outbox SKIP LOCKED leases prevent duplicate claims')
 item=next(row for batch in batches for row in batch)
 sql(f"set role service_role;select public.notification_record_result('{item['id']}','{item['lease_id']}','sent','receipt-123',now());")
 expect(sql(f"select receipt_id from private.notification_outbox where id='{item['id']}';")=='receipt-123','push ticket receipt survives pending receipt state')
 print(f'PASS: {checks} real SQL/RLS/transaction assertions. Auth/Storage are test shims; hosted GoTrue/Storage/Realtime and devices were not tested.')
try:main()
finally:run('docker','rm','-f',CONTAINER,check=False)
