'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'


type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function PushSubscription() {
  const [permState, setPermState] = useState<PermissionState>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasSW = 'serviceWorker' in navigator
    const hasPush = 'PushManager' in window
    const hasNotif = 'Notification' in window
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    const perm = hasNotif ? Notification.permission : 'N/A'

    setDebugInfo(`SW:${hasSW} Push:${hasPush} Notif:${hasNotif} iOS:${isIos} SA:${isStandalone} perm:${perm}`)

    if (!hasSW || !hasPush || !hasNotif) return
    if (isIos && !isStandalone) return

    setPermState(Notification.permission as PermissionState)

    // 이미 구독 중인지 확인
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setIsSubscribed(true)
      })
    })
  }, [])

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const permission = await Notification.requestPermission()
      setPermState(permission as PermissionState)
      if (permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      })

      const keys = sub.toJSON().keys
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys?.p256dh,
          auth: keys?.auth,
          userAgent: navigator.userAgent,
        }),
      })

      setIsSubscribed(true)
    } catch {
      // 구독 실패 시 앱 동작에 영향 없음
    } finally {
      setIsLoading(false)
    }
  }

  // 지원 안 됨 또는 이미 구독 중이면 디버그 정보만 표시
  if (permState === 'unsupported' || isSubscribed) {
    return (
      <div className="mx-auto mt-3 max-w-md px-4">
        <p className="text-xs text-muted-foreground break-all">{debugInfo}</p>
      </div>
    )
  }

  // 권한 거부됨
  if (permState === 'denied') {
    return (
      <div className="mx-auto mt-3 max-w-md rounded-2xl bg-muted/50 px-4 py-3">
        <p className="text-base text-muted-foreground">
          알림이 차단되어 있어요. 브라우저 설정에서 알림을 허용하면 출퇴근 알림을 받을 수 있어요.
        </p>
      </div>
    )
  }

  // 기본 상태 — 알림 허용 버튼
  return (
    <div className="mx-auto mt-3 max-w-md rounded-2xl border bg-white px-4 py-4 shadow-sm">
      <p className="mb-1 text-lg font-semibold">출퇴근 알림 받기</p>
      <p className="mb-3 text-base text-muted-foreground">
        출발 시각이 되면 알림으로 알려드려요.
      </p>
      <Button
        className="min-h-[48px] w-full text-lg"
        onClick={handleSubscribe}
        disabled={isLoading}
        aria-label="출퇴근 알림 허용"
      >
        {isLoading ? '설정 중...' : '알림 허용'}
      </Button>
    </div>
  )
}
