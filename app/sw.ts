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

// 푸시 알림 수신 핸들러
self.addEventListener('push', (event) => {
  const data = (event as PushEvent).data?.json() ?? {}
  const tag = (data.tag ?? data.type) as string
  const options = {
    body: data.body as string,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag,
    renotify: false,  // 같은 tag 교체 시 소리/진동 없음
    data: data,
    actions: (data.actions ?? []) as { action: string; title: string }[],
    requireInteraction: true,
  }
  // iOS는 tag 자동 교체가 안 됨 → 같은 tag 알림을 먼저 닫고 새로 표시
  ;(event as PushEvent).waitUntil(
    self.registration.getNotifications({ tag }).then((existing) => {
      existing.forEach((n) => n.close())
      return self.registration.showNotification(data.title ?? '출근길', options)
    })
  )
})

// 알림 클릭 핸들러 (퀵 버튼 포함)
self.addEventListener('notificationclick', (event) => {
  const e = event as NotificationEvent
  e.notification.close()

  const notifData = e.notification.data
  const action = e.action
  let departIso: string | null = null

  if (notifData?.type === 'return') {
    const base = new Date()
    if (action === 'depart_now') {
      departIso = base.toISOString()
    } else if (action === 'depart_10') {
      departIso = new Date(base.getTime() + 10 * 60000).toISOString()
    } else if (action === 'depart_20') {
      departIso = new Date(base.getTime() + 20 * 60000).toISOString()
    } else {
      // 알림 본체 클릭 — 지금 출발로 처리 (iOS 포함)
      departIso = base.toISOString()
    }
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (departIso) {
        if (clientList.length > 0) {
          clientList[0].postMessage({ type: 'SET_RETURN_DEPART', departAt: departIso })
          return (clientList[0] as WindowClient).focus()
        }
        return self.clients.openWindow('/?depart=' + encodeURIComponent(departIso))
      }
      // 퇴근 알림 본체 클릭 또는 출근 알림 → 앱 포커스/오픈
      if (clientList.length > 0) {
        return (clientList[0] as WindowClient).focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
