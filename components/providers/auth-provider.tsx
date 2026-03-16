'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 최초 접속 시 세션 없으면 익명 로그인 (T-08)
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        supabase.auth.signInAnonymously()
      }
    })

    // Auth 상태 리스너 (T-07)
    // SIGNED_OUT 이벤트에만 재로그인 — TOKEN_REFRESHED 절대 처리 금지
    // (TOKEN_REFRESHED에서 signInAnonymously 호출 시 새 user_id 생성 → 기존 데이터 연결 끊김)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        supabase.auth.signInAnonymously()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}
