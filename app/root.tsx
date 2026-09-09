import type { LinksFunction, MetaFunction } from "@remix-run/node";
import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import stylesheet from "./styles.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;800&display=swap",
  },
];

export const meta: MetaFunction = () => [
  { title: "鋒兄資料庫 Remix CRUD" },
  {
    name: "description",
    content: "鋒兄資料庫 Remix CRUD with CSV import and export.",
  },
];

/* Stamp the saved chrome preferences before first paint. SPA mode shows
   HydrateFallback first, so without this the console flashes light and
   comfortable before the route restores the real choice. Keys must match
   `storagePrefix` in routes/_index.tsx. */
const themeBootScript = `try{
  var t = localStorage.getItem("fengbro-remix-crud:theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  var d = localStorage.getItem("fengbro-remix-crud:density");
  document.documentElement.setAttribute("data-density", d === "compact" ? "compact" : "comfortable");
}catch(e){}`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return (
    <main className="app-loading" aria-labelledby="loading-title">
      <h1 id="loading-title">鋒兄資料庫</h1>
      <p role="status">正在載入操作介面，請稍候…</p>
      <noscript>請啟用 JavaScript，才能使用資料庫功能。</noscript>
    </main>
  );
}

export default function App() {
  return <Outlet />;
}
