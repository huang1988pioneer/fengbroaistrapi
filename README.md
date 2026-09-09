# StrapiFengBroAI

鋒兄資料庫 Remix CRUD Console。  
前端使用 Remix SPA mode，後端資料透過 Strapi REST API 做新增、查詢、更新、刪除，並保留 Appwrite CSV 匯入/匯出格式。

## 功能

- 鋒兄訂閱、試用首購、鋒兄重灌、鋒兄額度、食品、購物清單、筆記、常用、圖片、影片、音樂、文件、播客、銀行、例行、工具、設定、關於。
- 每個資料模組支援 CRUD、CSV 匯入、CSV 匯出。
- 圖片、影片、音樂、文件、播客支援 Strapi Media Library 上傳後建立資料。
- 鋒兄設定極簡化，只需要 Strapi URL 與 Strapi API Token。
- 鋒兄工具支援即時資料：
  - 鋒兄比價：參考 SQLiteCloudFengBroAI `/api/resolve`
  - 手機比價：參考 SQLiteCloudFengBroAI `/api/landtop`
  - 鋒兄Tube：參考 SQLiteCloudFengBroAI `/api/fengbro-tube`
  - 鋒兄金融：參考 SQLiteCloudFengBroAI `/api/fengbro-finance`

## 環境變數

建立 `.env`：

```bash
VITE_STRAPI_URL=https://your-strapi-domain
VITE_STRAPI_API_TOKEN=your-strapi-api-token
VITE_FENGBRO_TOOL_API_BASE=https://sq-lite-cloud-feng-bro-ai.vercel.app
```

`VITE_STRAPI_URL` 與 `VITE_STRAPI_API_TOKEN` 會預填到鋒兄設定。  
若沒有設定，也可以在頁面中的「鋒兄設定」輸入。

## 本地開發

```bash
npm install
npm run dev
```

開發網址：

```text
http://127.0.0.1:5173
```

## 建置與預覽

```bash
npm run typecheck
npm run build
npm start
```

`npm start` 會用 Vite preview 預覽 Remix SPA 靜態產物：

```text
http://127.0.0.1:4173
```

也可以使用同等指令：

```bash
npm run preview
```

## Strapi Collection API 路徑

目前前端預期的 Strapi REST API：

- `/api/subscriptions`
- `/api/trial-purchases`
- `/api/reinstalls`
- `/api/quotas`
- `/api/foods`
- `/api/shopping-lists`
- `/api/articles`
- `/api/commonaccounts`
- `/api/images`
- `/api/videos`
- `/api/music-items`
- `/api/commondocuments`
- `/api/podcasts`
- `/api/banks`
- `/api/routines`
- `/api/tool-price-histories`

請確認 Strapi API Token 具備對應 collection 的 `find`、`findOne`、`create`、`update`、`delete` 權限。若要上傳檔案，也需要 Upload plugin 權限。

## CSV

CSV 匯入/匯出相容 Appwrite 常見格式：

- 支援 UTF-8 BOM。
- 支援雙引號欄位。
- 支援多行備註。
- 匯出會依目前模組欄位順序輸出。

## 部署

本專案是 SPA mode，建置後主要靜態入口在：

```text
build/client/index.html
```

EdgeOne Pages、Vercel、Netlify 等靜態部署平台可使用：

```bash
npm run build
```

輸出目錄：

```text
build/client
```
