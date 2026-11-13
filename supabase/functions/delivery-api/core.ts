export type ApiResult = { data?: unknown; error?: { code: string; message: string } };
export type Dependencies = {
  authenticate(token: string): Promise<string | null>;
  invoke(actor: string, action: string, payload: Record<string, unknown>): Promise<ApiResult>;
  secret?: string;
  crypto: Crypto;
};
const readActions = new Set(['list_people','list_deliveries','list_available_jobs','get_delivery','list_notifications','mark_notification_read','register_push_token','unregister_push_token']);
const commands = new Set(['book','respond_availability','invite_receiver','respond_receiver','revoke_receiver','accept_job','pickup','dispatch','verify_handoff','cancel','request_reschedule','acknowledge_reschedule','update_entrance']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const response = (body: ApiResult, status = 200) => new Response(JSON.stringify(body), { status, headers });
async function digest(secret: string, deliveryId: string, code: string, crypto: Crypto) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${deliveryId}:${code}`)));
  return Array.from(bytes, v => v.toString(16).padStart(2,'0')).join('');
}
export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return response({error:{code:'invalid_input',message:'POST required.'}},405);
    try {
      const token=request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (!token) return response({error:{code:'forbidden',message:'Sign in to continue.'}},401);
      const actor=await deps.authenticate(token);
      if (!actor) return response({error:{code:'forbidden',message:'Session expired. Sign in again.'}},401);
      const text=await request.text();
      if (text.length>32768) return response({error:{code:'invalid_input',message:'Request too large.'}},413);
      const body=JSON.parse(text) as { action?: unknown; payload?: unknown };
      const action=body.action;
      if(typeof action!=='string' || (!readActions.has(action)&&action!=='execute'&&action!=='issue_handoff_code')) return response({error:{code:'invalid_input',message:'Unknown action.'}},400);
      if(body.payload!==undefined && (typeof body.payload!=='object'||body.payload===null||Array.isArray(body.payload))) return response({error:{code:'invalid_input',message:'Invalid payload.'}},400);
      const payload={...(body.payload as Record<string,unknown>??{})};
      // Actor is derived exclusively from validated Auth; submitted identity fields have no authority.
      delete payload.actor; delete payload.actorId; delete payload.userId;
      if(action==='execute' && (typeof payload.type!=='string'||!commands.has(payload.type))) return response({error:{code:'invalid_input',message:'Unknown command.'}},400);
      const challenge=action==='issue_handoff_code'||action==='execute'&&payload.type==='verify_handoff';
      let issuedCode: string | undefined;
      if(challenge) {
        if(!deps.secret||deps.secret.length<32) return response({error:{code:'unavailable',message:'Handoff verification is not configured.'}},503);
        if(typeof payload.deliveryId!=='string'||!uuid.test(payload.deliveryId)) return response({error:{code:'invalid_input',message:'Valid delivery required.'}},400);
        if(action==='issue_handoff_code') {
          // Rejection sampling avoids modulo bias for the six-digit space.
          const ceiling=Math.floor(2**32/1_000_000)*1_000_000;
          let value: number;
          do { value=deps.crypto.getRandomValues(new Uint32Array(1))[0]; } while(value>=ceiling);
          issuedCode=(value%1_000_000).toString().padStart(6,'0');
          payload.codeDigest=await digest(deps.secret,payload.deliveryId,issuedCode,deps.crypto);
        } else {
          if(typeof payload.code!=='string'||!/^\d{6}$/.test(payload.code)) return response({error:{code:'invalid_input',message:'Enter six digits.'}},400);
          payload.codeDigest=await digest(deps.secret,payload.deliveryId,payload.code,deps.crypto);
          delete payload.code;
        }
      } else { delete payload.code; delete payload.codeDigest; }
      const result=await deps.invoke(actor,action,payload);
      if(issuedCode && !result.error) result.data={...(result.data as Record<string,unknown>),code:issuedCode,simulated:false};
      return response(result);
    } catch(error) {
      if(error instanceof SyntaxError) return response({error:{code:'invalid_input',message:'Invalid JSON.'}},400);
      // Never log payloads, codes, tokens, or backend error details.
      return response({error:{code:'unavailable',message:'Service unavailable. Try again.'}},503);
    }
  };
}
