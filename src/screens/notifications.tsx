import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Busy, Notice, Page, Panel } from '@/components/ui/product-ui';
import { useDemo } from '@/features/demo/demo-provider';
import { useResource } from '@/features/demo/use-resource';
import { dateTime } from '@/features/demo/display';

export function NotificationsScreen(){const{gateway,actor,refresh}=useDemo();const load=useCallback(()=>gateway.listNotifications(actor),[gateway,actor]);const{data,loading,error}=useResource(load);const[openError,setOpenError]=useState('');
 async function open(notificationId:string,deliveryId:string){try{await gateway.markNotificationRead(actor,notificationId);refresh();router.push(`/deliveries/${deliveryId}`);}catch(e){setOpenError(e instanceof Error?e.message:'Could not open this update.');}}
 return <Page><AppText variant="title">Updates that keep you in the loop.</AppText><AppText color="textSecondary">{gateway.mode==='mock'?'These updates are generated inside the demo. Remote push is not enabled.':'Your delivery updates.'}</AppText>
 {!!openError&&<Notice text={openError} danger />}{loading?<Busy />:error?<><Notice text={error} danger /><Action title="Retry updates" secondary onPress={refresh} /></>:!data?.length?<Panel><AppText variant="heading">You are up to date</AppText><AppText color="textSecondary">Availability requests and handoff updates will appear here.</AppText></Panel>:data.map(item=><Panel key={item.id}><AppText variant="heading">{item.readAt?'':'Unread · '}{item.title}</AppText><AppText>{item.body}</AppText><AppText variant="supporting" color="textSecondary">{dateTime(item.createdAt)}</AppText><Action title="Open delivery" secondary onPress={()=>void open(item.id,item.deliveryId)} /></Panel>)}
 </Page>;
}
