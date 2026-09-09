import modelsJson from './models.json' with { type: 'json' };
import { getConnection, validateBaseUrl } from './config';
import { nextSiteVisitStreak, displaySiteVisitStreak } from '../siteVisitStreak';
import { buildTrialPurchaseWritePayload, buildReinstallSoftwareWritePayload, buildQuotaWritePayload, buildShoppingItemWritePayload, buildFengbroTubeChannelWritePayload, buildFinanceInstrumentWritePayload } from '../managementRecords';
type Row = Record<string, any>;
type Model = { path: string; attributes: Record<string, { type: string; required?: boolean }> };
export const models = modelsJson as unknown as Record<string, Model>;
export const aliases: Record<string, string> = {
  subscription: 'subscription', food: 'food', bank: 'bank', article: 'article', commonaccount: 'commonaccount',
  image: 'image', images: 'image', video: 'video', videos: 'video', music: 'music-item', podcast: 'podcast',
  commondocument: 'commondocument', routine: 'routine', 'trial-purchase': 'trialpurchase', reinstall: 'reinstall',
  quota: 'quota', 'shopping-list': 'shoppinglist', manualprice: 'manual-price', financeinstrument2: 'financeinstrument2',
  tubechannel: 'tubechannel', 'fengbro-news-source': 'fengbro-news-source', 'landtop/history': 'landtophistory',
};
export function toRecord(entry: Row, model?: string): Row {
  const row = entry.attributes ? { ...entry.attributes, id: entry.id } : { ...entry };
  const result = { ...row, $id: String(row.documentId || row.id), $createdAt: row.createdAt, $updatedAt: row.updatedAt };
  // The reference gallery uses cover as a selection flag; Strapi stores the cover URL.
  if (model === 'image') result.cover = Boolean(row.cover && row.cover !== 'false');
  return result;
}
export function toPayload(body: Row, model: string): Row {
  const builders: Record<string, (body: Row, mode: 'create' | 'update') => Row> = {trialpurchase:buildTrialPurchaseWritePayload,reinstall:buildReinstallSoftwareWritePayload,quota:buildQuotaWritePayload,shoppinglist:buildShoppingItemWritePayload,tubechannel:buildFengbroTubeChannelWritePayload,financeinstrument2:buildFinanceInstrumentWritePayload};
  if(builders[model])body=builders[model](body,'update');
  const data: Row = {};
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('$') || ['id','documentId','createdAt','updatedAt','publishedAt'].includes(key) || value === undefined) continue;
    const attr = models[model]?.attributes[key];
    if (model === 'image' && key === 'cover' && typeof value === 'boolean') {
      data.cover = value ? String(body.file || '') || null : null;
    } else if (attr?.type === 'boolean') {
      if (typeof value === 'boolean') data[key] = value;
      else if (value === 'true' || value === 1 || value === '1') data[key] = true;
      else if (value === 'false' || value === 0 || value === '0' || value === '') data[key] = false;
      else throw new Error(`${key} 必須是布林值`);
    } else if (['date','datetime','timestamp'].includes(attr?.type)) {
      data[key] = value === '' ? null : attr.type === 'date' && typeof value === 'string' ? value.slice(0,10) : value;
    } else if (['integer','biginteger','float','decimal'].includes(attr?.type)) {
      if (value === '' || value === null) data[key] = null;
      else if (!Number.isFinite(Number(value))) throw new Error(`${key} 必須是數字`);
      else data[key] = Number(value);
    } else data[key] = value;
  }
  return data;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
