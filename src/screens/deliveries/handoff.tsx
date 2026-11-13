import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Field, Notice, Page, Panel } from '@/components/ui/product-ui';
import { isConfirmationCurrent, type IssuedHandoffCode } from '@/features/deliveries';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { dateTime } from '@/features/demo/display';

export function HandoffScreen(){
 const{id}=useLocalSearchParams<{id:string}>();const{gateway,actor,refresh}=useDemo();const load=useCallback(()=>gateway.getDelivery(actor,id),[gateway,actor,id]);const{data:d,loading,error}=useResource(load);
 const[issued,setIssued]=useState<{actorId:string;deliveryId:string;eventCount:number;windowVersion:number;value:IssuedHandoffCode}>();const[input,setInput]=useState('');const[pending,setPending]=useState(false);const[result,setResult]=useState<{actorId:string;message:string;failed:boolean}>();
 async function issue(){if(pending)return;setPending(true);try{const value=await gateway.issueHandoffCode(actor,id);setIssued({actorId:actor.id,deliveryId:id,eventCount:d?.events.length??0,windowVersion:d?.window.version??0,value});setResult(undefined);}catch(e){setResult({actorId:actor.id,message:e instanceof Error?e.message:'Could not issue a code.',failed:true});}finally{setPending(false);}}
 async function verify(){if(pending)return;if(!/^\d{6}$/.test(input)){setResult({actorId:actor.id,message:'Enter the six-digit code supplied by the authorized receiver.',failed:true});return;}setPending(true);try{await gateway.execute(actor,{type:'verify_handoff',deliveryId:id,code:input,idempotencyKey:`demo-handoff-${id}`});setInput('');refresh();setResult({actorId:actor.id,message:'Handoff completed. This demo parcel is marked delivered.',failed:false});}catch(e){setResult({actorId:actor.id,message:e instanceof Error?e.message:'Verification failed.',failed:true});}finally{setPending(false);}}
 if(loading)return <Page><Busy /></Page>;if(!d||error)return <Page><Notice text={error??'Delivery unavailable.'} danger /></Page>;
 const rider=actor.role==='rider'&&actor.id===d.riderId;const codeHolder=d.availability.status==='available'?d.recipientId:d.receiver?.status==='accepted'?d.receiver.receiverId:null;const receiver=actor.id===codeHolder&&isConfirmationCurrent(d);
 const code=issued?.actorId===actor.id&&issued.deliveryId===id&&issued.eventCount===d.events.length&&issued.windowVersion===d.window.version?issued.value:undefined;
 return <Page><AppText variant="title">{rider?'Verify the handoff':'Your handoff code'}</AppText><Notice text={gateway.mode==='mock'?'Simulation only. This code demonstrates the handoff workflow; it is not real delivery verification.':'Share the code only when the parcel is handed over.'} />
   {result?.actorId===actor.id&&<Notice text={result.message} danger={result.failed} />}
   {d.status==='delivered'?<Panel><AppText variant="heading">Delivered</AppText><AppText>The one-time handoff has already been completed.</AppText></Panel>:d.status!=='out_for_delivery'?<Notice text="A handoff code is available only when this parcel is out for delivery." />:rider?<Panel>
     <AppText>Ask the authorized recipient or receiver for their code. The rider view cannot display it.</AppText><Field label="Six-digit handoff code" value={input} onChange={setInput} keyboardType="number-pad" testID="handoff-code-input" />
     <Action title={pending?'Verifying…':'Verify and complete delivery'} disabled={pending} onPress={()=>void verify()} testID="verify-handoff" />
   </Panel>:receiver?<Panel><AppText>Give this code to the rider only when you receive the parcel.</AppText>{code&&<><AppText variant="code" selectable testID="issued-code">{code.code}</AppText><AppText color="textSecondary">Expires {dateTime(code.expiresAt)}. Issuing another code invalidates this one.</AppText></>}
     <Action title={pending?'Issuing…':code?'Issue replacement code':'Issue handoff code'} disabled={pending} onPress={()=>void issue()} testID="issue-code" />
   </Panel>:<Notice text="Your account is not authorized to display this handoff code." danger />}
 </Page>;
}
