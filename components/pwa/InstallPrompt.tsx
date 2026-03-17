'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosModal, setShowIosModal] = useState(false)
  const [dismissed, setDismissed] = useState(true) // start hidden, check in effect

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return

    // iOS Safari 감지
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isIos && !isStandalone) {
      setShowIosModal(true)
      setDismissed(false)
      return
    }

    // Android Chrome: beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIosModal(false)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      handleDismiss()
    }
  }

  if (dismissed) return null

  // Android 배너
  if (deferredPrompt) {
    return (
      <div
        role="banner"
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t bg-white px-4 py-4 shadow-lg"
      >
        <p className="mb-3 text-lg font-semibold">홈 화면에 추가하면 더 편리해요</p>
        <p className="mb-4 text-base text-muted-foreground">
          앱처럼 바로 실행하고 오프라인에서도 사용할 수 있어요.
        </p>
        <div className="flex gap-3">
          <Button
            className="min-h-[48px] flex-1 text-lg"
            onClick={handleAndroidInstall}
            aria-label="홈 화면에 앱 추가"
          >
            홈 화면에 추가
          </Button>
          <Button
            variant="outline"
            className="min-h-[48px] flex-1 text-lg"
            onClick={handleDismiss}
            aria-label="설치 안내 닫기"
          >
            나중에
          </Button>
        </div>
      </div>
    )
  }

  // iOS 모달
  if (showIosModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="홈 화면 추가 안내"
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      >
        <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white px-6 py-8">
          <p className="mb-3 text-xl font-bold">홈 화면에 추가하기</p>
          <p className="mb-4 text-lg text-muted-foreground">
            아래 버튼을 눌러 앱처럼 설치할 수 있어요.
          </p>
          <ol className="mb-6 space-y-3 text-lg">
            <li>
              1. Safari 하단의{' '}
              <span className="font-semibold">공유 버튼(□↑)</span>을 누르세요
            </li>
            <li>
              2. 메뉴에서{' '}
              <span className="font-semibold">홈 화면에 추가</span>를 선택하세요
            </li>
          </ol>
          <Button
            variant="outline"
            className="min-h-[48px] w-full text-lg"
            onClick={handleDismiss}
            aria-label="홈 화면 추가 안내 닫기"
          >
            닫기
          </Button>
        </div>
      </div>
    )
  }

  return null
}
