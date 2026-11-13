import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Field, Notice, Page } from '@/components/ui/product-ui';
import type { Delivery } from '@/features/deliveries';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';

function EntranceForm({delivery}:{delivery:Delivery}){
 const{gateway,actor,refresh}=useDemo();const[text,setText]=useState(delivery.entrance.instructions);const[pending,setPending]=useState(false);const[message,setMessage]=useState('');
 async function save(){if(pending)return;setPending(true);setMessage('');try{await gateway.execute(actor,{type:'update_entrance',deliveryId:delivery.id,entrance:{...delivery.entrance,instructions:text.trim()}});refresh();setMessage('Entrance guidance saved.');}catch(e){setMessage(e instanceof Error?e.message:'The guidance was not saved.');}finally{setPending(false);}}
 return <><Field label="Entrance instructions" value={text} onChange={setText} multiline hint="Describe the entrance or a helpful landmark. Do not include private door access codes." />{message&&<Notice text={message} />}<Action title={pending?'Saving…':'Save entrance guidance'} disabled={pending} onPress={()=>void save()} /></>;
}
export function EntranceScreen(){const{id}=useLocalSearchParams<{id:string}>();const{gateway,actor}=useDemo();const load=useCallback(()=>gateway.getDelivery(actor,id),[gateway,actor,id]);const{data,loading,error}=useResource(load);
 return <Page><AppText variant="title">Help the rider find you</AppText>{loading?<Busy />:error||!data?<Notice text={error??'Delivery unavailable.'} danger />:actor.id!==data.recipientId||actor.role!=='recipient'?<Notice text="Only the recipient can edit entrance guidance." />:<EntranceForm key={`${id}-${actor.id}`} delivery={data} />}</Page>;
}
