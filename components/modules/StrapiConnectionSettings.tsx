import { useState } from 'react';
import { CONFIG_KEY, getConnection, validateBaseUrl } from '@/lib/strapi/config';
import { clearAllCaches } from '@/lib/utils';
import { strapiRequest } from '@/lib/strapi/api';
export default function StrapiConnectionSettings() {
  const [config,setConfig]=useState(getConnection);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const save=async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const next={...config,url:validateBaseUrl(config.url),toolApiUrl:config.toolApiUrl ? validateBaseUrl(config.toolApiUrl) : ''};
      localStorage.setItem(CONFIG_KEY,JSON.stringify(next));
      clearAllCaches();
      window.dispatchEvent(new Event('fengbro:appwrite-config-changed'));
      await strapiRequest('subscriptions?pagination[pageSize]=1');
      setMessage('設定已儲存，Strapi 連線成功。重新載入後所有模組會使用此連線。');
    } catch(error) { setMessage(error instanceof Error ? error.message : '儲存失敗'); }
    finally {setBusy(false);}
  };
  return <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
    <h3 className="text-xl font-semibold">Strapi 帳號與服務</h3>
    <p className="text-muted-foreground">設定儲存在這個瀏覽器。Token 只會傳送至你指定的 Strapi 服務。</p>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {([['nickname','帳號暱稱','text'],['url','Strapi 網址','url'],['token','API Token','password'],['toolApiUrl','工具 API 網址（伺服器功能）','url'],['toolApiToken','工具 API 金鑰','password']] as const).map(([key,label,type])=><label key={key} className="grid gap-2">{label}<input className="rounded-xl border border-border bg-background p-3" type={type} value={config[key]} autoComplete="off" required={key==='url'} onChange={event=>setConfig({...config,[key]:event.target.value})}/></label>)}
      <p className="text-sm text-muted-foreground sm:col-span-2">基本資料、CSV、媒體上傳使用 Strapi。新聞抓取、語音合成、推播與影音下載需要相容的工具 API；PNG/JPEG 轉換及影片合併在瀏覽器執行。</p>
      <button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-5 py-3 disabled:opacity-50">{busy?'測試連線中…':'儲存並測試連線'}</button>
      <button type="button" className="rounded-xl border border-border px-5 py-3" onClick={()=>location.reload()}>重新載入介面</button>
    </form>
    <p role="status">{message}</p>
  </section>;
}
