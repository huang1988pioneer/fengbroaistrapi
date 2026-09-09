import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {apiFetch, toPayload, toRecord} from '../../lib/strapi/api.ts';
const originalFetch=globalThis.fetch;
let calls;
beforeEach(()=>{
  calls=[];
  globalThis.localStorage={getItem:key=>key==='fengbro-strapi-connection'?JSON.stringify({url:'https://cms.example',token:'test-token',toolApiUrl:'https://tools.example'}):null};
});
afterEach(()=>{globalThis.fetch=originalFetch;delete globalThis.localStorage;});
const response=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
test('create image sends URL cover and only Strapi credentials in headers',async()=>{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return response({data:{...JSON.parse(init.body).data,documentId:'abc'}})};
 const result=await apiFetch('/api/image?_key=legacy-secret',{method:'POST',body:JSON.stringify({name:'Photo',file:'https://cms.example/uploads/a.png',cover:true})});
 assert.equal(result.status,201);
 assert.equal(calls[0].url,'https://cms.example/api/images');
 assert.equal(calls[0].init.headers.get('Authorization'),'Bearer test-token');
 assert.equal(JSON.parse(calls[0].init.body).data.cover,'https://cms.example/uploads/a.png');
 assert.equal((await result.json()).$id,'abc');
});
test('legacy false cover becomes null',()=>assert.equal(toPayload({cover:false},'image').cover,null));
test('false strings stay false and cleared dates become null',()=>{
 assert.deepEqual(toPayload({continue:'false',nextdate:''},'subscription'),{continue:false,nextdate:null});
});
test('pagination loads every page',async()=>{
 globalThis.fetch=async(url)=>{calls.push(url);return response({data:[{documentId:String(calls.length)}],meta:{pagination:{pageCount:2}}})};
 const result=await apiFetch('/api/subscription');assert.equal((await result.json()).length,2);
 assert.match(calls[1],/pagination\[page\]=2/);
});
test('update uses documentId and does not write metadata',async()=>{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return response({data:{documentId:'doc'}})};
 await apiFetch('/api/food/doc',{method:'PUT',body:JSON.stringify({$id:'doc',name:'Rice',createdAt:'old'})});
 assert.equal(calls[0].url,'https://cms.example/api/foods/doc');assert.deepEqual(JSON.parse(calls[0].init.body),{data:{name:'Rice'}});
});
test('delete accepts Strapi 204',async()=>{
 globalThis.fetch=async()=>new Response(null,{status:204});
 assert.deepEqual(await (await apiFetch('/api/food/doc',{method:'DELETE'})).json(),{success:true});
});
test('backend errors keep HTTP status',async()=>{
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'Forbidden'}}),{status:403});
 const result=await apiFetch('/api/food');assert.equal(result.status,403);assert.equal((await result.json()).error,'Forbidden');
});
test('tool routing removes legacy secrets and auth headers',async()=>{
 globalThis.fetch=async(url,init)=>{calls.push({url,init});return response({ok:true})};
 await apiFetch('/api/fengbro-news?_key=secret&q=test',{headers:{Authorization:'Bearer secret','x-appwrite-key':'secret'}});
 assert.equal(calls[0].url,'https://tools.example/api/fengbro-news?q=test');assert.equal(calls[0].init.headers.get('Authorization'),null);assert.equal(calls[0].init.headers.get('x-appwrite-key'),null);
});
test('Strapi v4 and v5 rows expose compatible ids',()=>{
 assert.equal(toRecord({id:1,attributes:{name:'Old'}}).$id,'1');assert.equal(toRecord({id:1,documentId:'new'}).$id,'new');
});
