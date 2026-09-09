import { NextResponse } from 'next/server';
const {request}=require('node-appwrite');
const models=require('../../../runtime/models.json');
const size=f=>Math.round(Number(f.size||0)*1000);
const type=f=>f.mime?.startsWith('image/')?'images':f.mime?.startsWith('video/')?'videos':f.mime?.startsWith('audio/')?'music':f.mime?.includes('pdf')?'documents':'other';
async function scan(){
 const files=await request('upload/files');
 const documents=[];
 for(const model of Object.values(models)){
  for(let page=1;;page++){
   const result=await request(model.path+'?pagination[page]='+page+'&pagination[pageSize]=100');
   documents.push(...result.data);
   if(page>=result.meta.pagination.pageCount || !result.data.length)break;
  }
 }
 const corpus=JSON.stringify(documents);const referenced=new Set();
 for(const file of files)if(corpus.includes(file.url)||corpus.includes(file.hash))referenced.add(file.id);
 // Manifests may reference chunks indirectly. Until fully understood, retain every file when a manifest exists.
 const hasManifest=files.some(f=>/manifest|\.part/i.test(f.name));
 const orphaned=hasManifest?[]:files.filter(f=>!referenced.has(f.id));
 const orphanedByType={images:0,videos:0,music:0,documents:0,podcasts:0,other:0};
 const orphanedSizeByType={...orphanedByType};
 for(const f of orphaned){orphanedByType[type(f)]++;orphanedSizeByType[type(f)]+=size(f);}
 return {files,orphaned,report:{success:true,totalFiles:files.length,referencedFiles:referenced.size,orphanedFiles:orphaned.length,totalSize:files.reduce((n,f)=>n+size(f),0),orphanedSize:orphaned.reduce((n,f)=>n+size(f),0),orphanedByType,orphanedSizeByType,orphanedFileIds:orphaned.map(f=>String(f.id)),notice:hasManifest?'存在分段檔案，保留檔案以免移除間接引用。':undefined}};
}
export async function GET(){try {return NextResponse.json((await scan()).report);}catch(error){return NextResponse.json({error:'完整引用掃描未成功，未將任何檔案判定為多餘：'+error.message},{status:503});}}
export async function POST(request){
 try{
  if(new URL(request.url).searchParams.get('action')!=='delete')return NextResponse.json({error:'Invalid action'},{status:400});
  const {orphaned}=await scan();let deleted=0,failed=0;
  for(const file of orphaned){try{await requestFileDelete(file.id);deleted++;}catch{failed++;}}
  return NextResponse.json({success:failed===0,deleted,failed});
 }catch(error){return NextResponse.json({error:'掃描失敗，未刪除檔案：'+error.message},{status:503});}
}
async function requestFileDelete(id){return request('upload/files/'+encodeURIComponent(id),{method:'DELETE'});}
