import http from 'node:http';
import fs from 'node:fs';
import {Readable} from 'node:stream';
import {timingSafeEqual} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const routes=JSON.parse(fs.readFileSync(new URL('./dist/routes.json',import.meta.url))).sort((a,b)=>Number(a.includes('['))-Number(b.includes('[')));
const token=process.env.TOOLS_API_TOKEN;
if(!token)throw new Error('TOOLS_API_TOKEN is required. The service will not start without authentication.');
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
function valid(candidate){const a=Buffer.from(candidate||''),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b);}
http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin && !origins.includes(origin)){res.writeHead(403);res.end('Origin not allowed');return;}
 const cors={'Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'Content-Type, X-Fengbro-Api-Key','Access-Control-Allow-Methods':'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Expose-Headers':'Content-Disposition, Content-Length'};
 if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return;}
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json',...cors});res.end(JSON.stringify({status:'ok'}));return;}
 if(!valid(req.headers['x-fengbro-api-key'])){res.writeHead(401,{'Content-Type':'application/json',...cors});res.end(JSON.stringify({error:'工具 API 驗證失敗'}));return;}
 const pathname=url.pathname.replace(/^\/api\//,'').replace(/\/$/,'');let match,params={};
 for(const route of routes){const names=[];const regex=route.split('/').map(part=>part.startsWith('[')?(names.push(part.slice(1,-1)),'([^/]+)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/');const found=pathname.match(new RegExp('^'+regex+'$'));if(found){match=route;params=Object.fromEntries(names.map((name,i)=>[name,decodeURIComponent(found[i+1])]));break;}}
 if(!match){res.writeHead(404,{'Content-Type':'application/json',...cors});res.end(JSON.stringify({error:'API 路徑不存在'}));return;}
 try {
  const module=require('./dist/'+match+'/route.cjs');const handler=module[req.method];
  if(!handler){res.writeHead(405,cors);res.end();return;}
  const controller=new AbortController();req.on('aborted',()=>controller.abort());
  const request=new Request(url,{method:req.method,headers:req.headers,signal:controller.signal,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  request.nextUrl=url;
  const response=await handler(request,{params:Promise.resolve(params)});
  res.writeHead(response.status,{...Object.fromEntries(response.headers),...cors});
  if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json',...cors});res.end(JSON.stringify({error:'工具服務執行失敗，請查看服務日誌'}));}
}).listen(Number(process.env.PORT||8787),'0.0.0.0',()=>console.log('Fengbro tools API listening'));
