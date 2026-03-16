'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getKSTDate, getKSTDayOfWeek, getDirectionByArrivalTime } from '@/lib/utils'
import { checkAndRefreshRouteCache, Schedule, UserSettings } from '@/lib/odsay'

export interface Override {
  id: string
  user_id: string
  override_date: string
  workplace_name: string | null
  workplace_address: string | null
  workplace_lat: number | null
  workplace_lng: number | null
  arrival_time: string | null
  commute_traffic_type: number | null
  commute_ars_id: string | null
  commute_bus_no: string | null
  commute_station_name: string | null
  commute_subway_line: string | null
  odsay_route_cache: Record<string, unknown> | null
  route_cached_at: string | null
  return_traffic_type: number | null
  return_ars_id: string | null
  return_bus_no: string | null
  return_station_name: string | null
  return_subway_line: string | null
  return_odsay_cache: Record<string, unknown> | null
  return_route_cached_at: string | null
}

export type Direction = 'commute' | 'return'

interface UseScheduleResult {
  schedule: Schedule | null
  override: Override | null
  userSettings: UserSettings | null
  direction: Direction
  isLoading: boolean
  isRouteSearching: boolean // 현재 방향의 traffic_type === null (ODsay 탐색 전)
  error: Error | null
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isCacheExpired(cachedAt: string | null): boolean {
  if (!cachedAt) return true
  return new Date(cachedAt) < new Date(Date.now() - SEVEN_DAYS_MS)
}

export function useSchedule(): UseScheduleResult {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [override, setOverride] = useState<Override | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        let { data: { user } } = await supabase.auth.getUser()

        // 세션이 없으면 익명 로그인 후 재시도 (AuthProvider보다 먼저 실행되는 경쟁 조건 대응)
        if (!user) {
          await supabase.auth.signInAnonymously()
          const result = await supabase.auth.getUser()
          user = result.data.user
        }

        if (!user) throw new Error('인증 세션이 없습니다')

        const kstDate = getKSTDate()
        const kstDay = getKSTDayOfWeek()

        // overrides, schedules, user_settings 병렬 조회
        const [overrideRes, scheduleRes, settingsRes] = await Promise.all([
          supabase
            .from('overrides')
            .select('*')
            .eq('user_id', user.id)
            .eq('override_date', kstDate)
            .maybeSingle(),
          supabase
            .from('schedules')
            .select('*')
            .eq('user_id', user.id)
            .eq('day', kstDay)
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        if (cancelled) return

        if (overrideRes.error) throw new Error(overrideRes.error.message)
        if (scheduleRes.error) throw new Error(scheduleRes.error.message)
        if (settingsRes.error) throw new Error(settingsRes.error.message)

        const settings = settingsRes.data as UserSettings | null
        const foundOverride = overrideRes.data as Override | null
        let foundSchedule = scheduleRes.data as Schedule | null

        // 현재 방향 결정 — arrival_time 기준, 없으면 commute_end_hour fallback
        const effectiveArrivalTime = foundOverride?.arrival_time ?? foundSchedule?.arrival_time
        const direction: Direction = getDirectionByArrivalTime(
          effectiveArrivalTime,
          settings?.commute_end_hour ?? 12
        )

        // ODsay 캐시 갱신 필요 여부 확인 (오버라이드에 캐시가 없는 경우만 schedule 검사)
        if (foundSchedule) {
          const overrideCacheExists =
            direction === 'commute'
              ? !!foundOverride?.odsay_route_cache
              : !!foundOverride?.return_odsay_cache

          if (!overrideCacheExists) {
            const scheduleCachedAt =
              direction === 'commute'
                ? foundSchedule.route_cached_at
                : foundSchedule.return_route_cached_at
            const scheduleCache =
              direction === 'commute'
                ? foundSchedule.odsay_route_cache
                : foundSchedule.return_odsay_cache

            if (!scheduleCache || isCacheExpired(scheduleCachedAt)) {
              const refreshed = await checkAndRefreshRouteCache(foundSchedule.id, direction)
              if (!cancelled) foundSchedule = refreshed
            }
          }
        }

        if (!cancelled) {
          setUserSettings(settings)
          setOverride(foundOverride)
          setSchedule(foundSchedule)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 현재 방향 및 isRouteSearching 계산 — arrival_time 기준, 없으면 commute_end_hour fallback
  const effectiveArrivalTime = override?.arrival_time ?? schedule?.arrival_time
  const direction: Direction = getDirectionByArrivalTime(
    effectiveArrivalTime,
    userSettings?.commute_end_hour ?? 12
  )

  const effectiveTrafficType =
    direction === 'commute'
      ? (override?.commute_traffic_type ?? schedule?.commute_traffic_type ?? null)
      : (override?.return_traffic_type ?? schedule?.return_traffic_type ?? null)

  return {
    schedule,
    override,
    userSettings,
    direction,
    isLoading,
    isRouteSearching: !isLoading && schedule !== null && effectiveTrafficType === null,
    error,
  }
}
