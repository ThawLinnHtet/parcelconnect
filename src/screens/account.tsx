import { router } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Choice, Notice, Page, Panel, Section } from '@/components/ui/product-ui';
import { useAppearance, type AppearanceMode } from '@/hooks/use-theme';
import { useDemo } from '@/features/demo/demo-provider';
import { useAuth } from '@/features/auth/auth-provider';
import { useConnection } from '@/features/auth/connection-provider';
import { PushSettings } from '@/features/notifications/push-settings';

export function AccountScreen(){const{gateway,reset}=useDemo();const auth=useAuth();const connection=useConnection();const{mode,setMode}=useAppearance();const[error,setError]=useState('');const[pending,setPending]=useState(false);
 async function resetDemo(){if(pending)return;setPending(true);try{await reset();router.replace('/deliveries');}catch(e){setError(e instanceof Error?e.message:'Could not reset the demo.');}finally{setPending(false);}}
 return <Page><Section title="Make yourself at home"><AppText color="textSecondary">Appearance and portfolio demo controls.</AppText></Section>
 <Panel><Choice label="Appearance" value={mode} onChange={(value:AppearanceMode)=>setMode?.(value)} options={[{label:'Follow system',value:'system'},{label:'Light',value:'light'},{label:'Dark',value:'dark'}]} /></Panel>
 <PushSettings />
 <Panel><AppText variant="heading">{gateway.mode==='mock'?'Portfolio demo':'Connected account'}</AppText><AppText>{gateway.mode==='mock'?'The perspective selector changes fictional people only. No Supabase session or real courier action is created.':'Access is determined by your authenticated account and delivery participation.'}</AppText>
 {gateway.mode==='mock' ? <Action title="Connect a Supabase account" secondary onPress={()=>router.push('/sign-in')} /> : <>
   <AppText color="textSecondary">{auth.user?.email ?? 'No verified account session'}</AppText>
   {auth.actor && <Choice label="Screen perspective" value={auth.actor.role} onChange={role=>auth.selectRole(role)} options={auth.roles.map(role=>({ label: role[0].toUpperCase()+role.slice(1), value: role }))} />}
   <AppText variant="supporting" color="textSecondary">This changes which actions the screen shows. The backend still checks your account against each delivery, and rider access is provisioned on the server.</AppText>
   <Action title="Return to portfolio demo" secondary onPress={()=>{connection.useMock();router.replace('/deliveries');}} />
   {auth.status==='signedIn'&&<Action title="Sign out" secondary onPress={()=>{void auth.signOut().then(()=>{connection.useMock();router.replace('/');}).catch(e=>setError(e instanceof Error?e.message:'Sign out failed.'));}} />}
 </>}
 {!!error&&<Notice text={error} danger />}{gateway.mode==='mock'&&<Action title={pending?'Resetting…':'Reset demo deliveries'} disabled={pending} onPress={()=>void resetDemo()} testID="reset-demo" />}
 <Action title="Open design system" secondary onPress={()=>router.push('/design-system')} /><Action title="Return to welcome" secondary onPress={()=>router.push('/')} /></Panel>
 </Page>;
}
