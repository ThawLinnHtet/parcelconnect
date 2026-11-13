import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Choice, Notice, Page, Panel } from '@/components/ui/product-ui';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { DEMO_ACTORS } from '@/features/deliveries';
import type { DeliveryCommand } from '@/features/deliveries';

export function ReceiverScreen() {
  const {id}=useLocalSearchParams<{id:string}>();const{gateway,actor,refresh}=useDemo();
  const load=useCallback(async()=>({delivery:await gateway.getDelivery(actor,id),people:await gateway.listPeople(actor)}),[gateway,actor,id]);
  const{data,loading,error}=useResource(load);const[selected,setSelected]=useState<string>(DEMO_ACTORS.receiver.id);const[pending,setPending]=useState(false);const[message,setMessage]=useState('');
  async function run(command:DeliveryCommand){if(pending)return;setPending(true);setMessage('');try{await gateway.execute(actor,command);refresh();}catch(e){setMessage(e instanceof Error?e.message:'Could not update the receiver.');}finally{setPending(false);}}
  if(loading)return <Page><Busy /></Page>;
  if(!data||error)return <Page><Notice text={error??'Delivery unavailable.'} danger /></Page>;
  const d=data.delivery;
  if(actor.id!==d.recipientId||actor.role!=='recipient')return <Page><Notice text="Only the recipient can nominate a receiver. Accept your invitation from delivery details." /></Page>;
  const candidates=data.people.filter(person=>person.id!==actor.id&&person.roles.includes('receiver'));
  return <Page><AppText variant="title">Choose a trusted receiver</AppText><AppText color="textSecondary">Invite an existing demo account. They must accept for this delivery window.</AppText>{message&&<Notice text={message} danger />}
    {d.receiver&&<Panel><AppText variant="heading">Current authorization</AppText><AppText>{data.people.find(p=>p.id===d.receiver?.receiverId)?.displayName??'Selected receiver'} · {d.receiver.status}</AppText>
      <AppText color="textSecondary">Revoking this authorization also invalidates its handoff code.</AppText>
      {['pending','accepted'].includes(d.receiver.status)&&<Action title="Revoke receiver authorization" secondary disabled={pending} onPress={()=>void run({type:'revoke_receiver',deliveryId:id})} testID="revoke-receiver" />}
    </Panel>}
    <Panel><Choice label="Receiver account" value={selected} onChange={setSelected} options={candidates.map(p=>({label:p.displayName,value:p.id}))} testID="receiver-picker" />
      <Action title={pending?'Saving…':'Send demo invitation'} disabled={pending||!candidates.some(p=>p.id===selected)} onPress={()=>void run({type:'invite_receiver',deliveryId:id,receiverId:selected})} testID="invite-receiver" />
      <AppText variant="supporting" color="textSecondary">Switch to the Receiver perspective to accept. No real email or SMS is sent.</AppText>
    </Panel></Page>;
}