export async function strapiRequest(path: string, init: RequestInit = {}): Promise<any> {
  const config = getConnection();
  const headers = new Headers(init.headers);
  if (config.token) headers.set('Authorization', `Bearer ${config.token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type','application/json');
  const response = await fetch(`${validateBaseUrl(config.url)}/api/${path}`, { ...init, headers });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || `Strapi ${response.status}：${response.status === 403 ? '請確認 API Token 與資料表權限' : '服務暫時無法使用'}`), { status: response.status });
  return payload;
}
export async function listRecords(model: string, signal?: AbortSignal | null): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; ; page++) {
    const payload = await strapiRequest(`${models[model].path}?pagination[page]=${page}&pagination[pageSize]=100`, { signal });
    if (!Array.isArray(payload?.data)) throw new Error('Strapi 回傳了無效的清單資料');
    rows.push(...payload.data.map((row: Row) => toRecord(row, model)));
    const pagination = payload.meta?.pagination;
    if (!payload.data.length || (pagination ? page >= pagination.pageCount : payload.data.length < 100)) return rows;
  }
}
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = input instanceof Request ? input.url : String(input);
  const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost';
  const url = new URL(raw, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/api/')) return fetch(input, init);
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const signal = init?.signal;
  const route = url.pathname.slice(5).replace(/\/$/,'');
  const parts = route.split('/');
  const modelKey = aliases[route] || aliases[parts[0]];
  try {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    if (route === 'menu-usage' || route === 'site-visit') {
      const key = route === 'menu-usage' ? 'menuusage' : 'sitevisit';
      const rows = await listRecords(key,signal);
      if (method === 'GET') {
        if(key==='menuusage')return json({items:rows,exists:true});
        const row=rows[0];return json({count:row?.count || 0,currentStreak:displaySiteVisitStreak(row || {}),lastVisitAt:row?.lastVisitAt || null,lastVisitDate:row?.lastVisitDate || null,exists:Boolean(row)});
      }
      if(method!=='POST')return json({error:'不支援此操作'},405);
      if(key==='menuusage' && !body.moduleId)return json({error:'缺少 moduleId'},400);
      const previous=key==='menuusage'?rows.find(row=>row.moduleId===body.moduleId):rows[0];
      const now=new Date().toISOString();
      const streak=nextSiteVisitStreak(previous || {});
      const data=key==='menuusage'?{moduleId:body.moduleId,count:(previous?.count || 0)+1,lastUsedAt:now}:{count:(previous?.count || 0)+1,lastVisitAt:now,currentStreak:streak.currentStreak,lastVisitDate:streak.today};
      const result=await strapiRequest(models[key].path+(previous?'/'+encodeURIComponent(previous.$id):''),{method:previous?'PUT':'POST',body:JSON.stringify({data}),signal});
      return json({success:true,exists:true,...result.data});
    }
    if (modelKey && (parts.length === 1 || aliases[route] || parts.length === 2)) {
      const id = aliases[route] ? undefined : parts[1];
      const endpoint = models[modelKey].path + (id ? `/${encodeURIComponent(decodeURIComponent(id))}` : '');
      if (method === 'GET') {
        if (id) return json(toRecord((await strapiRequest(endpoint,{signal})).data,modelKey));
        return json(await listRecords(modelKey, signal));
      }
      if (method === 'DELETE') { await strapiRequest(endpoint,{method,signal}); return json({success:true}); }
      const payload = toPayload(body, modelKey);
      const result = await strapiRequest(endpoint,{method:method === 'PATCH' ? 'PUT' : method,body:JSON.stringify({data:payload}),signal});
      return json(toRecord(result.data,modelKey), method === 'POST' ? 201 : 200);
    }
    if (route === 'storage-stats' && method==='GET' && !url.searchParams.has('action')) {
      const files = await strapiRequest('upload/files', {signal});
      if (!Array.isArray(files)) throw new Error('無法讀取媒體庫');
      const stats: Row = { totalFiles:files.length,totalSize:0,storageLimit:6*1024**3,images:{count:0,size:0},videos:{count:0,size:0},music:{count:0,size:0},documents:{count:0,size:0},other:{count:0,size:0} };
      for (const file of files) {
        const size = Math.round(Number(file.size || 0)*1000);
        const category = file.mime?.startsWith('image/') ? 'images' : file.mime?.startsWith('video/') ? 'videos' : file.mime?.startsWith('audio/') ? 'music' : file.mime?.includes('pdf') ? 'documents' : 'other';
        stats[category].count++; stats[category].size+=size; stats.totalSize+=size;
      }
      stats.usagePercentage=stats.totalSize/stats.storageLimit*100;
      return json({stats});
    }
    if (route === 'database-stats') {
      const collections = await Promise.all(Object.entries(models).map(async ([name,model]) => {
        try { const result=await strapiRequest(`${model.path}?pagination[pageSize]=1`,{signal}); return {name,collectionId:name,columnCount:Object.keys(model.attributes).length,documentCount:result.meta?.pagination?.total || 0}; }
        catch { return {name,columnCount:Object.keys(model.attributes).length,documentCount:0,error:true}; }
      }));
      return json({ totalCollections:collections.length,totalColumns:collections.reduce((n,c)=>n+c.columnCount,0),collections,databaseId:'Strapi' });
    }
    if (route.startsWith('upload-')) {
      const source = init?.body;
      if (!(source instanceof FormData)) throw new Error('請選擇要上傳的檔案');
      const form = new FormData();
      const file = source.get('file') || source.get('files');
      if (!(file instanceof Blob)) throw new Error('缺少檔案');
      form.append('files',file);
      const files = await strapiRequest('upload',{method:'POST',body:form,signal});
      const uploaded=files[0];
      return json({url:new URL(uploaded.url,getConnection().url).href,fileId:String(uploaded.id),size:uploaded.size,fileSize:Math.round(uploaded.size*1000),mime:uploaded.mime,name:uploaded.name});
    }
    // Server-only tools are routed to an explicitly configured service. Never send Strapi credentials there.
    const toolBase = getConnection().toolApiUrl;
    if (!toolBase) return json({error:'此功能需要工具 API。請至「鋒兄設定」填入工具服務網址；Remix 靜態站無法自行執行伺服器工作。'},503);
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('_')) url.searchParams.delete(key);
    const headers = new Headers(init?.headers);
    for (const key of [...headers.keys()]) if (key.toLowerCase().startsWith('x-appwrite') || key.toLowerCase() === 'authorization') headers.delete(key);
    if (getConnection().toolApiToken) headers.set('X-Fengbro-Api-Key',getConnection().toolApiToken);
    return fetch(`${validateBaseUrl(toolBase)}${url.pathname}${url.search}`, {...init,headers});
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    return json({error:error instanceof Error ? error.message : '操作失敗'}, Number((error as Row)?.status) || 400);
  }
}
