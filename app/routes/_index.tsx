import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BadgePercent,
  Banknote,
  BookOpenText,
  Boxes,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  Film,
  FolderHeart,
  Gauge,
  Image,
  Info,
  Laptop,
  LayoutGrid,
  Menu,
  Monitor,
  Moon,
  Music,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCcw,
  Rows2,
  Rows4,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  Trash2,
  Upload,
  Utensils,
  Wrench,
  X,
} from "lucide-react";

type FieldType = "text" | "number" | "date" | "datetime" | "textarea" | "url" | "boolean";

type ThemeMode = "light" | "dark" | "system";

type DensityMode = "comfortable" | "compact";

type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  required?: boolean;
  strapiKey?: string;
  defaultValue?: string | number | boolean;
};

type ModuleDef = {
  id: string;
  label: string;
  subtitle: string;
  icon: JSX.Element;
  fields: FieldDef[];
  apiPath?: string;
  seedCsv?: string;
  children?: ModuleDef[];
};

type ItemRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: string | number | boolean;
};

type ToolLink = {
  label: string;
  hint: string;
  url: (query: string) => string;
};

type ToolPreset = {
  title: string;
  description: string;
  badge: string;
  placeholder: string;
  defaultQuery: string;
  defaultSource: string;
  notice: string;
  links: ToolLink[];
};

const nowIso = () => new Date().toISOString();
const storagePrefix = "fengbro-remix-crud";
const settingsStorageKey = `${storagePrefix}:settings`;
const themeStorageKey = `${storagePrefix}:theme`;
const densityStorageKey = `${storagePrefix}:density`;

/* Read straight into useState. Restoring in an effect instead would let the
   apply-effect write the default back over the saved choice before the
   restored state ever commits. */
function savedTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(themeStorageKey);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function savedDensity(): DensityMode {
  if (typeof window === "undefined") return "comfortable";
  const saved = window.localStorage.getItem(densityStorageKey);
  return saved === "compact" ? "compact" : "comfortable";
}
const fallbackStrapiUrl = "https://site--strapigoldshoot0720--p9rc2b8grv9b.code.run";
const defaultStrapiUrl = import.meta.env.VITE_STRAPI_URL || fallbackStrapiUrl;
const defaultStrapiApiToken = import.meta.env.VITE_STRAPI_API_TOKEN || "";

const yahooFinanceSymbols = "2330.TW ^TWII USDTWD=X BTC-USD ^GSPC ^IXIC";
const defaultToolApiBase = import.meta.env.VITE_FENGBRO_TOOL_API_BASE || "https://sq-lite-cloud-feng-bro-ai.vercel.app";

type PriceToolResult = {
  title: string;
  url: string;
  source: string;
  currency: string;
  currentPrice: number | null;
  notice?: string;
  matchedTitle?: string;
  matchedUrl?: string;
  resolvedAt: string;
  history: Array<{ date: string; price: number | null; currency?: string }>;
};

type MobileToolProduct = {
  id: string;
  brand: string;
  name: string;
  suggestedPrice?: number | null;
  landtopPrice?: number | null;
  landtopPriceLabel?: string | null;
  sourceUrl?: string | null;
  jyesPrice?: number | null;
  jyesPriceLabel?: string | null;
  jyesUrl?: string | null;
  bestPrice?: number | null;
  bestSourceLabel?: string | null;
};

type MobileToolResult = {
  source: string;
  query: string;
  total: number;
  fetchedAt: string;
  products: MobileToolProduct[];
  warnings?: string[];
};

type TubeToolVideo = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
  channelTitle?: string;
};

type TubeToolChannel = {
  sourceUrl: string;
  channelId: string;
  title: string;
  videos: TubeToolVideo[];
  error?: string;
};

type TubeToolResult = {
  fetchedAt: string;
  sourceCount: number;
  defaultSourceCount: number;
  channels: TubeToolChannel[];
  recentVideos: TubeToolVideo[];
};

type FinanceToolQuote = {
  id: string;
  name: string;
  displayName: string;
  symbol: string;
  sourceUrl: string;
  group: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  high52: number | null;
  low52: number | null;
  lastUpdated: string;
  recordTag: "new-high" | "new-low" | null;
  isThresholdAlert?: boolean;
  alertMessage?: string;
  error?: string;
};

type FinanceToolResult = {
  fetchedAt: string;
  source: string;
  quotes: FinanceToolQuote[];
  financeAlerts: Array<{ id: string; message: string; sourceUrl: string }>;
  shillerPe: {
    current: number | null;
    recordHigh: number;
    recordHighDate: string;
    isRecordHigh: boolean;
  };
};

function searchUrl(base: string, query: string) {
  return `${base}${encodeURIComponent(query.trim())}`;
}

function buildToolApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, defaultToolApiBase);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchToolJson<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const directUrl = buildToolApiUrl(path, params);
  const encodedUrl = encodeURIComponent(directUrl);
  const urls = [
    directUrl,
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://api.allorigins.win/get?url=${encodedUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`,
    `https://cors.isomorphic-git.org/${directUrl}`,
  ];
  let lastError = "";

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : {};
      const payload = typeof parsed?.contents === "string" ? JSON.parse(parsed.contents) : parsed;
      if (!response.ok) {
        lastError = typeof payload?.error === "string" ? payload.error : `${response.status} ${response.statusText}`;
        continue;
      }
      if (typeof payload?.error === "string") throw new Error(payload.error);
      return payload as T;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError || "Live tool API is temporarily unavailable");
}

function formatToolDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatToolMoney(value: number | null | undefined, currency = "TWD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${currency === "TWD" ? "NT$ " : `${currency} `}${formatNumber(value)}`;
}

function summarizePriceHistory(history: PriceToolResult["history"] = []) {
  const prices = history.map((point) => point.price).filter((price): price is number => typeof price === "number" && Number.isFinite(price));
  if (!prices.length) return { high: null, low: null, change: null };
  const first = prices[0];
  const last = prices[prices.length - 1];
  return {
    high: Math.max(...prices),
    low: Math.min(...prices),
    change: first ? last - first : null,
  };
}

function groupFinanceQuotes(quotes: FinanceToolQuote[]) {
  const labels: Record<string, string> = {
    taiwan: "台股",
    us: "美股指數",
    valuation: "估值",
    asia: "亞洲",
    korea: "韓股",
    forex: "匯率",
    commodity: "商品",
  };
  return Object.entries(labels).map(([key, label]) => ({
    key,
    label,
    rows: quotes.filter((quote) => quote.group === key),
  }));
}

function getToolPreset(moduleId: string): ToolPreset | null {
  const presets: Record<string, ToolPreset> = {
    price: {
      title: "鋒兄比價",
      description: "參考 Appwrite 的 BigGo/商品價格追蹤流程，建立商品價格快照。",
      badge: "Price",
      placeholder: "貼上商品網址或輸入商品名稱",
      defaultQuery: "https://24h.pchome.com.tw/prod/DRAHGT-A900GOJVX",
      defaultSource: "BigGo / PChome / momo",
      notice: "查詢後可填入目前價格、最高價格、最低價格並建立 Strapi 快照。",
      links: [
        { label: "BigGo", hint: "商品比價搜尋", url: (query) => searchUrl("https://biggo.com.tw/s/", query) },
        { label: "PChome", hint: "24h 商品搜尋", url: (query) => searchUrl("https://ecshweb.pchome.com.tw/search/v3.3/?q=", query) },
        { label: "momo", hint: "momo 商品搜尋", url: (query) => searchUrl("https://www.momoshop.com.tw/search/searchShop.jsp?keyword=", query) },
      ],
    },
    "phone-price": {
      title: "手機比價",
      description: "參考 Appwrite 的 landtop 手機比價，快速開啟地標網通、傑昇通信與品牌搜尋。",
      badge: "Phone",
      placeholder: "例如 iPhone 17 512GB、Samsung S26 256GB",
      defaultQuery: "iPhone 17 512GB",
      defaultSource: "地標網通 / 傑昇通信",
      notice: "可記錄地標價、建議售價或最低通路價。",
      links: [
        { label: "地標網通", hint: "手機通路搜尋", url: (query) => searchUrl("https://www.landtop.com.tw/search?keyword=", query) },
        { label: "傑昇通信", hint: "手機價格搜尋", url: (query) => searchUrl("https://www.jyes.com.tw/search?q=", query) },
        { label: "SOGI 手機王", hint: "規格與價格", url: (query) => searchUrl("https://www.sogi.com.tw/search?keyword=", query) },
      ],
    },
    tube: {
      title: "鋒兄Tube",
      description: "參考 Appwrite 的 FengBro Tube，管理頻道/影片查詢與追蹤紀錄。",
      badge: "Tube",
      placeholder: "輸入 YouTube 關鍵字、頻道名稱或影片主題",
      defaultQuery: "鋒兄 AI",
      defaultSource: "YouTube",
      notice: "可把頻道、影片或播放清單 URL 記錄成 Tube 追蹤項目。",
      links: [
        { label: "YouTube 搜尋", hint: "影片搜尋", url: (query) => searchUrl("https://www.youtube.com/results?search_query=", query) },
        { label: "YouTube 頻道", hint: "頻道搜尋", url: (query) => searchUrl("https://www.youtube.com/results?sp=EgIQAg%253D%253D&search_query=", query) },
        { label: "Bilibili 搜尋", hint: "補充影音來源", url: (query) => searchUrl("https://search.bilibili.com/all?keyword=", query) },
      ],
    },
    finance: {
      title: "鋒兄金融",
      description: "參考 Appwrite 的 CNBC/Yahoo Finance 監控，建立股價、匯率、指數與加密資產觀察清單。",
      badge: "Finance",
      placeholder: `例如 ${yahooFinanceSymbols}`,
      defaultQuery: "2330.TW",
      defaultSource: "Yahoo Finance / Google Finance",
      notice: "可記錄目前價格、52 週高低或警戒價。",
      links: [
        { label: "Yahoo Finance", hint: "報價與走勢", url: (query) => searchUrl("https://finance.yahoo.com/quote/", query.split(/\s+/)[0] || query) },
        { label: "Google Finance", hint: "金融搜尋", url: (query) => searchUrl("https://www.google.com/finance/quote/", query.split(/\s+/)[0] || query) },
        { label: "TradingView", hint: "圖表搜尋", url: (query) => searchUrl("https://www.tradingview.com/search/?query=", query) },
      ],
    },
  };

  return presets[moduleId] ?? null;
}

const subscriptionCsv = `name,site,price,nextdate,note,account,currency,continue
小北百貨連續簽到,,0,2026-06-07,"~0607
0988
0908",,TWD,false
Proton Drive Plus 200 GB,https://drive.proton.me,5,2026-06-15,,huang1988pioneer,USD,false
蝦皮VIP,,59,2026-06-30,"台新銀行
0731
0831",abuhg17,TWD,true
ChatGPT/ＰＬＵＳ,https://chatgpt.com/#pricing,690,2026-07-04,"outlook
街口
中信
Apple Pay",gaokaolevel3iptopscorer,TWD,true
Google AI Pro,https://gemini.google.com/app,0,2026-08-08,"5TB
前4個月試用免費
650元",fengtuprinfo,TWD,false`;

const foodCsv = `name,amount,todate,photo,price,shop,photohash
小北百貨30元購物金,1,2026-06-11T00:00:00.000+00:00,,0,,
【義美】煎餅 ~08/13 ~08/25,4,2026-08-04T00:00:00.000+00:00,,0,,
【愛之味】牛奶花生,4,2027-03-04T00:00:00.000+00:00,https://www.agv.com.tw/wp-content/uploads/69691c7bdcc3ce6d5d8a1361f22d04ac.jpg,0,,
【泰山】八寶粥,5,2027-04-14T00:00:00.000+00:00,https://shoplineimg.com/64587ad406d620007ce10917/6463162e0fa8d10001cc0eb5/800x.jpg?,0,,`;

const articleCsv = `title,content,category,newDate,url1,url2,url3,file1,file1name,file1type,file2,file2name,file2type,file3,file3name,file3type
歷史價格紀錄,"KIOXIA 鎧俠 Exceria Plus G3 SSD M.2 2280 PCIe NVMe 1TB Gen4x4
https://24h.pchome.com.tw/prod/DRAHGT-A900GOJVX
曾經來到２０９０元",,2026-06-04,,,,,,,,,,,,
米斗多,"紅豆 芋頭 巧克力
1 1 1",,2026-06-01,,,,,,,,,,,,
中原豆花,"玉玉子豆花 中北路二段457號 招牌豆花 固定三配料
熊豆花 麻糬豆花 大仁五街19號 自選三配料",,2026-06-01,,,,,,,,,,,,`;

const commonCsv = `name,site01,note01,site02,note02,site03,note03,site04,note04
goldshoot0720@gmail.com,可灵AI,,即梦AI,,豆包,,Appwrite,
dailycash539get8000000@outlook.com,Appwrite,,Github,,MindVideo,,Outlook,
sjes8460105@hotmail.com,Github,,Gmail,,MindVideo,,Suno,`;

