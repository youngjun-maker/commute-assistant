'use client'

import { useQuery } from '@tanstack/react-query'
import { useRef, useState, useEffect } from 'react'
import { fetchTransitArrival, TransitArrivalResult } from '@/lib/transit'
import { Schedule } from '@/lib/odsay'
import { Override, Direction } from './useSchedule'

interface UseTransitInfoParams {
  schedule: Schedule | null
  override: Override | null
  direction: Direction
  enabled: boolean // commute_traffic_type !== null 이고 데이터 로드 완료
}

interface UseTransitInfoResult {
  data: TransitArrivalResult | null
  isLoading: boolean
  isError: boolean
  isNetworkError: boolean // 연속 3회 에러 시 true → 폴링 중지
  refetch: () => void
}

const POLLING_INTERVAL = 30_000 // 30초
const MAX_CONSECUTIVE_ERRORS = 3

export function useTransitInfo({
  schedule,
  override,
  direction,
  enabled,
}: UseTransitInfoParams): UseTransitInfoResult {
  const errorCountRef = useRef(0)
  const [networkErrorStopped, setNetworkErrorStopped] = useState(false)

  // direction + override 우선 적용으로 실제 파라미터 결정
  const trafficType =
    direction === 'commute'
      ? (override?.commute_traffic_type ?? schedule?.commute_traffic_type ?? null)
      : (override?.return_traffic_type ?? schedule?.return_traffic_type ?? null)

  const stopId =
    direction === 'commute'
      ? (schedule?.commute_stop_id ?? null)
      : (schedule?.return_stop_id ?? null)

  const stopName =
    direction === 'commute'
      ? (schedule?.commute_stop_name ?? null)
      : (schedule?.return_stop_name ?? null)

  const busNo =
    direction === 'commute'
      ? (override?.commute_bus_no ?? schedule?.commute_bus_no ?? null)
      : (override?.return_bus_no ?? schedule?.return_bus_no ?? null)

  const subwayLine =
    direction === 'commute'
      ? (override?.commute_subway_line ?? schedule?.commute_subway_line ?? null)
      : (override?.return_subway_line ?? schedule?.return_subway_line ?? null)

  const canFetch = enabled && !!trafficType && !!stopId && !networkErrorStopped

  const queryResult = useQuery<TransitArrivalResult>({
    queryKey: ['transitArrival', direction, stopId, trafficType === 2 ? busNo : subwayLine],
    queryFn: async () => {
      if (!stopId || !stopName) throw new Error('정류장 정보 없음')

      return fetchTransitArrival(
        trafficType === 2
          ? { type: 'bus', stopId, stopName, busNo: busNo! }
          : { type: 'subway', stopId, stopName, line: subwayLine! }
      )
    },
    enabled: canFetch,
    refetchInterval: canFetch ? POLLING_INTERVAL : false,
    retry: 1,
  })

  // 연속 에러 카운트 추적 — 3회 연속 실패 시 폴링 중지
  useEffect(() => {
    if (queryResult.isError) {
      errorCountRef.current += 1
      if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
        setNetworkErrorStopped(true)
      }
    } else if (queryResult.isSuccess) {
      errorCountRef.current = 0
    }
  }, [queryResult.isError, queryResult.isSuccess])

  // 사용자 수동 재시도 — 에러 카운트 리셋 및 폴링 재개
  function handleRefetch() {
    errorCountRef.current = 0
    setNetworkErrorStopped(false)
    queryResult.refetch()
  }

  return {
    data: queryResult.data ?? null,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    isNetworkError: networkErrorStopped,
    refetch: handleRefetch,
  }
}
