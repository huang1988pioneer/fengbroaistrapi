import { getConnection } from './strapi/config';
import { strapiRequest } from './strapi/api';
import { categoryFromFile, recordMediaTraffic, type MediaTrafficCategory } from './mediaTraffic';
export const STORAGE_UPLOAD_LIMIT_BYTES=6*1024**3;
export async function assertClientStorageQuota(incomingSize:number) {
 if(!Number.isFinite(incomingSize) || incomingSize<0) throw new Error('檔案大小無效');
}
export async function uploadToAppwriteStorage(file:File,onProgress?:(progress:number)=>void,trafficCategory?:MediaTrafficCategory):Promise<{url:string;fileId:string}> {
 const config=getConnection();
 const form=new FormData(); form.append('files',file);
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest(); xhr.open('POST',config.url.replace(/\/$/,'')+'/api/upload');
  if(config.token) xhr.setRequestHeader('Authorization','Bearer '+config.token);
  xhr.upload.onprogress=event=>{if(event.lengthComputable) onProgress?.(Math.min(99,Math.round(event.loaded/event.total*100)));};
  xhr.onerror=()=>reject(new Error('上傳連線失敗，請確認 Strapi 服務與 CORS 設定'));
  xhr.onabort=()=>reject(new Error('上傳已取消'));
  xhr.onload=()=>{
   let payload:any; try {payload=JSON.parse(xhr.responseText);} catch {reject(new Error('上傳回應格式錯誤'));return;}
   if(xhr.status<200 || xhr.status>=300 || !payload?.[0]?.url){reject(new Error(payload?.error?.message || '上傳失敗（'+xhr.status+'）'));return;}
   const uploaded=payload[0]; const url=new URL(uploaded.url,config.url).href;
   localStorage.setItem('strapi-file:'+uploaded.id,url);
   const category=trafficCategory || categoryFromFile(file); if(category)recordMediaTraffic(category,'upload',file.size);
   onProgress?.(100); resolve({url,fileId:String(uploaded.id)});
  }; xhr.send(form);
 });
}
export async function deleteFromAppwriteStorage(fileId:string):Promise<void>{await strapiRequest('upload/files/'+encodeURIComponent(fileId),{method:'DELETE'});localStorage.removeItem('strapi-file:'+fileId);}
export function getAppwriteFileUrl(fileId:string):string{return typeof localStorage==='undefined'?'':localStorage.getItem('strapi-file:'+fileId)||'';}
