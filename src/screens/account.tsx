import { router } from 'expo-router';
import { useState } from 'react';
import { AppText } from '@/components/ui/app-text';
import { Action, Choice, Notice, Page, Panel, Section } from '@/components/ui/product-ui';
import { useAppearance, type AppearanceMode } from '@/hooks/use-theme';
import { useDemo } from '@/features/demo/demo-provider';

export function AccountScreen(){const{gateway,reset}=useDemo();const{mode,setMode}=useAppearance();const[error,setError]=useState('');const[pending,setPending]=useState(false);
 async function resetDemo(){if(pending)return;setPending(true);try{await reset();router.replace('/deliveries');}catch(e){setError(e instanceof Error?e.message:'Could not reset the demo.');}finally{setPending(false);}}
 return <Page><Section title="Make yourself at home"><AppText color="textSecondary">Appearance and portfolio demo controls.</AppText></Section>
 <Panel><Choice label="Appearance" value={mode} onChange={(value:AppearanceMode)=>setMode?.(value)} options={[{label:'Follow system',value:'system'},{label:'Light',value:'light'},{label:'Dark',value:'dark'}]} /></Panel>
 <Panel><AppText variant="heading">{gateway.mode==='mock'?'Portfolio demo':'Connected account'}</AppText><AppText>{gateway.mode==='mock'?'The perspective selector changes fictional people only. No Supabase session or real courier action is created.':'Access is determined by your authenticated account and delivery participation.'}</AppText>
 {error&&<Notice text={error} danger />}{gateway.mode==='mock'&&<Action title={pending?'Resetting…':'Reset demo deliveries'} disabled={pending} onPress={()=>void resetDemo()} testID="reset-demo" />}
 <Action title="Open design system" secondary onPress={()=>router.push('/design-system')} /><Action title="Return to welcome" secondary onPress={()=>router.push('/')} /></Panel>
 </Page>;
}