const bankCsv = `name,deposit,site,address,withdrawals,transfer,activity,card,account
兆豐銀行,1000,,,0,0,,,末五碼 52678
中華郵政,1000,,,0,0,,,末五碼 45747
台新銀行,500,https://www.taishinbank.com.tw,,5,5,https://richart.tw/TSDIB_RichartWeb/ntd-saving-currency,台新Richart VISA金融卡 1902,末五碼 57295
Xiaomi 手環9 NFC 午夜黑,316,,,0,0,,,
Supercard超級悠遊卡LOGO線條款,242,https://www.easycard.com.tw/museum?page=1,,0,0,,,`;

const routineCsv = `name,note,lastdate1,lastdate2,lastdate3,link,photo
鋒兄理髮,,2026-05-18T00:00:00.000+00:00,2026-02-04T00:00:00.000+00:00,,,
鋒兄手機,Samsung Galaxy A56 5G (12G/256G),2026-01-02T00:00:00.000+00:00,,,,https://storage.googleapis.com/landtop_prod/productimage/3544/image/e63b19d17156868403c6645dc5572ca3.png
鋒兄眼鏡,"13500元
非凡比眼鏡",2025-09-03T00:00:00.000+00:00,,,,`;

const settingsCsv = `name,strapiUrl,apiToken,note
Strapi,${defaultStrapiUrl},${defaultStrapiApiToken},"可用 VITE_STRAPI_URL 與 VITE_STRAPI_API_TOKEN 從部署環境預填"`;

const subscriptionFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "site", label: "網站", type: "url" },
  { key: "price", label: "價格", type: "number" },
  { key: "nextdate", label: "下次日期", type: "date" },
  { key: "note", label: "備註", type: "textarea" },
  { key: "account", label: "帳號" },
  { key: "currency", label: "幣別", placeholder: "TWD" },
  { key: "continue", label: "持續", type: "boolean" },
];

const mediaFields: FieldDef[] = [
  { key: "title", label: "標題", required: true },
  { key: "url", label: "連結", type: "url" },
  { key: "category", label: "分類" },
  { key: "date", label: "日期", type: "date" },
  { key: "note", label: "備註", type: "textarea" },
];

const toolPriceFields: FieldDef[] = [
  { key: "toolType", label: "工具類型", required: true },
  { key: "queryText", label: "查詢內容", required: true },
  { key: "title", label: "標題" },
  { key: "source", label: "來源" },
  { key: "currentPrice", label: "目前價格", type: "number" },
  { key: "highPrice", label: "最高價格", type: "number" },
  { key: "lowPrice", label: "最低價格", type: "number" },
  { key: "resultUrl", label: "結果 URL", type: "url" },
  { key: "notice", label: "備註", type: "textarea" },
];

const imageFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "file", label: "圖片 URL", type: "url" },
  { key: "filetype", label: "檔案類型" },
  { key: "note", label: "備註", type: "textarea" },
  { key: "ref", label: "來源/參考", type: "url" },
  { key: "category", label: "分類" },
  { key: "hash", label: "Hash" },
  { key: "cover", label: "封面 URL", type: "url" },
];

const fileAssetFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "file", label: "檔案 URL", type: "url" },
  { key: "filetype", label: "檔案類型" },
  { key: "note", label: "備註", type: "textarea" },
  { key: "ref", label: "來源/參考", type: "url" },
  { key: "category", label: "分類" },
  { key: "hash", label: "Hash" },
  { key: "cover", label: "封面 URL", type: "url" },
];

const videoFields: FieldDef[] = [
  ...fileAssetFields,
  { key: "fileSize", label: "檔案大小", type: "number" },
];

const musicFields: FieldDef[] = [
  ...fileAssetFields,
  { key: "lyrics", label: "歌詞", type: "textarea" },
  { key: "language", label: "語言" },
];

/* 管理類欄位比照 fengbroaiappwrite 的 MANAGEMENT_TABLE_SCHEMAS，
   前六個欄位排在最前面，因為表格只顯示前六欄。 */
const trialPurchaseFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "eventDate", label: "日期", type: "datetime" },
  { key: "firstPurchasePrice", label: "首購價", type: "number" },
  { key: "regularPrice", label: "原價", type: "number" },
  { key: "trialStatus", label: "試用狀態", placeholder: "試用中 / 已結束 / 無試用" },
  { key: "purchaseStatus", label: "首購狀態", placeholder: "未購買 / 已首購 / 已續購" },
  { key: "account", label: "帳號" },
  { key: "note", label: "備註", type: "textarea" },
];

const reinstallFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "category", label: "分類" },
  { key: "system", label: "系統", placeholder: "Windows / macOS" },
  { key: "softwareType", label: "軟體類型" },
  { key: "licenseType", label: "授權類型" },
  { key: "site", label: "網站", type: "url" },
  { key: "serial", label: "序號" },
  { key: "viewPassword", label: "檢視密碼" },
  { key: "subscriptionSoftware", label: "訂閱制", type: "boolean" },
  { key: "subscriptionPeriod", label: "訂閱週期" },
  { key: "subscriptionPrice", label: "訂閱價格", type: "number" },
  { key: "subscriptionCurrency", label: "訂閱幣別", placeholder: "TWD" },
  { key: "note", label: "備註", type: "textarea" },
];

const quotaFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "serviceType", label: "服務類型" },
  { key: "account", label: "帳號" },
  { key: "quotaRemaining", label: "剩餘額度", type: "number" },
  { key: "quotaPoints", label: "點數", type: "number" },
  { key: "quotaExpiry", label: "額度到期", type: "datetime" },
  { key: "quotaRatio", label: "額度比例", type: "number" },
  { key: "litmediaAccount", label: "LitMedia 帳號槽" },
  { key: "pointsSyncedAt", label: "點數量測時間", type: "datetime" },
  { key: "usageSyncedAt", label: "用量量測時間", type: "datetime" },
  { key: "ratio5h", label: "5 小時比例", type: "number" },
  { key: "expiry5h", label: "5 小時重置" },
  { key: "ratioWeek", label: "一週比例", type: "number" },
  { key: "expiryWeek", label: "一週重置" },
  { key: "ratioMonth", label: "一月比例", type: "number" },
  { key: "expiryMonth", label: "一月重置" },
  { key: "resetCreditsBalance", label: "重置點數餘額", type: "number" },
  { key: "resetCreditsExpiry", label: "重置點數到期" },
  { key: "note", label: "備註", type: "textarea" },
  { key: "accessToken", label: "Access Token", type: "textarea" },
];

const shoppingListFields: FieldDef[] = [
  { key: "name", label: "名稱", required: true },
  { key: "plannedDate", label: "預計日期", type: "datetime" },
  { key: "price", label: "價格", type: "number" },
  { key: "quantity", label: "數量", type: "number" },
  { key: "shop", label: "商店" },
  { key: "pickupMethod", label: "取貨方式", placeholder: "宅配 / 超商 / 自取" },
  { key: "currency", label: "幣別", placeholder: "TWD" },
  { key: "imageUrl", label: "圖片 URL", type: "url" },
  { key: "account", label: "帳號" },
  { key: "note", label: "備註", type: "textarea" },
];

/* 模組順序比照 fengbroaiappwrite 的鋒兄管理選單。 */
const modules: ModuleDef[] = [
  { id: "subscription", label: "鋒兄訂閱", subtitle: "續訂、扣款與提醒", icon: <Archive />, fields: subscriptionFields, apiPath: "subscriptions", seedCsv: subscriptionCsv },
  { id: "trial-purchase", label: "試用首購", subtitle: "試用與首購狀態", icon: <BadgePercent />, fields: trialPurchaseFields, apiPath: "trial-purchases" },
  { id: "reinstall", label: "鋒兄重灌", subtitle: "軟體授權與序號", icon: <Laptop />, fields: reinstallFields, apiPath: "reinstalls" },
  { id: "quota", label: "鋒兄額度", subtitle: "服務額度與點數", icon: <Gauge />, fields: quotaFields, apiPath: "quotas" },
  {
    id: "food",
    label: "鋒兄食品",
    subtitle: "食品與商品庫存",
    icon: <Utensils />,
    apiPath: "foods",
    seedCsv: foodCsv,
    fields: [
      { key: "name", label: "名稱", required: true },
      { key: "amount", label: "庫存數量", type: "number" },
      { key: "todate", label: "到期日", type: "datetime" },
      { key: "photo", label: "照片", type: "url" },
      { key: "price", label: "價格", type: "number" },
      { key: "shop", label: "商店" },
      { key: "photohash", label: "照片 Hash" },
    ],
  },
  { id: "shopping-list", label: "購物清單", subtitle: "待買品項與取貨", icon: <ShoppingCart />, fields: shoppingListFields, apiPath: "shopping-lists" },
  {
    id: "article",
    label: "鋒兄筆記",
    subtitle: "文章、連結與附件",
    icon: <BookOpenText />,
    apiPath: "articles",
    seedCsv: articleCsv,
    fields: [
      { key: "title", label: "標題", required: true },
      { key: "content", label: "內容", type: "textarea" },
      { key: "category", label: "分類" },
      { key: "newDate", label: "日期", type: "date", strapiKey: "newDate" },
      { key: "url1", label: "連結 1", type: "url" },
      { key: "url2", label: "連結 2", type: "url" },
      { key: "url3", label: "連結 3", type: "url" },
      { key: "file1", label: "檔案 1" },
      { key: "file1name", label: "檔名 1" },
      { key: "file1type", label: "類型 1" },
      { key: "file2", label: "檔案 2" },
      { key: "file2name", label: "檔名 2" },
      { key: "file2type", label: "類型 2" },
      { key: "file3", label: "檔案 3" },
      { key: "file3name", label: "檔名 3" },
      { key: "file3type", label: "類型 3" },
    ],
  },
  {
    id: "common",
    label: "鋒兄常用",
    subtitle: "常用帳號與網站",
    icon: <FolderHeart />,
    apiPath: "commonaccounts",
    seedCsv: commonCsv,
    fields: [
      { key: "name", label: "帳號", required: true },
      ...Array.from({ length: 6 }, (_, index) => index + 1).flatMap((num) => [
        { key: `site${String(num).padStart(2, "0")}`, label: `網站 ${num}` },
        { key: `note${String(num).padStart(2, "0")}`, label: `備註 ${num}` },
      ]),
    ],
  },
  { id: "image", label: "鋒兄圖片", subtitle: "圖片素材庫", icon: <Image />, fields: imageFields, apiPath: "images" },
  { id: "video", label: "鋒兄影片", subtitle: "影片與頻道", icon: <Film />, fields: videoFields, apiPath: "videos" },
  { id: "music", label: "鋒兄音樂", subtitle: "歌曲與歌詞", icon: <Music />, fields: musicFields, apiPath: "music-items" },
  { id: "document", label: "鋒兄文件", subtitle: "文件與檔案", icon: <FileText />, fields: fileAssetFields, apiPath: "commondocuments" },
  { id: "podcast", label: "鋒兄播客", subtitle: "播客清單", icon: <FileAudio />, fields: fileAssetFields, apiPath: "podcasts" },
  {
    id: "bank",
    label: "鋒兄銀行",
    subtitle: "銀行與電子票證",
    icon: <Banknote />,
    apiPath: "banks",
    seedCsv: bankCsv,
    fields: [
      { key: "name", label: "名稱", required: true },
      { key: "deposit", label: "存款/餘額", type: "number" },
      { key: "site", label: "網站", type: "url" },
      { key: "address", label: "地址" },
      { key: "withdrawals", label: "提款", type: "number" },
      { key: "transfer", label: "轉帳", type: "number" },
      { key: "activity", label: "活動", type: "url" },
      { key: "card", label: "卡片/電子票證" },
      { key: "account", label: "帳號" },
    ],
  },
  {
    id: "routine",
    label: "鋒兄例行",
    subtitle: "例行採買與保養",
    icon: <RefreshCcw />,
    apiPath: "routines",
    seedCsv: routineCsv,
    fields: [
      { key: "name", label: "名稱", required: true },
      { key: "note", label: "備註", type: "textarea" },
      { key: "lastdate1", label: "日期 1", type: "datetime" },
      { key: "lastdate2", label: "日期 2", type: "datetime" },
      { key: "lastdate3", label: "日期 3", type: "datetime" },
      { key: "link", label: "連結", type: "url" },
      { key: "photo", label: "照片", type: "url" },
    ],
  },
  {
    id: "tools",
    label: "鋒兄工具",
    subtitle: "工具入口與子功能",
    icon: <Wrench />,
    fields: mediaFields,
    children: [
      { id: "price", label: "鋒兄比價", subtitle: "價格追蹤", icon: <PackagePlus />, fields: mediaFields, apiPath: "tool-price-histories" },
      { id: "phone-price", label: "手機比價", subtitle: "手機規格價格", icon: <Boxes />, fields: mediaFields },
      { id: "tube", label: "鋒兄Tube", subtitle: "影音搜尋", icon: <Film />, fields: mediaFields },
      { id: "finance", label: "鋒兄金融", subtitle: "金融資訊", icon: <Banknote />, fields: mediaFields },
    ],
  },
  {
    id: "settings",
    label: "鋒兄設定",
    subtitle: "Strapi URL 與 API Token",
    icon: <Settings />,
    seedCsv: settingsCsv,
    fields: [
      { key: "name", label: "設定名稱", required: true },
      { key: "strapiUrl", label: "Strapi URL", type: "url" },
      { key: "apiToken", label: "Strapi API Token", type: "textarea" },
      { key: "note", label: "備註", type: "textarea" },
    ],
  },
  {
    id: "about",
    label: "鋒兄關於",
    subtitle: "專案說明",
    icon: <Info />,
    fields: [
      { key: "title", label: "標題", required: true },
      { key: "content", label: "內容", type: "textarea" },
      { key: "url", label: "連結", type: "url" },
    ],
  },
];

