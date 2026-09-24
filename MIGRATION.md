# Remix／Strapi 移植進度

此提交保存目前的功能移植成果，尚未代表所有線上整合完成。

- 前端維持 Remix SPA；`npm run build` 產生 `build/client`，延用靜態部署。
- 訂閱頁採單欄上下排列：新增表單在上、資料列表在下，桌面與手機均已驗證。
- 參考專案的管理、工具及設定介面已移入，資料存取由 `lib/strapi` 適配 Strapi。
- `services/tools` 提供獨立 Node.js 工具 API，需另外部署；靜態站無法執行這些伺服器功能。
- `strapi-extension` 提供後端資料模型，套用前請比對現有模型並備份資料庫。

## 2026-09-24 追上參考專案

已補上 fengbroaiappwrite 在 `ba0d9be` 之後的功能，並改寫成 Strapi 版本：

- 鋒兄銀行分成銀行／電子票證／點數三區塊，可手動指定分類，新增多行備註與有效期限。
  有效期限七天內在清單上以朱紅倒數標示，並加入儀表板與 Email 到期提醒。
- 鋒兄Tube 列出超過 3 個月未更新的頻道。
- 資料讀取加上同 URL 請求合併、session 快取先畫後更新；快取依 Strapi 網址分開。
- 工具 API 的 Strapi 分頁改為平行 offset 讀取（Strapi 不支援游標分頁）。
- 參考專案的 Appwrite「補欄位」端點不移植；Strapi 缺欄位時錯誤訊息會提示部署 schema。

**需要部署**：`strapi-extension/src/api/bank` 新增 `note`（text）、`category`（string）、`expiry`（date）。
未部署前仍可新增不含這三欄的銀行資料；填了就會收到補欄位提示。

## 工具 API 部署

從儲存庫根目錄執行 `docker build -f services/tools/Dockerfile -t fengbro-tools .`。
依 `services/tools/.env.example` 設定伺服器環境變數，再啟動容器並對外提供 HTTPS。
必填 `TOOLS_API_TOKEN`、`STRAPI_URL`、`STRAPI_API_TOKEN`、`ALLOWED_ORIGINS`；允許來源填入實際前端網域。
在前端「鋒兄設定」填入工具 API 網址與工具 API 金鑰。Strapi 金鑰由工具伺服器自己的環境提供。
推播等功能另需對應 VAPID 設定。不要將實際金鑰提交到 Git。

## 驗證與待辦

執行 `npm run typecheck`、`npm test`、`node --test tests/tools-strapi.test.cjs`、`npm run build`。
啟動靜態預覽後可用 `TEST_BASE_URL` 指定網址並執行 `node tests/subscription-layout.mjs`，需要安裝 Chrome。

尚待正式環境逐項驗證：工具 API 部署、資料模型及特殊端點相容性、額度敏感欄位處理、影音與通知端到端流程。
目前測試包含模擬 Strapi 回應，不能取代實際服務整合驗證。
