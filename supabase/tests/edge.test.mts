import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createHandler } from '../functions/delivery-api/core.ts';
const actor='00000000-0000-4000-8000-000000000001';
const delivery='00000000-0000-4000-8000-000000000002';
const secret='a'.repeat(40);
const request=(body:unknown,token='valid')=>new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
function setup(options:Record<string,unknown>={}){
 const calls:{actor:string;action:string;payload:Record<string,unknown>}[]=[];
 const handler=createHandler({crypto:webcrypto as unknown as Crypto,secret,
 authenticate:async token=>token==='valid'?actor:null,
 invoke:async (actor,action,payload)=>{calls.push({actor,action,payload});return {data:action==='issue_handoff_code'?{expiresAt:'2030-01-01',simulated:false}:{status:'delivered'}}},...options});
 return {handler,calls};
}
test('invalid sessions never invoke privileged SQL',async()=>{
 const {handler,calls}=setup();const response=await handler(request({action:'list_deliveries'},'expired'));
 assert.equal(response.status,401);assert.equal(calls.length,0);
});
test('actor comes from validated session and submitted identity is removed',async()=>{
 const {handler,calls}=setup();await handler(request({action:'get_delivery',payload:{id:delivery,actorId:'someone-else',actor:{id:'forged'},userId:'forged'}}));
 assert.equal(calls[0].actor,actor);assert.deepEqual(calls[0].payload,{id:delivery});
});
test('challenge generated with crypto and only its HMAC reaches SQL',async()=>{
 const {handler,calls}=setup();const response=await handler(request({action:'issue_handoff_code',payload:{deliveryId:delivery,codeDigest:'forged'}}));
 const result=await response.json();assert.match(result.data.code,/^\d{6}$/);assert.equal(result.data.simulated,false);
 assert.match(calls[0].payload.codeDigest as string,/^[a-f0-9]{64}$/);assert.equal(calls[0].payload.code,undefined);
 const code=result.data.code;await handler(request({action:'execute',payload:{type:'verify_handoff',deliveryId:delivery,code,codeDigest:'forged'}}));
 assert.equal(calls[1].payload.codeDigest,calls[0].payload.codeDigest);assert.equal(calls[1].payload.code,undefined);
});
test('failed issue does not return an uncommitted plaintext code',async()=>{
 const {handler}=setup({invoke:async()=>({error:{code:'forbidden',message:'Denied'}})});
 assert.deepEqual(await (await handler(request({action:'issue_handoff_code',payload:{deliveryId:delivery}}))).json(),{error:{code:'forbidden',message:'Denied'}});
});
test('server refuses missing secret and malformed codes without invoking SQL',async()=>{
 const missing=setup({secret:undefined});assert.equal((await missing.handler(request({action:'issue_handoff_code',payload:{deliveryId:delivery}}))).status,503);assert.equal(missing.calls.length,0);
 const invalid=setup();assert.equal((await invalid.handler(request({action:'execute',payload:{type:'verify_handoff',deliveryId:delivery,code:'abc'}}))).status,400);assert.equal(invalid.calls.length,0);
});
test('malformed JSON and oversized requests are rejected',async()=>{
 const {handler}=setup();const bad=new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer valid'},body:'{'});
 assert.equal((await handler(bad)).status,400);assert.equal((await handler(request({action:'list_people',payload:{padding:'x'.repeat(33000)}}))).status,413);
});
test('backend failure returns a generic response without internal details',async()=>{
 const {handler}=setup({invoke:async()=>{throw Error('secret detail')}});const response=await handler(request({action:'list_people'}));
 assert.equal(response.status,503);assert.ok(!(await response.text()).includes('secret detail'));
});