const modulesWithToolConfig = configureToolModules(modules);
const moduleMap = new Map(flattenModules(modulesWithToolConfig).map((item) => [item.id, item]));

/* The phone dock holds four modules; everything else lives in the drawer. */
const dockModules = ["subscription", "food", "article", "tools"]
  .map((id) => modulesWithToolConfig.find((item) => item.id === id))
  .filter((item): item is ModuleDef => Boolean(item));

function isBranchActive(item: ModuleDef, activeId: string) {
  return item.id === activeId || Boolean(item.children?.some((child) => child.id === activeId));
}

/* Chrome is tight — the 鋒兄 prefix is already in the wordmark. */
function shortLabel(label: string) {
  return label.replace(/^鋒兄/, "") || label;
}

function configureToolModules(sourceModules: ModuleDef[]) {
  return sourceModules.map((moduleDef) => {
    if (moduleDef.id !== "tools" || !moduleDef.children) return moduleDef;
    return {
      ...moduleDef,
      children: moduleDef.children.map((child) =>
        isToolModule(child.id)
          ? {
              ...child,
              apiPath: "tool-price-histories",
              fields: getToolFields(child.id),
            }
          : child,
      ),
    };
  });
}

function getToolFields(toolType: string) {
  return toolPriceFields.map((field) => (field.key === "toolType" ? { ...field, defaultValue: toolType } : field));
}

function isToolModule(moduleId: string) {
  return ["price", "phone-price", "tube", "finance"].includes(moduleId);
}

