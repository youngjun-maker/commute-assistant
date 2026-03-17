'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'


type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface PushSubscriptionProps {
  /** true면 설정 화면용 — 구독 중일 때도 상태 + 해제 버튼 표시 */
  showSettings?: boolean
}

export function PushSubscription({ showSettings = false }: PushSubscriptionProps) {
  const [permState, setPermState] = useState<PermissionState>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [step, setStep] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (isIos && !isStandalone) return

    setPermState(Notification.permission as PermissionState)

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setIsSubscribed(true)
      })
    })
  }, [])

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const output = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
    return output
  }

  async function handleSubscribe() {
    setIsLoading(true)
    setErrorMsg(null)
    setStep('권한 요청 중...')
    try {
      const permission = await Notification.requestPermission()
      setPermState(permission as PermissionState)
      if (permission !== 'granted') return

      setStep('서비스 워커 대기 중...')
      const reg = await navigator.serviceWorker.ready
      const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const keyBytes = urlBase64ToUint8Array(rawKey)
      setStep(`Apple 서버 등록 중... (키:${keyBytes.length}바이트)`)

      const sub = await Promise.race([
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: rawKey,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('구독 타임아웃 (15초)')), 15000)
        ),
      ])

      const keys = sub.toJSON().keys
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keys?.p256dh,
          auth: keys?.auth,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '서버 저장 실패')
      }

      setIsSubscribed(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '알림 설정 실패')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnsubscribe() {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
      setPermState(Notification.permission as PermissionState)
    } catch {
      // 해제 실패 시 앱 동작에 영향 없음
    } finally {
      setIsLoading(false)
    }
  }

  // 지원 안 됨
  if (permState === 'unsupported') return null

  // 설정 화면: 구독 중 상태 표시
  if (showSettings && isSubscribed) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-3">
        <div>
          <p className="text-lg font-semibold">출퇴근 알림</p>
          <p className="text-base text-[oklch(0.35_0.10_180)] font-medium mt-0.5">✓ 알림 설정됨</p>
        </div>
        <Button
          variant="outline"
          className="min-h-[48px] w-full text-base text-destructive hover:text-destructive"
          onClick={handleUnsubscribe}
          disabled={isLoading}
        >
          {isLoading ? '처리 중...' : '알림 해제'}
        </Button>
      </div>
    )
  }

  // 메인 화면: 구독 중이면 숨김
  if (!showSettings && isSubscribed) return null

  // 권한 거부됨
  if (permState === 'denied') {
    return (
      <div className={showSettings
        ? 'rounded-2xl bg-white shadow-sm p-4'
        : 'mx-auto mt-3 max-w-md rounded-2xl bg-muted/50 px-4 py-3'
      }>
        <p className="text-lg font-semibold mb-1">출퇴근 알림</p>
        <p className="text-base text-muted-foreground">
          알림이 차단되어 있어요. 핸드폰 설정 → 알림에서 허용해 주세요.
        </p>
      </div>
    )
  }

  // 기본 상태 — 알림 허용 버튼
  if (showSettings) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-3">
        <div>
          <p className="text-lg font-semibold">출퇴근 알림</p>
          <p className="text-base text-muted-foreground mt-0.5">출발 시각이 되면 알림으로 알려드려요</p>
        </div>
        <Button
          className="min-h-[48px] w-full text-lg"
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? (step || '설정 중...') : '알림 허용'}
        </Button>
        {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      </div>
    )
  }

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
        {isLoading ? (step || '설정 중...') : '알림 허용'}
      </Button>
      {errorMsg && <p className="mt-2 text-sm text-destructive">{errorMsg}</p>}
    </div>
  )
}
