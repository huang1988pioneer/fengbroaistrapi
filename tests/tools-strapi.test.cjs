const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {Databases,Query}=require('../services/tools/runtime/sdk.cjs');
const originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;});
process.env.STRAPI_URL='https://cms.example';process.env.STRAPI_API_TOKEN='test';
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('server adapter queries real Strapi filters and retains document ids',async()=>{
 let target;global.fetch=async(url)=>{target=new URL(url);return response({data:[{id:1,documentId:'doc',name:'Test'}],meta:{pagination:{total:1}}})};
 const result=await new Databases().listDocuments('strapi','quota',[Query.equal('name',['Test']),Query.limit(1)]);
 assert.equal(target.pathname,'/api/quotas');assert.equal(target.searchParams.get('filters[name][$eq]'),'Test');assert.equal(result.documents[0].$id,'doc');
});
test('named settings ids resolve through the persistent key field',async()=>{
 const calls=[];global.fetch=async(url)=>{calls.push(url);return response(calls.length===1?{data:[{documentId:'generated'}]}:{data:{documentId:'generated',key:'main',fromEmail:'test@example.com'}})};
 const doc=await new Databases().getDocument({databaseId:'strapi',collectionId:'notificationsetting',documentId:'main'});
 assert.match(calls[0],/filters\[key\]\[\$eq\]=main/);assert.equal(calls[1],'https://cms.example/api/notificationsettings/generated');assert.equal(doc.fromEmail,'test@example.com');
});
test('settings creation stores stable key and updates resolve same row',async()=>{
 const calls=[];global.fetch=async(url,init)=>{calls.push({url,init});return response({data:{documentId:'generated'}})};
 await new Databases().createDocument({databaseId:'strapi',collectionId:'notificationsettings',documentId:'pin',data:{passwordHash:'hash'}});
 assert.deepEqual(JSON.parse(calls[0].init.body),{data:{passwordHash:'hash',key:'pin'}});
});
test('destructive schema changes are not exposed by compatibility adapter',async()=>{
 await assert.rejects(new Databases().deleteCollection('strapi','quota'),{code:409});
});