export default function Index() {
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaUploadRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState("subscription");
  const activeModule = moduleMap.get(activeId) ?? modules[0];
  const [recordsByModule, setRecordsByModule] = useState<Record<string, ItemRecord[]>>({});
  const [settings, setSettings] = useState<ItemRecord>(() => getDefaultSettingsRecord());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ label: string; current: number; total: number } | null>(null);
  const [toast, setToast] = useState("已準備 Remix CRUD 工作台");
  const [theme, setTheme] = useState<ThemeMode>(savedTheme);
  const [density, setDensity] = useState<DensityMode>(savedDensity);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeParent = modulesWithToolConfig.find((item) => isBranchActive(item, activeId));

  useEffect(() => {
    const saved = window.localStorage.getItem(settingsStorageKey);
    if (saved) {
      setSettings({ ...getDefaultSettingsRecord(), ...(JSON.parse(saved) as ItemRecord) });
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    window.localStorage.setItem(densityStorageKey, density);
  }, [density]);

  useEffect(() => {
    if (!drawerOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  useEffect(() => {
    setEditingId(null);
    setDraft(activeModule.id === "settings" ? settingsToDraft(settings) : getEmptyDraft(activeModule));
    setSearch("");
    if (activeModule.id !== "settings") void loadRecords(activeModule);
  }, [activeModule.id, settings.strapiUrl, settings.apiToken]);

  const records = activeModule.id === "settings" ? [settings] : recordsByModule[activeModule.id] ?? [];
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      activeModule.fields.some((field) =>
        String(record[field.key] ?? "").toLowerCase().includes(query),
      ),
    );
  }, [activeModule.fields, records, search]);

  const stats = useMemo(() => {
    const total = records.length;
    const numericTotal = records.reduce((sum, record) => {
      const price = Number(record.price ?? record.currentPrice ?? record.deposit ?? record.amount ?? 0);
      return Number.isFinite(price) ? sum + price : sum;
    }, 0);
    return { total, numericTotal };
  }, [records]);

  function setModuleRecords(moduleId: string, nextRecords: ItemRecord[]) {
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  }

  function saveSettings(nextSettings: ItemRecord) {
    setSettings(nextSettings);
    window.localStorage.setItem(settingsStorageKey, JSON.stringify(nextSettings));
  }

  async function loadRecords(moduleDef = activeModule) {
    if (moduleDef.id === "settings") return;
    if (!moduleDef.apiPath) {
      setModuleRecords(moduleDef.id, []);
      setToast(`${moduleDef.label} 尚未設定 Strapi collection API 路徑`);
      return;
    }
    if (!hasStrapiConfig(settings)) {
      setModuleRecords(moduleDef.id, []);
      setToast("請先到鋒兄設定填寫 Strapi URL 和 Strapi API Token");
      return;
    }

    setLoading(true);
    try {
      const payload = await strapiRequest(settings, moduleDef.apiPath, "GET");
      const loadedRecords = strapiListToRecords(payload, moduleDef);
      setModuleRecords(moduleDef.id, isToolModule(moduleDef.id) ? loadedRecords.filter((record) => record.toolType === moduleDef.id) : loadedRecords);
      setToast(`已從 Strapi 載入 ${moduleDef.label}`);
    } catch (error) {
      setModuleRecords(moduleDef.id, []);
      setToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveRecord() {
    const missing = activeModule.fields.find((field) => field.required && !String(draft[field.key] ?? "").trim());
    if (missing) {
      setToast(`請先填寫 ${missing.label}`);
      return;
    }

    const normalized = normalizeDraft(draft, activeModule);
    if (activeModule.id === "settings") {
      const nextSettings = {
        ...settings,
        ...normalized,
        id: "settings",
        updatedAt: nowIso(),
      };
      saveSettings(nextSettings);
      setEditingId(null);
      setDraft(settingsToDraft(nextSettings));
      setToast("已儲存 Strapi URL / API Token");
      return;
    }

    if (!activeModule.apiPath) {
      setToast(`${activeModule.label} 尚未設定 Strapi collection API 路徑，無法新增到資料庫`);
      return;
    }
    if (!hasStrapiConfig(settings)) {
      setToast("請先到鋒兄設定填寫 Strapi URL 和 Strapi API Token");
      return;
    }

    setLoading(true);
    if (editingId) {
      try {
        const target = records.find((record) => record.id === editingId);
        await strapiRequest(settings, `${activeModule.apiPath}/${target?._strapiId ?? editingId}`, "PUT", toStrapiData(normalized, activeModule));
        await loadRecords(activeModule);
        setToast(`已更新 Strapi：${getRecordTitle(normalized, activeModule)}`);
      } catch (error) {
        setToast(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await strapiRequest(settings, activeModule.apiPath, "POST", toStrapiData(normalized, activeModule));
        await loadRecords(activeModule);
        setToast(`已新增至 Strapi：${getRecordTitle(normalized, activeModule)}`);
      } catch (error) {
        setToast(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    setEditingId(null);
    setDraft(getEmptyDraft(activeModule));
  }

  function editRecord(record: ItemRecord) {
    setEditingId(record.id);
    setDraft(Object.fromEntries(activeModule.fields.map((field) => [field.key, record[field.key] ?? ""])));
  }

  async function deleteRecord(id: string) {
    const target = records.find((record) => record.id === id);
    if (activeModule.id === "settings") {
      if (!window.confirm("確定要清空 Strapi URL / API Token 設定嗎？")) return;
      const nextSettings = getDefaultSettingsRecord();
      saveSettings(nextSettings);
      setDraft(settingsToDraft(nextSettings));
      setToast("已清空 Strapi 設定");
      return;
    }
    if (!activeModule.apiPath || !target) return;
    const title = getRecordTitle(target, activeModule);
    if (!window.confirm(`確定要從 Strapi 刪除「${title}」嗎？\n\n此操作無法復原。`)) return;

    setLoading(true);
    try {
      await strapiRequest(settings, `${activeModule.apiPath}/${target._strapiId ?? id}`, "DELETE");
      await loadRecords(activeModule);
      setToast(`已從 Strapi 刪除 ${target ? getRecordTitle(target, activeModule) : "資料"}`);
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function resetSeed() {
    if (activeModule.id === "settings") {
      const nextSettings = getDefaultSettingsRecord();
      saveSettings(nextSettings);
      setDraft(settingsToDraft(nextSettings));
      setToast("已重設 Strapi URL / API Token 預設值");
      return;
    }
    if (!activeModule.seedCsv) {
      await loadRecords(activeModule);
      return;
    }
    await importRows(parseCsv(activeModule.seedCsv), activeModule, "範例資料");
  }

  async function importCsv(file: File) {
    const text = await file.text();
    await importRows(parseCsv(text), activeModule, file.name);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function importRows(rows: Record<string, string>[], moduleDef: ModuleDef, label: string) {
    if (moduleDef.id === "settings") {
      const imported = rowsToRecords(rows, moduleDef)[0];
      if (imported) {
        saveSettings({ ...settings, ...imported, id: "settings", updatedAt: nowIso() });
        setToast(`已匯入 Strapi 設定：${label}`);
      }
      return;
    }
    if (!moduleDef.apiPath) {
      setToast(`${moduleDef.label} 尚未設定 Strapi collection API 路徑，無法匯入資料庫`);
      return;
    }
    if (!hasStrapiConfig(settings)) {
      setToast("請先到鋒兄設定填寫 Strapi URL 和 Strapi API Token");
      return;
    }

    setLoading(true);
    setImportProgress({ label, current: 0, total: rows.length });
    try {
      for (const [index, row] of rows.entries()) {
        const normalized = normalizeDraft(row, moduleDef);
        await strapiRequest(settings, moduleDef.apiPath, "POST", toStrapiData(normalized, moduleDef));
        const current = index + 1;
        setImportProgress({ label, current, total: rows.length });
        setToast(`正在匯入 ${moduleDef.label}：${current} / ${rows.length}`);
      }
      await loadRecords(moduleDef);
      setToast(`已匯入 ${rows.length} 筆 CSV 至 Strapi：${moduleDef.label}`);
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setImportProgress(null);
      setLoading(false);
    }
  }

  async function testStrapiConnection() {
    const testSettings = activeModule.id === "settings"
      ? { ...settings, ...normalizeDraft(draft, activeModule), id: "settings", updatedAt: nowIso() }
      : settings;

    if (!hasStrapiConfig(testSettings)) {
      setToast("請先填寫 Strapi URL 和 Strapi API Token");
      return;
    }

    setLoading(true);
    try {
      const payload = await strapiRequest(testSettings, "subscriptions", "GET");
      const count = Array.isArray((payload as { data?: unknown })?.data)
        ? (payload as { data: unknown[] }).data.length
        : 0;
      setToast(`Strapi 連線成功：Subscription API 可讀取，目前回傳 ${count} 筆`);
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function uploadMediaFile(file: File) {
    if (!hasStrapiConfig(settings)) {
      setToast("請先到鋒兄設定填寫 Strapi URL 和 Strapi API Token");
      return;
    }

    setLoading(true);
    setToast(`正在上傳${getUploadKind(activeModule.id)}：${file.name}`);
    try {
      const uploaded = await strapiUploadFile(settings, file);
      const url = getStrapiAssetUrl(settings, String(uploaded.url ?? ""));
      setDraft((prev) => ({
        ...prev,
        name: String(prev.name || file.name.replace(/\.[^.]+$/, "")),
        file: url,
        cover: url,
        filetype: normalizeFileType(uploaded, file),
        hash: String(uploaded.hash ?? ""),
        fileSize: activeModule.id === "video" ? getUploadedFileSize(uploaded, file) : prev.fileSize ?? 0,
      }));
      setToast(`${getUploadKind(activeModule.id)}上傳成功：${file.name}`);
    } catch (error) {
      setToast(getErrorMessage(error));
    } finally {
      setLoading(false);
      if (mediaUploadRef.current) mediaUploadRef.current.value = "";
    }
  }

  function selectModule(item: ModuleDef) {
    setActiveId(item.children?.length ? item.children[0].id : item.id);
    setDrawerOpen(false);
  }

  function selectModuleId(id: string) {
    setActiveId(id);
    setDrawerOpen(false);
  }

  function exportCsv() {
    const csv = toCsv(records, activeModule.fields.map((field) => field.key));
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `appwrite-${activeModule.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`已匯出 ${records.length} 筆 ${activeModule.label}`);
  }

  return (
    <main className="app-shell">
      <nav className="rail-nav" aria-label="鋒兄模組">
        <div className="rail-head">
          <div className="brand-mark">鋒</div>
        </div>
        <div className="rail-list">
          {modulesWithToolConfig.map((item) => (
            <button
              key={item.id}
              type="button"
              className={isBranchActive(item, activeId) ? "rail-item active" : "rail-item"}
              title={item.subtitle}
              onClick={() => selectModule(item)}
            >
              {item.icon}
              <span>{shortLabel(item.label)}</span>
            </button>
          ))}
        </div>
        <div className="rail-foot">
          <button type="button" className="rail-item" onClick={() => setDrawerOpen(true)}>
            <LayoutGrid />
            <span>全部</span>
          </button>
        </div>
      </nav>

      <div className="shell-main">
        <header className="top-nav">
          <div className="top-nav-row">
            <div className="brand">
              <div className="brand-mark">鋒</div>
              <div>
                <h1>鋒兄資料庫</h1>
                <p>Remix CRUD Console</p>
              </div>
            </div>
            <nav className="top-nav-tabs" aria-label="鋒兄模組">
              {modulesWithToolConfig.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={isBranchActive(item, activeId) ? "nav-tab active" : "nav-tab"}
                  onClick={() => selectModule(item)}
                >
                  {item.icon}
                  {shortLabel(item.label)}
                </button>
              ))}
            </nav>
            <DesignCluster theme={theme} density={density} onTheme={setTheme} onDensity={setDensity} />
          </div>
          {activeParent?.children?.length ? (
            <div className="top-subnav">
              <div className="top-subnav-row">
                {activeParent.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={child.id === activeId ? "nav-tab compact active" : "nav-tab compact"}
                    onClick={() => setActiveId(child.id)}
                  >
                    {child.icon}
                    {child.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <header className="mobile-bar">
          <div className="brand">
            <div className="brand-mark">鋒</div>
            <div>
              <h1>鋒兄資料庫</h1>
              <p>{activeModule.label}</p>
            </div>
          </div>
          <DesignCluster theme={theme} density={density} onTheme={setTheme} onDensity={setDensity} />
        </header>

        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="eyeline">配合 Strapihuang1988pioneer，參考 fengbroaiappwrite</p>
              <h2>{activeModule.label}</h2>
              <p>{activeModule.subtitle}</p>
            </div>
            <div className="top-actions">
              <button className="ghost-button" type="button" onClick={resetSeed}>
                <RefreshCcw size={16} />
                {activeModule.id === "settings" ? "重設設定" : activeModule.seedCsv ? "匯入範例" : "重新載入"}
              </button>
              <button className="primary-button" type="button" onClick={() => setDraft(getEmptyDraft(activeModule))}>
                <Plus size={16} />
                新增
              </button>
            </div>
          </header>

          <section className="stats-strip" aria-label="資料統計">
            <Metric label="資料筆數" value={String(stats.total)} />
            <Metric label="數值合計" value={formatNumber(stats.numericTotal)} />
            <Metric label="欄位數" value={String(activeModule.fields.length)} />
            <Metric label="CSV" value="匯入 / 匯出" />
          </section>

          {isToolModule(activeModule.id) ? (
            <LiveToolWorkspaceReplica moduleId={activeModule.id} draft={draft} records={records} setActiveId={setActiveId} setDraft={setDraft} setToast={setToast} />
          ) : null}

          <section className="content-grid">
            <aside className="editor-panel">
              <div className="editor-head">
                <div>
                  <h3>{editingId ? "編輯資料" : "新增資料"}</h3>
                  <p>{activeModule.label} 欄位會跟 CSV 表頭一致保存。</p>
                </div>
                <span className="status-pill">
                  <Check size={14} />
                  {activeModule.id === "settings" ? "Local" : "Strapi"}
                </span>
              </div>

              <div className="form-grid">
                {activeModule.fields.map((field) => (
                  <label key={field.key} className={field.type === "textarea" ? "field field-wide" : "field"}>
                    <span>{field.label}</span>
                    <FieldInput
                      field={field}
                      value={draft[field.key] ?? ""}
                      onChange={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
                    />
                  </label>
                ))}
              </div>
              {activeModule.id === "image" && String(draft.file ?? "").trim() ? (
                <div className="image-preview-panel">
                  <span>圖片預覽</span>
                  <img src={String(draft.file)} alt={String(draft.name || "鋒兄圖片預覽")} />
                </div>
              ) : null}

              {activeModule.id === "video" && String(draft.file ?? "").trim() ? (
                <div className="image-preview-panel">
                  <span>影片預覽</span>
                  <video src={String(draft.file)} controls preload="metadata" />
                </div>
              ) : null}

              {isAudioModule(activeModule.id) && String(draft.file ?? "").trim() ? (
                <div className="image-preview-panel">
                  <span>音樂預覽</span>
                  <audio src={String(draft.file)} controls preload="metadata" />
                </div>
              ) : null}

              {activeModule.id === "document" && String(draft.file ?? "").trim() ? (
                <div className="image-preview-panel">
                  <span>檔案預覽</span>
                  <DocumentPreview url={String(draft.file)} filetype={String(draft.filetype ?? "")} title={String(draft.name ?? "鋒兄文件")} large />
                </div>
              ) : null}

              <div className="editor-actions">
                {isUploadModule(activeModule.id) ? (
                  <>
                    <input
                      ref={mediaUploadRef}
                      className="file-input"
                      type="file"
                      accept={getUploadAccept(activeModule.id)}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadMediaFile(file);
                      }}
                    />
                    <button className="tool-button" type="button" onClick={() => mediaUploadRef.current?.click()} disabled={loading}>
                      <Upload size={16} />
                      上傳{getUploadKind(activeModule.id)}
                    </button>
                  </>
                ) : null}
                <button className="primary-button" type="button" onClick={saveRecord} disabled={loading}>
                  {loading ? "處理中..." : editingId ? "儲存修改" : "建立資料"}
                </button>
                {activeModule.id === "settings" ? (
                  <button className="tool-button" type="button" onClick={testStrapiConnection} disabled={loading}>
                    測試連線
                  </button>
                ) : null}
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(getEmptyDraft(activeModule));
                  }}
                >
                  清空
                </button>
              </div>

              <div className="csv-note">
                <strong>Appwrite CSV 相容</strong>
                <span>支援雙引號、多行備註、UTF-8 BOM 匯出，方便與既有 Appwrite CSV 往返。</span>
              </div>
            </aside>

            <div className="table-panel">
              <div className="toolbar">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`搜尋 ${activeModule.label}`}
                  />
                </label>
                <div className="toolbar-actions">
                  <input
                    ref={fileRef}
                    className="file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void importCsv(file);
                    }}
                  />
                  <button type="button" className="tool-button" onClick={() => fileRef.current?.click()} disabled={loading}>
                    <Upload size={16} />
                    匯入 CSV
                  </button>
                  <button type="button" className="tool-button" onClick={exportCsv} disabled={loading}>
                    <Download size={16} />
                    匯出 CSV
                  </button>
                </div>
              </div>
              {importProgress ? (
                <div className="import-progress" role="status" aria-live="polite">
                  <div className="import-progress-label">
                    <span>匯入 {importProgress.label}</span>
                    <strong>{importProgress.current} / {importProgress.total}</strong>
                  </div>
                  <div className="import-progress-track">
                    <div
                      className="import-progress-bar"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {activeModule.fields.slice(0, 6).map((field) => (
                        <th key={field.key}>{field.label}</th>
                      ))}
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.length ? (
                      visibleRecords.map((record) => (
                        <tr key={record.id}>
                          {activeModule.fields.slice(0, 6).map((field) => (
                            <td key={field.key}>{renderCell(record[field.key], field, activeModule)}</td>
                          ))}
                          <td>
                            <div className="row-actions">
                              <button type="button" onClick={() => editRecord(record)} aria-label="編輯">
                                <Pencil size={15} />
                              </button>
                              <button type="button" onClick={() => deleteRecord(record.id)} aria-label="刪除">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={activeModule.fields.slice(0, 6).length + 1} className="empty-cell">
                          尚無資料，請新增或匯入 CSV。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <p className="toast" role="status">{toast}</p>
        </section>
      </div>

      <nav className="dock" aria-label="快速切換">
        {dockModules.map((item) => (
          <button
            key={item.id}
            type="button"
            className={isBranchActive(item, activeId) ? "dock-item active" : "dock-item"}
            onClick={() => selectModule(item)}
          >
            {item.icon}
            <span>{shortLabel(item.label)}</span>
          </button>
        ))}
        <button type="button" className="dock-item" onClick={() => setDrawerOpen(true)}>
          <Menu />
          <span>全部</span>
        </button>
      </nav>

      <div
        className={drawerOpen ? "drawer open" : "drawer"}
        role="presentation"
        onClick={() => setDrawerOpen(false)}
      >
        <div
          className="drawer-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="鋒兄模組"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="drawer-head">
            <div className="brand">
              <div className="brand-mark">鋒</div>
              <div>
                <h1>全部模組</h1>
                <p>{modulesWithToolConfig.length} 個資料模組</p>
              </div>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="關閉模組清單">
              <X size={16} />
            </button>
          </div>
          <nav className="nav-list" aria-label="鋒兄模組清單">
            {modulesWithToolConfig.map((item) => (
              <NavItem key={item.id} item={item} activeId={activeId} onSelect={selectModuleId} />
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}

function NavItem({
  item,
  activeId,
  onSelect,
}: {
  item: ModuleDef;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(item.id === "tools");
  const active = item.id === activeId || Boolean(item.children?.some((child) => child.id === activeId));
  return (
    <div>
      <button
        className={`nav-item ${active ? "active" : ""}`}
        type="button"
        onClick={() => {
          if (item.children?.length) {
            setOpen(true);
            onSelect(item.children[0].id);
            return;
          }
          onSelect(item.id);
        }}
      >
        <span className="nav-icon">{item.icon}</span>
        <span>
          <strong>{item.label}</strong>
          <small>{item.subtitle}</small>
        </span>
        {item.children ? <ChevronDown className={open ? "chevron open" : "chevron"} size={15} /> : null}
      </button>
      {item.children && open ? (
        <div className="subnav">
          {item.children.map((child) => (
            <button
              key={child.id}
              className={`subnav-item ${child.id === activeId ? "active" : ""}`}
              type="button"
              onClick={() => onSelect(child.id)}
            >
              {child.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* Theme and density live in the chrome, not in 鋒兄設定 — they are how the
   console looks, not what it is connected to. */
function DesignCluster({
  theme,
  density,
  onTheme,
  onDensity,
}: {
  theme: ThemeMode;
  density: DensityMode;
  onTheme: (mode: ThemeMode) => void;
  onDensity: (mode: DensityMode) => void;
}) {
  const themes: { mode: ThemeMode; label: string; icon: JSX.Element }[] = [
    { mode: "light", label: "亮色", icon: <Sun size={15} /> },
    { mode: "dark", label: "暗色", icon: <Moon size={15} /> },
    { mode: "system", label: "跟隨系統", icon: <Monitor size={15} /> },
  ];
  const compact = density === "compact";
  return (
    <div className="design-cluster" role="group" aria-label="外觀">
      {themes.map((item) => (
        <button
          key={item.mode}
          type="button"
          className={theme === item.mode ? "active" : ""}
          aria-label={item.label}
          aria-pressed={theme === item.mode}
          title={item.label}
          onClick={() => onTheme(item.mode)}
        >
          {item.icon}
        </button>
      ))}
      <button
        type="button"
        className={compact ? "active" : ""}
        aria-label={compact ? "切換為寬鬆密度" : "切換為緊湊密度"}
        aria-pressed={compact}
        title={compact ? "緊湊密度" : "寬鬆密度"}
        onClick={() => onDensity(compact ? "comfortable" : "compact")}
      >
        {compact ? <Rows4 size={15} /> : <Rows2 size={15} />}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ToolWorkspace({
  moduleId,
  draft,
  records,
  setActiveId,
  setDraft,
  setToast,
}: {
  moduleId: string;
  draft: Record<string, string | number | boolean>;
  records: ItemRecord[];
  setActiveId: Dispatch<SetStateAction<string>>;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  setToast: Dispatch<SetStateAction<string>>;
}) {
  const preset = getToolPreset(moduleId);
  if (!preset) return null;
  const toolPreset = preset;
  const query = String(draft.queryText ?? toolPreset.defaultQuery);

  function applyQuery(nextQuery = query) {
    setDraft((prev) => ({
      ...prev,
      toolType: moduleId,
      queryText: nextQuery,
      title: nextQuery || toolPreset.title,
      source: toolPreset.defaultSource,
      resultUrl: toolPreset.links[0]?.url(nextQuery) || "",
      notice: String(prev.notice || toolPreset.notice),
    }));
  }

  function openLink(link: ToolLink) {
    const nextQuery = query.trim() || toolPreset.defaultQuery;
    applyQuery(nextQuery);
    window.open(link.url(nextQuery), "_blank", "noopener,noreferrer");
    setToast(`已開啟 ${link.label}：${nextQuery}`);
  }

  return (
    <section className="tool-workspace">
      <div className="tool-tabs" aria-label="鋒兄工具">
        {(["price", "phone-price", "tube", "finance"] as const).map((id) => {
          const tabPreset = getToolPreset(id);
          return (
            <button key={id} type="button" className={moduleId === id ? "active" : ""} onClick={() => setActiveId(id)}>
              {tabPreset?.title ?? id}
            </button>
          );
        })}
      </div>
      <div className="tool-workspace-head">
        <div>
          <small>{toolPreset.badge}</small>
          <strong>{toolPreset.title}</strong>
          <p>{toolPreset.description}</p>
        </div>
        <span>更新：{new Date().toLocaleString("zh-TW")}</span>
      </div>
      <div className="tool-query-row">
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((prev) => ({ ...prev, toolType: moduleId, queryText: value }));
            }}
            onBlur={() => applyQuery()}
            placeholder={toolPreset.placeholder}
          />
        </label>
        <button type="button" className="primary-button" onClick={() => applyQuery()}>
          <Check size={16} />
          套用
        </button>
      </div>
      <div className="tool-link-grid">
        {toolPreset.links.map((link) => (
          <button key={link.label} type="button" className="tool-link-card" onClick={() => openLink(link)}>
            <ExternalLink size={16} />
            <span>{link.label}</span>
            <small>{link.hint}</small>
          </button>
        ))}
      </div>
      <ToolShowcase moduleId={moduleId} query={query} records={records} />
    </section>
  );
}

function ToolShowcase({ moduleId, query, records }: { moduleId: string; query: string; records: Array<Record<string, any>> }) {
  if (moduleId === "phone-price") return <PhonePriceShowcase records={records} />;
  if (moduleId === "tube") return <TubeShowcase records={records} query={query} />;
  if (moduleId === "finance") return <FinanceShowcase records={records} />;
  return <PriceCompareShowcase records={records} query={query} />;
}

function toolValue(row: unknown, key: string) {
  return (row as Record<string, unknown>)[key];
}

function PriceCompareShowcase({ records, query }: { records: Array<Record<string, any>>; query: string }) {
  const latest = records[0];
  return (
    <div className="tool-showcase amber">
      <div className="recent-links">
        <strong>最近連結</strong>
        <span>{records.length} 筆</span>
      </div>
      <div className="tool-mini-grid">
        {(records.length ? records.slice(0, 2) : [{ title: query || "PChome 商品", resultUrl: "https://24h.pchome.com.tw/" }]).map((record, index) => (
          <a key={String(toolValue(record, "id") ?? index)} className="tool-pill-row" href={String(toolValue(record, "resultUrl") || "#")} target="_blank" rel="noreferrer">
            <strong>{String(record.title || record.queryText || query || "商品查詢")}</strong>
            <small>{String(record.resultUrl || record.source || "尚未建立結果 URL")}</small>
          </a>
        ))}
      </div>
      <div className="price-result-card">
        <div>
          <strong>{String(latest?.title || query || "比價結果")}</strong>
          <p>{String(latest?.source || "BigGo / PChome / momo")}</p>
        </div>
        <span>{formatNumber(Number(latest?.currentPrice || 0)) || "--"}</span>
      </div>
    </div>
  );
}

function PhonePriceShowcase({ records }: { records: Array<Record<string, any>> }) {
  const rows = records.length ? records.slice(0, 4) : [
    { title: "iPhone 17", currentPrice: 0, lowPrice: 0, source: "Apple" },
    { title: "Samsung A17", currentPrice: 4990, lowPrice: 4990, source: "Samsung" },
    { title: "Samsung A17 6G 128GB", currentPrice: 4990, lowPrice: 4990, source: "Samsung" },
  ];
  const max = Math.max(...rows.map((row) => Number(row.currentPrice || row.lowPrice || 1)), 1);
  return (
    <div className="tool-showcase phone">
      <div className="phone-query-grid">
        <div>
          <strong>蘋果手機區塊</strong>
          <p>預設查詢：iPhone 17</p>
        </div>
        <div>
          <strong>三星手機區塊</strong>
          <p>預設查詢：Samsung 26 / Samsung A17</p>
        </div>
      </div>
      <div className="chart-card">
        <strong>地標網通 vs 傑昇通信</strong>
        {rows.map((row, index) => {
          const price = Number(row.currentPrice || row.lowPrice || 0);
          return (
            <div key={String(row.id ?? index)} className="chart-row">
              <span>{String(row.title || row.queryText || "手機")}</span>
              <div><i style={{ width: `${Math.max(6, (price / max) * 100)}%` }} /></div>
              <b>{price ? `NT$ ${formatNumber(price)}` : "最低價"}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TubeShowcase({ records, query }: { records: Array<Record<string, any>>; query: string }) {
  const rows = records.length ? records.slice(0, 8) : [
    { title: "張內咸脫口秀", source: "YouTube", resultUrl: "https://www.youtube.com/results?search_query=%E9%8B%92%E5%85%84" },
    { title: "Sun Channel 最新影片", source: "YouTube", resultUrl: "https://www.youtube.com/" },
    { title: query || "鋒兄 Tube 追蹤", source: "Bilibili", resultUrl: "https://search.bilibili.com/" },
  ];
  return (
    <div className="tool-showcase tube">
      <div className="tube-alert">
        <strong>3 天內新影片：{rows.length} 部</strong>
      </div>
      <div className="tube-list">
        {rows.map((row, index) => (
          <a key={String(row.id ?? index)} href={String(row.resultUrl || "#")} target="_blank" rel="noreferrer">
            <strong>{String(row.title || row.queryText || "影片")}</strong>
            <small>{String(row.source || "YouTube")} / {String(row.notice || "追蹤中")}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function FinanceShowcase({ records }: { records: Array<Record<string, any>> }) {
  const rows = records.length ? records.slice(0, 6) : [
    { title: "加權指數", queryText: "^TWII", currentPrice: 44169, highPrice: 46552, lowPrice: 21551, source: "Yahoo" },
    { title: "台積電", queryText: "2330.TW", currentPrice: 2310, highPrice: 2440, lowPrice: 1015, source: "Yahoo" },
    { title: "Shiller PE Ratio", queryText: "CAPE", currentPrice: 41, highPrice: 44, lowPrice: 0, source: "Multpl" },
  ];
  return (
    <div className="tool-showcase finance">
      <div className="finance-hero">
        <div>
          <strong>Shiller PE Ratio</strong>
          <p>Max: 44.19 (Dec 1999)</p>
        </div>
        <span>{formatNumber(Number(rows.at(-1)?.currentPrice || 41))}</span>
      </div>
      <div className="finance-grid">
        {rows.map((row, index) => (
          <div key={String(row.id ?? index)} className="finance-card">
            <small>{String(row.source || "Yahoo")}</small>
            <strong>{String(row.title || row.queryText || "Quote")}</strong>
            <b>{formatNumber(Number(row.currentPrice || 0))}</b>
            <p>52W High {formatNumber(Number(row.highPrice || 0))} / Low {formatNumber(Number(row.lowPrice || 0))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolWorkspaceReplica({
  moduleId,
  draft,
  records,
  setActiveId,
  setDraft,
  setToast,
}: {
  moduleId: string;
  draft: Record<string, string | number | boolean>;
  records: ItemRecord[];
  setActiveId: Dispatch<SetStateAction<string>>;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  setToast: Dispatch<SetStateAction<string>>;
}) {
  const preset = getToolPreset(moduleId);
  if (!preset) return null;
  const toolPreset = preset;
  const moduleIcon = moduleMap.get(moduleId)?.icon ?? <Wrench />;
  const query = String(draft.queryText ?? toolPreset.defaultQuery);

  function applyQuery(nextQuery = query) {
    setDraft((prev) => ({
      ...prev,
      toolType: moduleId,
      queryText: nextQuery,
      title: nextQuery || toolPreset.title,
      source: toolPreset.defaultSource,
      resultUrl: toolPreset.links[0]?.url(nextQuery) || "",
      notice: String(prev.notice || toolPreset.notice),
    }));
  }

  function openToolLink(link: ToolLink) {
    const nextQuery = query.trim() || toolPreset.defaultQuery;
    applyQuery(nextQuery);
    window.open(link.url(nextQuery), "_blank", "noopener,noreferrer");
    setToast(`已開啟 ${link.label}：${nextQuery}`);
  }

  return (
    <section className={`tool-workspace replica tool-${moduleId}`}>
      <div className="tool-tabs" aria-label="鋒兄工具">
        {(["price", "phone-price", "tube", "finance"] as const).map((id) => {
          const tabPreset = getToolPreset(id);
          return (
            <button key={id} type="button" className={moduleId === id ? "active" : ""} onClick={() => setActiveId(id)}>
              {tabPreset?.title ?? id}
            </button>
          );
        })}
      </div>
      <div className="tool-workspace-head">
        <span className="tool-mode-icon">{moduleIcon}</span>
        <div>
          <small>{toolPreset.badge}</small>
          <strong>{toolPreset.title}</strong>
          <p>{toolPreset.description}</p>
        </div>
        <span className="tool-update-pill">更新：{new Date().toLocaleString("zh-TW")}</span>
      </div>
      {moduleId === "phone-price" ? (
        <ReplicaPhone records={records} query={query} setDraft={setDraft} applyQuery={applyQuery} />
      ) : moduleId === "tube" ? (
        <ReplicaTube records={records} query={query} preset={toolPreset} openToolLink={openToolLink} />
      ) : moduleId === "finance" ? (
        <ReplicaFinance records={records} preset={toolPreset} openToolLink={openToolLink} />
      ) : (
        <ReplicaPrice records={records} query={query} preset={toolPreset} setDraft={setDraft} applyQuery={applyQuery} openToolLink={openToolLink} />
      )}
    </section>
  );
}

function ReplicaPrice({
  records,
  query,
  preset,
  setDraft,
  applyQuery,
  openToolLink,
}: {
  records: Array<Record<string, any>>;
  query: string;
  preset: ToolPreset;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  applyQuery: (nextQuery?: string) => void;
  openToolLink: (link: ToolLink) => void;
}) {
  const latest = records[0];
  const title = String(latest?.title || latest?.queryText || query || "PChome 商品 DRAHC0-A900J8363");
  const source = String(latest?.source || preset.defaultSource || "BigGo API");
  const current = Number(latest?.currentPrice || latest?.lowPrice || 10735);
  const high = Number(latest?.highPrice || current);
  const low = Number(latest?.lowPrice || current);
  const recent = records.length ? records.slice(0, 2) : [
    { title: "PChome 商品 DRAHC0-A900J8363", resultUrl: "https://24h.pchome.com.tw/prod/DRAHC0-A900J8363" },
    { title: "PChome 商品 DYALS1-A900JUGXV", resultUrl: "https://24h.pchome.com.tw/prod/DYALS1-A900JUGXV" },
  ];

  return (
    <div className="tool-showcase amber replica-showcase">
      <div className="price-search-shell">
        <label>商品網址</label>
        <div className="replica-query-row">
          <input
            value={query}
            onChange={(event) => setDraft((prev) => ({ ...prev, toolType: "price", queryText: event.target.value }))}
            onBlur={() => applyQuery()}
            placeholder={preset.placeholder}
          />
          <button type="button" onClick={() => applyQuery()}>
            <Search size={16} />
            查詢歷史價格
          </button>
        </div>
        <div className="tool-source-grid">
          {preset.links.slice(0, 2).map((link) => (
            <button key={link.label} type="button" className="tool-source-card" onClick={() => openToolLink(link)}>
              <strong>{link.label}</strong>
              <small>{link.hint}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="replica-section">
        <div className="section-caption">
          <strong>最近連結</strong>
          <span>{recent.length} 筆</span>
        </div>
        <div className="tool-mini-grid">
          {recent.map((record, index) => (
            <a key={String(toolValue(record, "id") ?? index)} className="tool-pill-row" href={String(toolValue(record, "resultUrl") || "#")} target="_blank" rel="noreferrer">
              <strong>{String(record.title || record.queryText || title)}</strong>
              <small>{String(record.resultUrl || record.source || "商品 URL")}</small>
            </a>
          ))}
        </div>
      </div>
      <div className="replica-section">
        <div className="section-caption">
          <strong>比價結果</strong>
          <a href={String(latest?.resultUrl || "#")} target="_blank" rel="noreferrer">開啟商品 <ExternalLink size={12} /></a>
        </div>
        <div className="price-result-card">
          <div>
            <strong>{title}</strong>
            <p>來源：{source}{latest?.notice ? `，${String(latest.notice)}` : ""}</p>
          </div>
          <span>{formatNumber(current)} TWD</span>
        </div>
        <div className="price-stat-grid">
          <Metric label="現在價格" value={`${formatNumber(current)} TWD`} />
          <Metric label="歷史最高" value={`${formatNumber(high)} TWD`} />
          <Metric label="歷史最低" value={`${formatNumber(low)} TWD`} />
        </div>
        <div className="price-trend-card">
          <div className="section-caption">
            <strong>Price Trend / 歷史價格走勢</strong>
            <span>{formatNumber(current)} TWD</span>
          </div>
          <div className="trend-canvas"><i /></div>
        </div>
      </div>
    </div>
  );
}

function ReplicaPhone({
  records,
  query,
  setDraft,
  applyQuery,
}: {
  records: Array<Record<string, any>>;
  query: string;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  applyQuery: (nextQuery?: string) => void;
}) {
  const rows = records.length ? records.slice(0, 4) : [
    { title: "iPhone 17", currentPrice: 0, lowPrice: 0, source: "Apple" },
    { title: "Samsung A17", currentPrice: 4990, lowPrice: 4990, source: "Samsung" },
    { title: "Samsung A17 6G 128GB", currentPrice: 4990, lowPrice: 4990, source: "Samsung" },
  ];
  const max = Math.max(...rows.map((row) => Number(row.currentPrice || row.lowPrice || 1)), 1);
  const samsungRows = rows.filter((row) => String(row.title || row.source).toLowerCase().includes("samsung")).slice(0, 2);

  return (
    <div className="tool-showcase phone replica-showcase">
      <div className="phone-query-grid">
        <ReplicaPhoneQuery
          title="蘋果手機區塊"
          note="預設查詢：iPhone 17，每年九月切換新基準。"
          value={query || "iPhone 17"}
          button="搜尋蘋果"
          onChange={(value) => setDraft((prev) => ({ ...prev, toolType: "phone-price", queryText: value }))}
          onSearch={() => applyQuery(query || "iPhone 17")}
        />
        <ReplicaPhoneQuery
          title="三星手機區塊"
          note="預設查詢：Samsung 26，三月前用去年末兩碼。"
          value="Samsung 26"
          button="搜尋三星"
          onSearch={() => applyQuery("Samsung 26")}
        />
      </div>
      <div className="chart-card">
        <small>LANDTOP CHART</small>
        <strong>地標網通 vs 傑昇通信</strong>
        {rows.map((row, index) => {
          const price = Number(row.currentPrice || row.lowPrice || 0);
          return (
            <div key={String(row.id ?? index)} className="chart-row">
              <span>{String(row.title || row.queryText || "手機")}</span>
              <div><i style={{ width: `${Math.max(6, (price / max) * 100)}%` }} /><em style={{ width: `${Math.max(6, (Number(row.lowPrice || price) / max) * 100)}%` }} /></div>
              <b>{price ? `NT$ ${formatNumber(price)}` : "暫無價格"}</b>
            </div>
          );
        })}
      </div>
      <ReplicaPhoneProducts title="蘋果手機區塊" rows={[]} emptyText="目前沒有這個區塊的比價結果。" />
      <ReplicaPhoneProducts title="三星手機區塊" rows={samsungRows.length ? samsungRows : rows.slice(1)} emptyText="" />
      <div className="phone-history-card">
        <div className="section-caption">
          <strong>Weekly History / 地標網通歷史價格</strong>
          <span>最高 NT$ 4,990 / 最低 NT$ 4,990</span>
        </div>
        <div className="line-chart"><i /></div>
      </div>
    </div>
  );
}

function ReplicaPhoneQuery({
  title,
  note,
  value,
  button,
  onChange,
  onSearch,
}: {
  title: string;
  note: string;
  value: string;
  button: string;
  onChange?: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="phone-query-card">
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <div className="inline-query">
        <input value={value} readOnly={!onChange} onChange={(event) => onChange?.(event.target.value)} />
        <button type="button" onClick={onSearch}><Search size={16} />{button}</button>
      </div>
    </div>
  );
}

function ReplicaPhoneProducts({ title, rows, emptyText }: { title: string; rows: Array<Record<string, any>>; emptyText: string }) {
  return (
    <div className="phone-product-section">
      <div className="section-caption">
        <strong>{title}</strong>
        <span>收合</span>
      </div>
      {rows.length ? (
        <div className="phone-product-grid">
          {rows.map((row, index) => (
            <div className="phone-product-card" key={String(row.id ?? index)}>
              <strong>{String(row.title || row.queryText || "Samsung A17")}</strong>
              <small>{String(row.source || "SAMSUNG").toUpperCase()}</small>
              <div className="phone-price-pills">
                <span>地標網通 <b>NT$ {formatNumber(Number(row.currentPrice || 4990))}</b></span>
                <span>傑昇通信 <b>{row.lowPrice ? `NT$ ${formatNumber(Number(row.lowPrice))}` : "--"}</b></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-dash">{emptyText}</p>
      )}
    </div>
  );
}

function ReplicaTube({
  records,
  query,
  preset,
  openToolLink,
}: {
  records: Array<Record<string, any>>;
  query: string;
  preset: ToolPreset;
  openToolLink: (link: ToolLink) => void;
}) {
  const rows = records.length ? records.slice(0, 8) : [
    { title: "中共退役軍人訪談：局勢與觀察", source: "吉利小鋪味", resultUrl: "https://www.youtube.com/" },
    { title: "國際新聞快速整理與每日焦點", source: "一個人", resultUrl: "https://www.youtube.com/" },
    { title: query || "鋒兄 Tube 影片清單", source: "Sun Channel", resultUrl: "https://www.youtube.com/" },
  ];
  const cardRows = records.length ? records.slice(0, 10) : rows.concat([
    { title: "張內咸脫口秀精選", source: "張內咸脫口秀", resultUrl: "https://www.youtube.com/" },
    { title: "財經局勢與 AI 新聞", source: "新聞台", resultUrl: "https://www.youtube.com/" },
    { title: "水電與城市生活觀察", source: "鋒兄頻道", resultUrl: "https://www.youtube.com/" },
  ]);
  return (
    <div className="tool-showcase tube replica-showcase">
      <div className="tube-alert">
        <strong>3 天內新影片：{rows.length} 部</strong>
        <button type="button" onClick={() => openToolLink(preset.links[0])}><RefreshCcw size={14} />重新整理</button>
      </div>
      <div className="tube-list">
        {rows.map((row, index) => (
          <a key={String(row.id ?? index)} href={String(row.resultUrl || "#")} target="_blank" rel="noreferrer">
            <strong>{String(row.title || row.queryText || "影片")}</strong>
            <small>{String(row.source || "YouTube")} / {String(row.notice || "06/14 下午")}</small>
          </a>
        ))}
      </div>
      <ReplicaTubeChannel title="吉利小鋪味" rows={cardRows.slice(0, 10)} />
      <ReplicaTubeChannel title="一個人" rows={cardRows.slice(0, 5)} />
    </div>
  );
}

function ReplicaTubeChannel({ title, rows }: { title: string; rows: Array<Record<string, any>> }) {
  return (
    <div className="tube-channel">
      <div className="section-caption">
        <strong>{title}</strong>
        <span>{rows.length} 部影片</span>
      </div>
      <div className="tube-card-grid">
        {rows.map((row, index) => (
          <a className="tube-video-card" key={String(row.id ?? `${title}-${index}`)} href={String(row.resultUrl || "#")} target="_blank" rel="noreferrer">
            <div className="tube-thumb"><Film size={22} /><span>{String(row.source || "YouTube")}</span></div>
            <strong>{String(row.title || row.queryText || "鋒兄 Tube 影片")}</strong>
            <small>{String(row.source || "YouTube")} / {String(row.notice || "06/14 下午")}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function ReplicaFinance({ records, preset, openToolLink }: { records: Array<Record<string, any>>; preset: ToolPreset; openToolLink: (link: ToolLink) => void }) {
  const rows = records.length ? records.slice(0, 14) : [
    { title: "加權指數", queryText: "^TWII", currentPrice: 44169, highPrice: 46552, lowPrice: 21551, source: "Yahoo" },
    { title: "台積電", queryText: "2330.TW", currentPrice: 2310, highPrice: 2440, lowPrice: 1015, source: "Yahoo" },
    { title: "Shiller PE Ratio", queryText: "CAPE", currentPrice: 41, highPrice: 44, lowPrice: 0, source: "Multpl" },
    { title: "Dow Jones Industrial Average", queryText: "DJIA", currentPrice: 51202, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "S&P 500 Index", queryText: "SPX", currentPrice: 7431, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "NASDAQ Composite", queryText: "IXIC", currentPrice: 25888, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "日經 225", queryText: "N225", currentPrice: 66020, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "KOSPI Index", queryText: "KOSPI", currentPrice: 3123, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "三豐電子", queryText: "SAMSUNG", currentPrice: 322500, highPrice: 0, lowPrice: 0, source: "Yahoo" },
    { title: "SK 海力士", queryText: "SK", currentPrice: 215000, highPrice: 0, lowPrice: 0, source: "Yahoo" },
    { title: "美金兌新台幣", queryText: "USD/TWD", currentPrice: 31.61, highPrice: 0, lowPrice: 0, source: "Yahoo" },
    { title: "美元兌日圓", queryText: "USD/JPY", currentPrice: 160.19, highPrice: 0, lowPrice: 0, source: "Yahoo" },
    { title: "Crude Oil", queryText: "CL", currentPrice: 87.33, highPrice: 0, lowPrice: 0, source: "CNBC" },
    { title: "Gold COMEX", queryText: "GC", currentPrice: 4239.9, highPrice: 0, lowPrice: 0, source: "CNBC" },
  ];
  const shiller = rows.find((row) => String(row.title).includes("Shiller")) || rows[2];
  return (
    <div className="tool-showcase finance replica-showcase">
      <div className="finance-hero">
        <div>
          <strong>Shiller PE Ratio</strong>
          <p>Max: 44.19 (Dec 1999)</p>
        </div>
        <button type="button" onClick={() => openToolLink(preset.links[0])}><RefreshCcw size={14} />重新整理</button>
        <span>{formatNumber(Number(shiller?.currentPrice || 41))}</span>
      </div>
      <ReplicaFinanceGroup title="台股" rows={rows.slice(0, 2)} />
      <ReplicaFinanceGroup title="美股指數" rows={rows.slice(3, 6)} />
      <ReplicaFinanceGroup title="估值" rows={[shiller]} />
      <ReplicaFinanceGroup title="亞洲" rows={rows.slice(6, 8)} />
      <ReplicaFinanceGroup title="韓國" rows={rows.slice(8, 10)} />
      <ReplicaFinanceGroup title="匯率" rows={rows.slice(10, 12)} />
      <ReplicaFinanceGroup title="商品" rows={rows.slice(12, 14)} />
    </div>
  );
}

function ReplicaFinanceGroup({ title, rows }: { title: string; rows: Array<Record<string, any> | undefined> }) {
  return (
    <div className="finance-section">
      <div className="section-caption">
        <strong>{title}</strong>
        <span>{rows.filter(Boolean).length} 項</span>
      </div>
      <div className="finance-grid">
        {rows.filter(Boolean).map((row, index) => (
          <div key={String(row?.id ?? `${title}-${index}`)} className="finance-card">
            <small>{String(row?.source || "Yahoo")}</small>
            <strong>{String(row?.title || row?.queryText || "Quote")}</strong>
            <b>{formatNumber(Number(row?.currentPrice || 0))}<em>{String(row?.queryText || "")}</em></b>
            <p>52W High {formatNumber(Number(row?.highPrice || 0)) || "--"} / 52W Low {formatNumber(Number(row?.lowPrice || 0)) || "--"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveToolWorkspaceReplica({
  moduleId,
  draft,
  records,
  setActiveId,
  setDraft,
  setToast,
}: {
  moduleId: string;
  draft: Record<string, string | number | boolean>;
  records: ItemRecord[];
  setActiveId: Dispatch<SetStateAction<string>>;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  setToast: Dispatch<SetStateAction<string>>;
}) {
  const preset = getToolPreset(moduleId);
  if (!preset) return null;
  const activePreset = preset;
  const moduleIcon = moduleMap.get(moduleId)?.icon ?? <Wrench />;
  const query = String(draft.queryText ?? activePreset.defaultQuery);

  function applyQuery(nextQuery = query) {
    setDraft((prev) => ({
      ...prev,
      toolType: moduleId,
      queryText: nextQuery,
      title: nextQuery || activePreset.title,
      source: activePreset.defaultSource,
      resultUrl: activePreset.links[0]?.url(nextQuery) || "",
      notice: String(prev.notice || activePreset.notice),
    }));
  }

  function openToolLink(link: ToolLink) {
    const nextQuery = query.trim() || activePreset.defaultQuery;
    applyQuery(nextQuery);
    window.open(link.url(nextQuery), "_blank", "noopener,noreferrer");
    setToast(`已開啟 ${link.label}：${nextQuery}`);
  }

  return (
    <section className={`tool-workspace replica tool-${moduleId}`}>
      <div className="tool-tabs" aria-label="鋒兄工具">
        {(["price", "phone-price", "tube", "finance"] as const).map((id) => {
          const tabPreset = getToolPreset(id);
          return (
            <button key={id} type="button" className={moduleId === id ? "active" : ""} onClick={() => setActiveId(id)}>
              {tabPreset?.title ?? id}
            </button>
          );
        })}
      </div>
      <div className="tool-workspace-head">
        <span className="tool-mode-icon">{moduleIcon}</span>
        <div>
          <small>{activePreset.badge}</small>
          <strong>{activePreset.title}</strong>
          <p>{activePreset.description}</p>
        </div>
        <span className="tool-update-pill">Live API</span>
      </div>
      {moduleId === "phone-price" ? (
        <LiveReplicaPhone records={records} query={query} setDraft={setDraft} applyQuery={applyQuery} />
      ) : moduleId === "tube" ? (
        <LiveReplicaTube records={records} query={query} preset={activePreset} openToolLink={openToolLink} />
      ) : moduleId === "finance" ? (
        <LiveReplicaFinance records={records} preset={activePreset} openToolLink={openToolLink} />
      ) : (
        <LiveReplicaPrice records={records} query={query} preset={activePreset} setDraft={setDraft} applyQuery={applyQuery} openToolLink={openToolLink} />
      )}
    </section>
  );
}

function LiveReplicaPrice({
  records,
  query,
  preset,
  setDraft,
  applyQuery,
  openToolLink,
}: {
  records: Array<Record<string, any>>;
  query: string;
  preset: ToolPreset;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  applyQuery: (nextQuery?: string) => void;
  openToolLink: (link: ToolLink) => void;
}) {
  const [result, setResult] = useState<PriceToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = summarizePriceHistory(result?.history ?? []);
  const recent = records.slice(0, 4);

  async function loadPrice(nextQuery = query || "https://24h.pchome.com.tw/prod/DRAHGT-A900GOJVX") {
    const productUrl = nextQuery.trim();
    if (!productUrl) return;
    applyQuery(productUrl);
    setLoading(true);
    setError("");
    try {
      const payload = await fetchToolJson<PriceToolResult>("/api/resolve", { url: productUrl, source: "biggo-api", days: 3650 });
      setResult(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrice();
  }, []);

  return (
    <div className="tool-showcase amber replica-showcase">
      <div className="price-search-shell">
        <label>商品網址</label>
        <div className="replica-query-row">
          <input
            value={query}
            onChange={(event) => setDraft((prev) => ({ ...prev, toolType: "price", queryText: event.target.value }))}
            onBlur={() => applyQuery(query)}
            placeholder={preset.placeholder}
          />
          <button type="button" onClick={() => loadPrice()}>
            <Search size={16} />
            {loading ? "查詢中" : "查詢歷史價格"}
          </button>
        </div>
        <div className="tool-source-grid">
          {preset.links.slice(0, 2).map((link) => (
            <button key={link.label} type="button" className="tool-source-card" onClick={() => openToolLink(link)}>
              <strong>{link.label}</strong>
              <small>{link.hint}</small>
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="tool-error">即時比價讀取失敗：{error}</p> : null}
      <div className="replica-section">
        <div className="section-caption">
          <strong>最近連結</strong>
          <span>{recent.length} 筆</span>
        </div>
        {recent.length ? (
          <div className="tool-mini-grid">
            {recent.map((record, index) => (
              <a key={String(toolValue(record, "id") ?? index)} className="tool-pill-row" href={String(toolValue(record, "resultUrl") || toolValue(record, "queryText") || "#")} target="_blank" rel="noreferrer">
                <strong>{String(record.title || record.queryText || "商品連結")}</strong>
                <small>{String(record.resultUrl || record.source || record.queryText || "商品 URL")}</small>
              </a>
            ))}
          </div>
        ) : (
          <p className="empty-dash">尚未有儲存的比價連結，請輸入商品 URL 查詢即時價格。</p>
        )}
      </div>
      <div className="replica-section">
        <div className="section-caption">
          <strong>比價結果</strong>
          {result?.matchedUrl || result?.url ? <a href={result.matchedUrl || result.url} target="_blank" rel="noreferrer">開啟商品 <ExternalLink size={12} /></a> : null}
        </div>
        {result ? (
          <>
            <div className="price-result-card">
              <div>
                <strong>{result.matchedTitle || result.title || "即時商品"}</strong>
                <p>來源：{result.source}，更新：{formatToolDate(result.resolvedAt)}{result.notice ? `，${result.notice}` : ""}</p>
              </div>
              <span>{formatToolMoney(result.currentPrice, result.currency)}</span>
            </div>
            <div className="price-stat-grid">
              <Metric label="目前價格" value={formatToolMoney(result.currentPrice, result.currency)} />
              <Metric label="歷史高點" value={formatToolMoney(history.high, result.currency)} />
              <Metric label="歷史低點" value={formatToolMoney(history.low, result.currency)} />
            </div>
            <div className="price-trend-card">
              <div className="section-caption">
                <strong>Price Trend / 歷史價格走勢</strong>
                <span>{history.change === null ? "尚無變化資料" : `${history.change >= 0 ? "+" : ""}${formatToolMoney(history.change, result.currency)}`}</span>
              </div>
              <div className="trend-canvas">
                {(result.history.length ? result.history : [{ price: result.currentPrice, date: result.resolvedAt }]).map((point, index, points) => {
                  const values = points.map((entry) => entry.price ?? result.currentPrice ?? 0);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const left = points.length <= 1 ? 50 : (index / (points.length - 1)) * 88 + 6;
                  const top = 86 - (((point.price ?? result.currentPrice ?? min) - min) / range) * 64;
                  return <i key={`${point.date}-${index}`} style={{ left: `${left}%`, top: `${top}%` }} title={`${point.date}: ${point.price ?? "--"}`} />;
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="empty-dash">{loading ? "正在讀取即時價格..." : "輸入商品 URL 後會顯示即時結果。"}</p>
        )}
      </div>
    </div>
  );
}

function LiveReplicaPhone({
  records,
  query,
  setDraft,
  applyQuery,
}: {
  records: Array<Record<string, any>>;
  query: string;
  setDraft: Dispatch<SetStateAction<Record<string, string | number | boolean>>>;
  applyQuery: (nextQuery?: string) => void;
}) {
  const [primaryQuery, setPrimaryQuery] = useState(query || "iPhone 17");
  const [secondaryQuery, setSecondaryQuery] = useState("Samsung 26");
  const [result, setResult] = useState<MobileToolResult | null>(null);
  const [secondaryResult, setSecondaryResult] = useState<MobileToolResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const products = [...(result?.products ?? []), ...(secondaryResult?.products ?? [])];
  const chartRows = products.slice(0, 6);
  const max = Math.max(...chartRows.map((row) => Number(row.bestPrice || row.landtopPrice || row.jyesPrice || 1)), 1);

  async function loadMobile(nextQuery: string, target: "primary" | "secondary", refresh = true) {
    const keyword = nextQuery.trim();
    if (!keyword) return;
    setLoading(target);
    setError("");
    if (target === "primary") {
      setDraft((prev) => ({ ...prev, toolType: "phone-price", queryText: keyword }));
      applyQuery(keyword);
    }
    try {
      const payload = await fetchToolJson<MobileToolResult>("/api/landtop", { query: keyword, refresh: refresh ? 1 : 0 });
      if (target === "primary") setResult(payload);
      else setSecondaryResult(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading("");
    }
  }

  useEffect(() => {
    loadMobile(primaryQuery, "primary", false);
    loadMobile(secondaryQuery, "secondary", false);
  }, []);

  return (
    <div className="tool-showcase phone replica-showcase">
      <div className="phone-query-grid">
        <LiveReplicaPhoneQuery title="蘋果手機區塊" note={`預設查詢：${primaryQuery}`} value={primaryQuery} button={loading === "primary" ? "搜尋中" : "搜尋蘋果"} onChange={setPrimaryQuery} onSearch={() => loadMobile(primaryQuery, "primary")} />
        <LiveReplicaPhoneQuery title="三星手機區塊" note={`預設查詢：${secondaryQuery}`} value={secondaryQuery} button={loading === "secondary" ? "搜尋中" : "搜尋三星"} onChange={setSecondaryQuery} onSearch={() => loadMobile(secondaryQuery, "secondary")} />
      </div>
      {error ? <p className="tool-error">即時手機比價讀取失敗：{error}</p> : null}
      <div className="chart-card">
        <small>LANDTOP CHART</small>
        <strong>地標網通 vs 傑昇通信</strong>
        {chartRows.length ? chartRows.map((row) => {
          const price = Number(row.bestPrice || row.landtopPrice || row.jyesPrice || 0);
          const jyesPrice = Number(row.jyesPrice || price || 0);
          return (
            <div key={row.id} className="chart-row">
              <span>{row.name}</span>
              <div><i style={{ width: `${Math.max(6, (price / max) * 100)}%` }} /><em style={{ width: `${Math.max(6, (jyesPrice / max) * 100)}%` }} /></div>
              <b>{formatToolMoney(price)}</b>
            </div>
          );
        }) : <p className="empty-dash">尚未載入即時手機比價結果。</p>}
      </div>
      <LiveReplicaPhoneProducts title="蘋果手機區塊" rows={result?.products ?? []} emptyText="目前沒有這個區塊的即時比價結果。" />
      <LiveReplicaPhoneProducts title="三星手機區塊" rows={secondaryResult?.products ?? []} emptyText="目前沒有這個區塊的即時比價結果。" />
      <div className="phone-history-card">
        <div className="section-caption">
          <strong>Weekly History / 地標網通歷史價格</strong>
          <span>{products.length ? `${products.length} 筆即時資料` : `${records.length} 筆工具紀錄`}</span>
        </div>
        <div className="line-chart">
          {chartRows.map((row, index) => {
            const price = Number(row.bestPrice || row.landtopPrice || row.jyesPrice || 0);
            return <i key={row.id} style={{ left: `${18 + index * 10}%`, width: `${Math.max(8, (price / max) * 34)}%` }} />;
          })}
        </div>
      </div>
    </div>
  );
}

function LiveReplicaPhoneQuery({ title, note, value, button, onChange, onSearch }: { title: string; note: string; value: string; button: string; onChange: (value: string) => void; onSearch: () => void }) {
  return (
    <div className="phone-query-card">
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <div className="inline-query">
        <input value={value} onChange={(event) => onChange(event.target.value)} />
        <button type="button" onClick={onSearch}><Search size={16} />{button}</button>
      </div>
    </div>
  );
}

function LiveReplicaPhoneProducts({ title, rows, emptyText }: { title: string; rows: MobileToolProduct[]; emptyText: string }) {
  return (
    <div className="phone-product-section">
      <div className="section-caption">
        <strong>{title}</strong>
        <span>{rows.length} 筆</span>
      </div>
      {rows.length ? (
        <div className="phone-product-grid">
          {rows.map((row) => (
            <a className="phone-product-card" key={row.id} href={row.sourceUrl || row.jyesUrl || "#"} target="_blank" rel="noreferrer">
              <strong>{row.name}</strong>
              <small>{row.brand || "PHONE"}</small>
              <div className="phone-price-pills">
                <span>地標網通 <b>{formatToolMoney(row.landtopPrice)}</b></span>
                <span>傑昇通信 <b>{formatToolMoney(row.jyesPrice)}</b></span>
              </div>
              <p>{row.bestSourceLabel ? `最低：${row.bestSourceLabel}` : "即時價格資料"}</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="empty-dash">{emptyText}</p>
      )}
    </div>
  );
}

function LiveReplicaTube({ records, query, preset, openToolLink }: { records: Array<Record<string, any>>; query: string; preset: ToolPreset; openToolLink: (link: ToolLink) => void }) {
  const [result, setResult] = useState<TubeToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTube() {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchToolJson<TubeToolResult>("/api/fengbro-tube");
      setResult(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTube();
  }, []);

  const recentVideos = result?.recentVideos ?? [];
  const channels = result?.channels ?? [];

  return (
    <div className="tool-showcase tube replica-showcase">
      <div className="tube-alert">
        <strong>3 天內新影片：{recentVideos.length} 部</strong>
        <span>更新：{formatToolDate(result?.fetchedAt)}</span>
        <button type="button" onClick={loadTube}><RefreshCcw size={14} />{loading ? "整理中" : "重新整理"}</button>
      </div>
      {error ? <p className="tool-error">即時 Tube 讀取失敗：{error}</p> : null}
      <div className="tube-list">
        {recentVideos.length ? recentVideos.slice(0, 8).map((video) => (
          <a key={video.videoId} href={video.url} target="_blank" rel="noreferrer">
            <strong>{video.title}</strong>
            <small>{video.channelTitle || "YouTube"} / {formatToolDate(video.publishedAt)}</small>
          </a>
        )) : <p className="empty-dash">{loading ? "正在載入 YouTube 即時資料..." : `尚未取得即時影片。${query ? `目前查詢：${query}` : ""}`}</p>}
      </div>
      {channels.length ? channels.map((channel) => (
        <LiveReplicaTubeChannel key={channel.channelId || channel.sourceUrl} channel={channel} />
      )) : (
        <div className="tube-channel">
          <div className="section-caption">
            <strong>即時頻道</strong>
            <span>{records.length} 筆工具紀錄</span>
          </div>
          <p className="empty-dash">尚未載入即時頻道資料，請按重新整理。</p>
        </div>
      )}
      <div className="tool-action-row">
        <button type="button" onClick={() => openToolLink(preset.links[0])}><ExternalLink size={14} />開啟 YouTube</button>
      </div>
    </div>
  );
}

function LiveReplicaTubeChannel({ channel }: { channel: TubeToolChannel }) {
  return (
    <div className="tube-channel">
      <div className="section-caption">
        <strong>{channel.title || "YouTube 頻道"}</strong>
        <span>{channel.videos.length} 部影片</span>
      </div>
      {channel.error ? <p className="tool-error">{channel.error}</p> : null}
      <div className="tube-card-grid">
        {channel.videos.map((video) => (
          <a className="tube-video-card" key={video.videoId} href={video.url} target="_blank" rel="noreferrer">
            <div className="tube-thumb with-image">
              {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" /> : <Film size={22} />}
            </div>
            <strong>{video.title}</strong>
            <small>{channel.title} / {formatToolDate(video.publishedAt)}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function LiveReplicaFinance({ records, preset, openToolLink }: { records: Array<Record<string, any>>; preset: ToolPreset; openToolLink: (link: ToolLink) => void }) {
  const [result, setResult] = useState<FinanceToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadFinance() {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchToolJson<FinanceToolResult>("/api/fengbro-finance");
      setResult(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, []);

  const quoteGroups = groupFinanceQuotes(result?.quotes ?? []);

  return (
    <div className="tool-showcase finance replica-showcase">
      <div className="finance-hero">
        <div>
          <strong>Shiller PE Ratio</strong>
          <p>Max: {formatNumber(result?.shillerPe.recordHigh ?? 0)} ({result?.shillerPe.recordHighDate || "-"})</p>
        </div>
        <button type="button" onClick={loadFinance}><RefreshCcw size={14} />{loading ? "整理中" : "重新整理"}</button>
        <span>{result?.shillerPe.current === null || result?.shillerPe.current === undefined ? "--" : formatNumber(result.shillerPe.current)}</span>
      </div>
      {error ? <p className="tool-error">即時金融讀取失敗：{error}</p> : null}
      {result?.financeAlerts?.length ? (
        <div className="tool-warning-list">
          {result.financeAlerts.map((alert) => (
            <a key={alert.id} href={alert.sourceUrl} target="_blank" rel="noreferrer">{alert.message}</a>
          ))}
        </div>
      ) : null}
      {quoteGroups.some((group) => group.rows.length) ? quoteGroups.map((group) => (
        <LiveReplicaFinanceGroup key={group.key} title={group.label} rows={group.rows} />
      )) : (
        <p className="empty-dash">{loading ? "正在載入即時金融資料..." : `尚未取得即時金融資料。已有 ${records.length} 筆工具紀錄。`}</p>
      )}
      <div className="tool-action-row">
        <button type="button" onClick={() => openToolLink(preset.links[0])}><ExternalLink size={14} />開啟 Yahoo Finance</button>
      </div>
    </div>
  );
}

function LiveReplicaFinanceGroup({ title, rows }: { title: string; rows: FinanceToolQuote[] }) {
  return (
    <div className="finance-section">
      <div className="section-caption">
        <strong>{title}</strong>
        <span>{rows.length} 項</span>
      </div>
      <div className="finance-grid">
        {rows.map((row) => (
          <a key={row.id} className="finance-card" href={row.sourceUrl || "#"} target="_blank" rel="noreferrer">
            <small>{row.sourceUrl.includes("cnbc") ? "CNBC" : row.sourceUrl.includes("yahoo") ? "Yahoo" : "Source"}</small>
            <strong>{row.displayName || row.name}</strong>
            <b>{formatToolMoney(row.price, row.currency)}<em>{row.symbol}</em></b>
            <p>
              {row.change === null ? "變化 --" : `${row.change >= 0 ? "+" : ""}${formatNumber(row.change)}`}
              {row.changePercent === null ? "" : ` / ${row.changePercent >= 0 ? "+" : ""}${formatNumber(row.changePercent)}%`}
            </p>
            <p>52W High {formatToolMoney(row.high52, row.currency)} / 52W Low {formatToolMoney(row.low52, row.currency)}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  if (field.type === "textarea") {
    return <textarea value={String(value)} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} rows={4} />;
  }
  if (field.type === "boolean") {
    return (
      <select value={String(value || false)} onChange={(event) => onChange(event.target.value === "true")}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "url" ? "url" : "text"}
      value={String(value)}
      placeholder={field.placeholder}
      onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
    />
  );
}

function flattenModules(items: ModuleDef[]): ModuleDef[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenModules(item.children) : [])]);
}

function getDefaultSettingsRecord(): ItemRecord {
  return {
    id: "settings",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    name: "Strapi",
    strapiUrl: defaultStrapiUrl,
    apiToken: defaultStrapiApiToken,
    note: "Strapi URL 與 Strapi API Token 是唯一保存在瀏覽器的設定。",
  };
}

function settingsToDraft(settings: ItemRecord) {
  return {
    name: String(settings.name ?? "Strapi"),
    strapiUrl: String(settings.strapiUrl ?? ""),
    apiToken: String(settings.apiToken ?? ""),
    note: String(settings.note ?? ""),
  };
}

function hasStrapiConfig(settings: ItemRecord) {
  return Boolean(String(settings.strapiUrl ?? "").trim() && String(settings.apiToken ?? "").trim());
}

async function strapiRequest(settings: ItemRecord, path: string, method: "GET" | "POST" | "PUT" | "DELETE", data?: Record<string, unknown>) {
  const baseUrl = String(settings.strapiUrl ?? "").replace(/\/+$/, "");
  const token = String(settings.apiToken ?? "").trim();
  const url = `${baseUrl}/api/${path}${method === "GET" ? "?pagination[pageSize]=100" : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify({ data }) : undefined,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ? `：${errorBody.error.message}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Strapi ${method} /api/${path} 失敗 (${response.status})${detail}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function strapiUploadFile(settings: ItemRecord, file: File) {
  const baseUrl = String(settings.strapiUrl ?? "").replace(/\/+$/, "");
  const token = String(settings.apiToken ?? "").trim();
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = await response.json();
      detail = errorBody?.error?.message ? `：${errorBody.error.message}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Strapi 圖片上傳失敗 (${response.status})${detail}`);
  }

  const uploaded = await response.json();
  const firstFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  if (!firstFile?.url) throw new Error("Strapi 圖片上傳成功但沒有回傳 URL");
  return firstFile as Record<string, unknown>;
}

function getStrapiAssetUrl(settings: ItemRecord, url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = String(settings.strapiUrl ?? "").replace(/\/+$/, "");
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function isUploadModule(moduleId: string) {
  return ["image", "video", "music", "document", "podcast"].includes(moduleId);
}

function getUploadKind(moduleId: string) {
  switch (moduleId) {
    case "image":
      return "圖片";
    case "video":
      return "影片";
    case "music":
      return "音樂";
    case "document":
      return "文件";
    case "podcast":
      return "播客";
    default:
      return "檔案";
  }
}

function getUploadAccept(moduleId: string) {
  switch (moduleId) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "music":
    case "podcast":
      return "audio/*";
    case "document":
      return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,application/pdf,text/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "*/*";
  }
}

function strapiListToRecords(payload: unknown, moduleDef: ModuleDef): ItemRecord[] {
  const list = Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  return list.map((entry) => strapiEntryToRecord(entry, moduleDef));
}

function strapiEntryToRecord(entry: unknown, moduleDef: ModuleDef): ItemRecord {
  const source = entry as Record<string, unknown>;
  const attributes = (source.attributes && typeof source.attributes === "object" ? source.attributes : source) as Record<string, unknown>;
  const strapiId = String(source.documentId ?? source.id ?? crypto.randomUUID());
  const mapped = Object.fromEntries(
    moduleDef.fields.map((field) => {
      const value = attributes[field.strapiKey ?? field.key] ?? "";
      return [field.key, coerceFieldValue(value, field)];
    }),
  );

  return {
    id: strapiId,
    _strapiId: strapiId,
    createdAt: String(attributes.createdAt ?? ""),
    updatedAt: String(attributes.updatedAt ?? ""),
    ...mapped,
  };
}

function toStrapiData(record: Record<string, string | number | boolean>, moduleDef: ModuleDef) {
  return Object.fromEntries(
    moduleDef.fields.map((field) => [field.strapiKey ?? field.key, toStrapiFieldValue(record[field.key], field)]),
  );
}

function toStrapiFieldValue(value: string | number | boolean | undefined, field: FieldDef) {
  if (field.type === "boolean") {
    return value === true || value === "true";
  }
  if ((field.type === "date" || field.type === "datetime") && String(value ?? "").trim() === "") {
    return null;
  }
  if (field.key === "fileSize") {
    return Math.round(Number(value || 0));
  }
  if (field.type === "number") {
    return Math.round(Number(value || 0));
  }
  if (field.key === "filetype") {
    return normalizeFileTypeValue(value);
  }
  return value ?? "";
}

function normalizeFileType(uploaded: Record<string, unknown>, file: File) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  if (extension) return extension.toLowerCase().slice(0, 20);
  return normalizeFileTypeValue(String(uploaded.ext ?? uploaded.mime ?? file.type ?? ""));
}

function normalizeFileTypeValue(value: string | number | boolean | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const extension = text.startsWith(".") ? text.slice(1) : "";
  if (extension && extension.length <= 20) return extension.toLowerCase();

  if (text.includes("/")) {
    const subtype = text.split("/").pop() ?? text;
    const lastPart = subtype.split(".").pop() ?? subtype;
    return lastPart.toLowerCase().slice(0, 20);
  }

  return text.slice(0, 20);
}

function getUploadedFileSize(uploaded: Record<string, unknown>, file: File) {
  if (Number.isFinite(file.size) && file.size > 0) {
    return Math.round(file.size);
  }

  const uploadedSize = Number(uploaded.size ?? 0);
  return Math.round(uploadedSize * 1024);
}

function coerceFieldValue(value: unknown, field: FieldDef) {
  if (field.type === "number") return Number(value || 0);
  if (field.type === "boolean") return value === true || value === "true";
  return String(value ?? "");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Strapi 操作失敗";
}

function getEmptyDraft(moduleDef: ModuleDef) {
  return Object.fromEntries(
    moduleDef.fields.map((field) => [
      field.key,
      field.defaultValue ?? (field.type === "number" ? 0 : field.type === "boolean" ? false : ""),
    ]),
  );
}

function normalizeDraft(draft: Record<string, string | number | boolean>, moduleDef: ModuleDef) {
  return Object.fromEntries(
    moduleDef.fields.map((field) => {
      const value = draft[field.key];
      if (field.type === "number") return [field.key, Number(value || 0)];
      if (field.type === "boolean") return [field.key, value === true || value === "true"];
      return [field.key, String(value ?? "")];
    }),
  );
}

function rowsToRecords(rows: Record<string, string>[], moduleDef: ModuleDef): ItemRecord[] {
  return rows.map((row) => {
    const normalized = normalizeDraft(row, moduleDef);
    return {
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...normalized,
    };
  });
}

function getRecordTitle(record: Record<string, unknown>, moduleDef: ModuleDef) {
  const preferred = ["name", "title", "queryText"].find((key) => record[key]);
  if (preferred) return String(record[preferred]);
  return `${moduleDef.label}資料`;
}

function renderCell(value: string | number | boolean, field: FieldDef, moduleDef: ModuleDef) {
  if (field.type === "boolean") return value ? "true" : "false";
  if (moduleDef.id === "image" && (field.key === "file" || field.key === "cover") && value) {
    return (
      <a className="image-cell" href={String(value)} target="_blank" rel="noreferrer">
        <img src={String(value)} alt="鋒兄圖片縮圖" loading="lazy" />
        <span>{String(value)}</span>
      </a>
    );
  }
  if (isMediaFileCell(moduleDef, field, value, "video")) {
    return (
      <div className="media-cell">
        <video src={String(value)} controls preload="metadata" />
        <a href={String(value)} target="_blank" rel="noreferrer">
          {String(value)}
        </a>
      </div>
    );
  }
  if (isAudioModule(moduleDef.id) && isMediaFileCell(moduleDef, field, value, "audio")) {
    return (
      <div className="media-cell audio-cell">
        <audio src={String(value)} controls preload="metadata" />
        <a href={String(value)} target="_blank" rel="noreferrer">
          {String(value)}
        </a>
      </div>
    );
  }
  if (moduleDef.id === "document" && isDocumentFileCell(field, value)) {
    return <DocumentPreview url={String(value)} filetype="" title="鋒兄文件" />;
  }
  if (field.type === "url" && value) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    );
  }
  return String(value ?? "") || "-";
}

function isAudioModule(moduleId: string) {
  return moduleId === "music" || moduleId === "podcast";
}

function isMediaFileCell(moduleDef: ModuleDef, field: FieldDef, value: string | number | boolean, mediaId: "video" | "audio") {
  if ((mediaId === "video" && moduleDef.id !== "video") || (mediaId === "audio" && !isAudioModule(moduleDef.id)) || !value) return false;
  const text = String(value);
  if (!/^https?:\/\//i.test(text)) return false;
  return field.key === "file" || field.key === "url" || field.type === "url";
}

function isDocumentFileCell(field: FieldDef, value: string | number | boolean) {
  if (!value) return false;
  const text = String(value);
  if (!/^https?:\/\//i.test(text)) return false;
  return field.key === "file" || field.key === "url" || field.type === "url";
}

function DocumentPreview({ url, filetype, title, large = false }: { url: string; filetype: string; title: string; large?: boolean }) {
  const type = getDocumentType(url, filetype);
  const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || title || "file");

  return (
    <div className={large ? "document-preview document-preview-large" : "document-preview"}>
      {type === "pdf" ? <iframe src={url} title={title || filename} loading="lazy" /> : null}
      <div className="document-preview-body">
        <strong>{filename}</strong>
        <span>{type.toUpperCase()}</span>
        <a href={url} target="_blank" rel="noreferrer">
          開啟檔案
        </a>
      </div>
    </div>
  );
}

function getDocumentType(url: string, filetype: string) {
  const normalized = String(filetype || "").trim().toLowerCase();
  if (normalized) return normalized.replace(/^\./, "").slice(0, 20);
  const pathname = url.split("?")[0] ?? "";
  const extension = pathname.includes(".") ? pathname.split(".").pop() : "";
  return (extension || "file").toLowerCase().slice(0, 20);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(value);
}

function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "").trim()) ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function toCsv(records: ItemRecord[], headers: string[]) {
  const lines = [headers.join(",")];
  for (const record of records) {
    lines.push(headers.map((header) => escapeCsv(record[header])).join(","));
  }
  return lines.join("\n");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
