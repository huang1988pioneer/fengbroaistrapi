import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
test('tools service requires authentication, restricts origins and serves real API routes',async()=>{
 const token=randomBytes(24).toString('hex');
 const port=18987;
 const process=spawn(globalThis.process.execPath,['services/tools/server.mjs'],{env:{...globalThis.process.env,PORT:String(port),TOOLS_API_TOKEN:token,ALLOWED_ORIGINS:'https://frontend.example'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(process.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('API startup timed out')),10000))]);
  const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/api/subscription')).status,401);
  assert.equal((await fetch(base+'/api/subscription',{headers:{Origin:'https://untrusted.example','X-Fengbro-Api-Key':token}})).status,403);
  const preflight=await fetch(base+'/api/subscription',{method:'OPTIONS',headers:{Origin:'https://frontend.example'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://frontend.example');
  const missing=await fetch(base+'/api/not-a-route',{headers:{'X-Fengbro-Api-Key':token}});assert.equal(missing.status,404);
  const invalid=await fetch(base+'/api/image-voice-video/tts',{method:'POST',headers:{'X-Fengbro-Api-Key':token,'Content-Type':'application/json'},body:JSON.stringify({text:"",language:"invalid"})});
  assert.equal(invalid.status,400);assert.ok((await invalid.json()).error);
 }finally{process.kill();}
});
