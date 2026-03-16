'use client'

import { useState, useEffect } from 'react'
import { getDepartureTime } from '@/lib/utils'
import { Schedule, UserSettings } from '@/lib/odsay'
import { Override, Direction } from './useSchedule'

interface UseDepartureTimerParams {
  schedule: Schedule | null
  override: Override | null
  userSettings: UserSettings | null
  direction: Direction
  returnDepartAt?: Date | null // 퇴근 모드: 사용자가 퀵 버튼으로 확정한 출발 시각
}

interface UseDepartureTimerResult {
  minutesLeft: number | null // null: 경로 탐색 중 또는 데이터 없음
  isOverdue: boolean // 출발 시각이 이미 지난 경우
  departureTime: Date | null // 권장 출발 시각
}

export function useDepartureTimer({
  schedule,
  override,
  userSettings,
  direction,
  returnDepartAt = null,
}: UseDepartureTimerParams): UseDepartureTimerResult {
  const [now, setNow] = useState(() => new Date())

  // 1분마다 현재 시각 갱신
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (!schedule || !userSettings) {
    return { minutesLeft: null, isOverdue: false, departureTime: null }
  }

  // 현재 방향의 traffic_type 확인 — null이면 ODsay 탐색 전
  const trafficType =
    direction === 'commute'
      ? (override?.commute_traffic_type ?? schedule.commute_traffic_type)
      : (override?.return_traffic_type ?? schedule.return_traffic_type)

  if (!trafficType) {
    return { minutesLeft: null, isOverdue: false, departureTime: null }
  }

  // 퇴근 모드: 사용자가 퀵 버튼으로 확정한 출발 시각 기준 카운트다운
  if (direction === 'return') {
    if (!returnDepartAt) return { minutesLeft: null, isOverdue: false, departureTime: null }
    const diffMs = returnDepartAt.getTime() - now.getTime()
    const minutesLeft = Math.ceil(diffMs / 60_000)
    return {
      minutesLeft: minutesLeft > 0 ? minutesLeft : 0,
      isOverdue: diffMs < 0,
      departureTime: returnDepartAt,
    }
  }

  const arrivalTimeStr = override?.arrival_time ?? schedule.arrival_time

  // 경로 캐시에서 totalTime 추출
  const routeCache =
    override?.odsay_route_cache ?? schedule.odsay_route_cache

  const totalMinutes = (routeCache as { info?: { totalTime?: number } } | null)?.info?.totalTime

  if (!arrivalTimeStr || !totalMinutes) {
    return { minutesLeft: null, isOverdue: false, departureTime: null }
  }

  const departureTime = getDepartureTime(
    arrivalTimeStr,
    totalMinutes,
    userSettings.buffer_minutes
  )

  const diffMs = departureTime.getTime() - now.getTime()
  const minutesLeft = Math.ceil(diffMs / 60_000)

  return {
    minutesLeft: minutesLeft > 0 ? minutesLeft : 0,
    isOverdue: diffMs < 0,
    departureTime,
  }
}
