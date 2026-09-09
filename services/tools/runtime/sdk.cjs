const schemas=require('./models.json');
const crypto=require('node:crypto');
const aliases={pushSubscriptions:'pushsubscription',music:'music-item',manualprice:'manual-price',notificationsettings:'notificationsetting',notification_settings:'notificationsetting',notificationSetting:'notificationsetting'};
const keyOf=id=>aliases[id] || id;
const fail=(message,code=400,type)=>Object.assign(new Error(message),{code,status:code,type});
class Client {
  setEndpoint(){return this;} setProject(){return this;} setKey(){return this;}
}
async function request(path,init={}) {
  if(!process.env.STRAPI_URL || !process.env.STRAPI_API_TOKEN)throw fail('請設定工具服務 STRAPI_URL 與 STRAPI_API_TOKEN',503);
  const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+process.env.STRAPI_API_TOKEN);
  if(init.body && !(init.body instanceof FormData))headers.set('Content-Type','application/json');
  const response=await fetch(process.env.STRAPI_URL.replace(/\/$/,'')+'/api/'+path,{...init,headers});
  if(response.status===204)return null;
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw fail(payload?.error?.message || 'Strapi '+response.status,response.status);
  return payload;
}
function row(entry){const r=entry.attributes?{...entry.attributes,id:entry.id}:entry;return {...r,$id:String(r.documentId||r.id),$createdAt:r.createdAt,$updatedAt:r.updatedAt};}
function schema(id){const s=schemas[keyOf(id)];if(!s)throw fail('Strapi content type '+id+' 不存在',404,'collection_not_found');return s;}
function collection(id){const s=schema(id);const names={'music-item':'music','manual-price':'manualprice',notificationsetting:'notificationsettings',pushsubscription:'pushSubscriptions'};return {$id:keyOf(id),name:names[keyOf(id)]||id,attributes:Object.entries(s.attributes).map(([key,a])=>({...a,key,status:'available',type:['text','string','email'].includes(a.type)?'string':a.type,array:a.type==='json',size:65535}))};}
function args(values,names){return values[0] && typeof values[0]==='object' && !Array.isArray(values[0])?values[0]:Object.fromEntries(names.map((name,i)=>[name,values[i]]));}
function payload(data,id){const result={};for(const [k,v]of Object.entries(data || {})){
 if(k.startsWith('$')||['id','documentId','createdAt','updatedAt','publishedAt'].includes(k)||v===undefined)continue;
 const type=schema(id).attributes[k]?.type;
 if(id==='image' && k==='cover' && typeof v==='boolean')result[k]=v?data.file||null:null;
 else if(['datetime','date'].includes(type)&&v==='')result[k]=null;
 else result[k]=v;
}return result;}
const queryValue=(v)=>Array.isArray(v)?v:[v];
const Query=new Proxy({}, {get:(_,method)=>(...values)=>JSON.stringify({method,values})});
function parseQuery(raw){if(typeof raw==='object')return raw;const q=JSON.parse(raw);return q.attribute?{method:q.method,values:[q.attribute,q.values]}:q;}
function queryParams(queries=[]){
 const params=new URLSearchParams();let limit=100,offset=0;
 for(const raw of queries){const q=parseQuery(raw),v=q.values||[];
  if(q.method==='limit')limit=Number(v[0]);
  else if(q.method==='offset')offset=Number(v[0]);
  else if(q.method==='orderAsc'||q.method==='orderDesc')params.append('sort',String(v[0]).replace('$createdAt','createdAt').replace('$updatedAt','updatedAt')+':'+(q.method==='orderAsc'?'asc':'desc'));
  else if(q.method==='select')continue;
  else if(q.method==='cursorAfter')throw fail('使用 offset 分頁以讀取 Strapi 資料');
  else {const operators={equal:'$eq',notEqual:'$ne',greaterThan:'$gt',greaterThanEqual:'$gte',lessThan:'$lt',lessThanEqual:'$lte',search:'$containsi',contains:'$contains',isNull:'$null',isNotNull:'$notNull'};
   const op=operators[q.method];if(!op)throw fail('不支援的查詢 '+q.method);
   const key=String(v[0]).replace('$id','documentId');const values=queryValue(v[1]??true);
   if(q.method==='equal'&&values.length>1)values.forEach((value,i)=>params.set(`filters[${key}][$in][${i}]`,String(value)));
   else params.set(`filters[${key}][${op}]`,String(values[0]));
  }
 }
 params.set('pagination[start]',String(offset));params.set('pagination[limit]',String(Math.min(limit,100)));return {params,limit,offset};
}
async function resolveDocumentId(collectionId,documentId){
 if(keyOf(collectionId)!=='notificationsetting')return documentId;
 const result=await request(schema(collectionId).path+'?filters[key][$eq]='+encodeURIComponent(documentId)+'&pagination[pageSize]=1');
 if(!result.data.length)throw fail('設定尚未建立',404);
 return result.data[0].documentId || result.data[0].id;
}
class Databases {
 constructor(client){this.client=client;}
 async listCollections(...values){const {queries=[]}=args(values,['databaseId','queries']);let collections=Object.keys(schemas).map(id=>collection(id));for(const raw of queries){const q=parseQuery(raw);if(q.method==='equal'&&q.values[0]==='name')collections=collections.filter(c=>queryValue(q.values[1]).includes(c.name));}return {collections,total:collections.length};}
 async getCollection(...values){const {collectionId}=args(values,['databaseId','collectionId']);return collection(collectionId);}
 async listAttributes(...values){const {collectionId}=args(values,['databaseId','collectionId']);const attributes=collection(collectionId).attributes;return {attributes,total:attributes.length};}
 async listDocuments(...values){
  const {collectionId,queries=[]}=args(values,['databaseId','collectionId','queries']);const s=schema(collectionId);const {params,limit,offset}=queryParams(queries);const documents=[];let total=0;
  for(let start=offset;documents.length<limit;start+=100){params.set('pagination[start]',String(start));params.set('pagination[limit]',String(Math.min(100,limit-documents.length)));const res=await request(s.path+'?'+params);total=res.meta?.pagination?.total || 0;documents.push(...res.data.map(row));if(!res.data.length||start+res.data.length>=total)break;}
  return {documents,total};
 }
 async getDocument(...values){const {collectionId,documentId}=args(values,['databaseId','collectionId','documentId']);return row((await request(schema(collectionId).path+'/'+encodeURIComponent(await resolveDocumentId(collectionId,documentId)))).data);}
 async createDocument(...values){const {collectionId,documentId,data}=args(values,['databaseId','collectionId','documentId','data','permissions']);if(keyOf(collectionId)==='notificationsetting')data.key=documentId;return row((await request(schema(collectionId).path,{method:'POST',body:JSON.stringify({data:payload(data,collectionId)})})).data);}
 async updateDocument(...values){const {collectionId,documentId,data}=args(values,['databaseId','collectionId','documentId','data','permissions']);return row((await request(schema(collectionId).path+'/'+encodeURIComponent(await resolveDocumentId(collectionId,documentId)),{method:'PUT',body:JSON.stringify({data:payload(data,collectionId)})})).data);}
 async deleteDocument(...values){const {collectionId,documentId}=args(values,['databaseId','collectionId','documentId']);await request(schema(collectionId).path+'/'+encodeURIComponent(documentId),{method:'DELETE'});return {};}
}
for(const method of ['createCollection','deleteCollection','createStringAttribute','createIntegerAttribute','createBooleanAttribute','createDatetimeAttribute','createUrlAttribute','updateStringAttribute'])Databases.prototype[method]=async()=>{throw fail('Strapi 結構請透過後端 schema 部署更新；工具 API 不會刪除或重建資料表。',409);};
const fileRow=f=>({...f,$id:String(f.id),sizeOriginal:Math.round(Number(f.size||0)*1000),mimeType:f.mime,$createdAt:f.createdAt,$updatedAt:f.updatedAt,url:new URL(f.url,process.env.STRAPI_URL).href});
class Storage {
 async listFiles(...values){const {queries=[]}=args(values,['bucketId','queries']);let files=(await request('upload/files')).map(fileRow);const total=files.length;let limit=100,offset=0;for(const raw of queries){const q=parseQuery(raw);if(q.method==='limit')limit=q.values[0];if(q.method==='offset')offset=q.values[0];}return {files:files.slice(offset,offset+limit),total};}
 async getFile(...values){const {fileId}=args(values,['bucketId','fileId']);return fileRow(await request('upload/files/'+encodeURIComponent(fileId)));}
 async deleteFile(...values){const {fileId}=args(values,['bucketId','fileId']);await request('upload/files/'+encodeURIComponent(fileId),{method:'DELETE'});return {};}
 async createFile(...values){const {file}=args(values,['bucketId','fileId','file','permissions']);const form=new FormData();form.append('files',file instanceof Blob?file:new Blob([file.data]),file.filename||file.name||'upload');return fileRow((await request('upload',{method:'POST',body:form}))[0]);}
 async updateFile(){throw fail('請於 Strapi 設定媒體權限',409);}
}
const ID={unique:()=>crypto.randomUUID()};const Role={any:()=>'*',users:()=> 'users'};const Permission=new Proxy({}, {get:(_,key)=>value=>`${key}:${value}`});
const InputFile={fromBuffer:(data,filename)=>({data,filename}),fromPath:async(path,filename)=>({data:await require('node:fs/promises').readFile(path),filename:filename||require('node:path').basename(path)})};
module.exports={Client,Databases,Storage,Query,ID,Role,Permission,InputFile,request};
