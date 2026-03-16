'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * 앱이 백그라운드 → 포어그라운드 전환 시 실시간 도착 정보 폴링을 즉시 재개
 * document.visibilityState === 'visible' 이벤트에 반응
 */
export function useVisibilityRefetch() {
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['transitArrival'] })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [queryClient])
}
