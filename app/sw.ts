import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, StaleWhileRevalidate, Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 실시간 도착 정보 — 캐시 불필요
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/transit/"),
      handler: new NetworkOnly(),
    },
    // 카카오 API — 주소 검색은 오프라인 불필요
    {
      matcher: ({ url }) => url.hostname.includes("dapi.kakao.com"),
      handler: new NetworkOnly(),
    },
    // ODsay API — 실시간 도착 정보는 캐시 불필요
    {
      matcher: ({ url }) => url.hostname.includes("api.odsay.com"),
      handler: new NetworkOnly(),
    },
    // Supabase — 스케줄 데이터 오프라인 접근용 (StaleWhileRevalidate)
    {
      matcher: ({ url }) => url.hostname.includes("supabase.co"),
      handler: new StaleWhileRevalidate({ cacheName: "supabase-data" }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
