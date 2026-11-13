import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Field, Notice, Page, Panel } from '@/components/ui/product-ui';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { localInput, parseLocal, tomorrowWindow, windowText } from '@/features/demo/display';
import type { DeliveryCommand } from '@/features/deliveries';

export function AvailabilityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { actor, gateway, refresh } = useDemo();
  const load = useCallback(() => gateway.getDelivery(actor, id), [gateway, actor, id]);
  const { data: d, loading, error } = useResource(load); const suggested = tomorrowWindow();
  const [start, setStart] = useState(localInput(suggested.start)); const [end, setEnd] = useState(localInput(suggested.end));
  const [message, setMessage] = useState(''); const [failed, setFailed] = useState(false); const [pending, setPending] = useState(false);
  async function run(command: DeliveryCommand) { if(pending)return; setPending(true);setMessage('');
    try { await gateway.execute(actor, command); refresh();setFailed(false);setMessage(command.type === 'request_reschedule' ? 'Your new window was requested. It needs acknowledgement before it becomes active.' : 'Your availability was updated.'); }
    catch(e){setFailed(true);setMessage(e instanceof Error ? e.message : 'Your response was not saved.');} finally{setPending(false);}
  }
  function reschedule(){ const a=parseLocal(start),b=parseLocal(end);if(!a||!b||new Date(a)<=new Date()||b<=a){setFailed(true);setMessage('Choose a future start and a later end using YYYY-MM-DD HH:mm.');return;} void run({type:'request_reschedule',deliveryId:id,window:{start:a,end:b}}); }
  if(loading)return <Page><Busy /></Page>;
  if(!d||error)return <Page><Notice text={error??'Delivery unavailable.'} danger /></Page>;
  if(actor.id!==d.recipientId||actor.role!=='recipient')return <Page><Notice text="Only the recipient can change availability." /></Page>;
  return <Page><AppText variant="title">Can you receive this parcel?</AppText><AppText color="textSecondary">{windowText(d.window)}</AppText>
    {message&&<Notice text={message} danger={failed} />}<Panel><AppText>Current response: {d.availability.status.replaceAll('_',' ')}</AppText>
      <Action title={pending?'Saving…':"I'll be there"} onPress={()=>void run({type:'respond_availability',deliveryId:id,available:true})} disabled={pending} testID="confirm-availability" />
      <Action title="I won't be there" secondary onPress={()=>void run({type:'respond_availability',deliveryId:id,available:false})} disabled={pending} testID="unavailable" />
      <AppText variant="supporting" color="textSecondary">A receiver invitation is not a confirmation until the receiver accepts.</AppText>
    </Panel><Panel><AppText variant="heading">Request a different window</AppText><Field label="New window starts" value={start} onChange={setStart} hint="Local time: YYYY-MM-DD HH:mm" /><Field label="New window ends" value={end} onChange={setEnd} />
      <Action title="Request new window" secondary disabled={pending} onPress={reschedule} />
    </Panel></Page>;
}
