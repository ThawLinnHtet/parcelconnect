import { createHandler } from './core.ts';
// Deno globals are confined to this server entrypoint; app TypeScript excludes functions.
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (r: Request) => Promise<Response>): void };
const url=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
Deno.serve(createHandler({
  crypto,
  secret:Deno.env.get('HANDOFF_HMAC_SECRET'),
  async authenticate(token) {
    if(!url||!serviceKey) return null;
    const result=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:serviceKey}});
    if(!result.ok)return null;
    const user=await result.json() as {id?:string};return user.id??null;
  },
  async invoke(actor,action,payload) {
    if(!url||!serviceKey)throw new Error('Server configuration missing');
    const result=await fetch(`${url}/rest/v1/rpc/delivery_api`,{method:'POST',headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,'Content-Type':'application/json'},body:JSON.stringify({p_actor:actor,p_action:action,p_payload:payload})});
    if(!result.ok)throw new Error('Database request failed');
    return result.json();
  },
}));
