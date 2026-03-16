'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeHeader } from '@/components/commute/ModeHeader'
import { DepartureTimer } from '@/components/commute/DepartureTimer'
import { TransitInfo } from '@/components/commute/TransitInfo'
import { useSchedule } from '@/hooks/useSchedule'
import { useDepartureTimer } from '@/hooks/useDepartureTimer'
import { useTransitInfo } from '@/hooks/useTransitInfo'
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch'

export default function Home() {
  // 퇴근 모드 퀵 버튼으로 사용자가 확정한 출발 시각 (null = 아직 미설정)
  const [returnDepartAt, setReturnDepartAt] = useState<Date | null>(null)

  const { schedule, override, userSettings, direction, isLoading, isRouteSearching, error } =
    useSchedule()

  const { minutesLeft, isOverdue, departureTime } = useDepartureTimer({
    schedule,
    override,
    userSettings,
    direction,
    returnDepartAt,
  })

  useVisibilityRefetch()

  const {
    data: transitData,
    isLoading: transitLoading,
    isError: transitError,
    isNetworkError,
    refetch: transitRefetch,
  } = useTransitInfo({
    schedule,
    override,
    direction,
    // 퇴근 모드는 퀵 버튼을 눌러 출발 시각이 확정된 후에만 폴링 시작
    enabled:
      !isRouteSearching &&
      !isLoading &&
      schedule !== null &&
      (direction === 'commute' || returnDepartAt !== null),
  })

  // ── 로딩 ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  // ── 에러 ──────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-xl text-destructive">정보를 불러오지 못했습니다</p>
        <p className="text-center text-base text-muted-foreground">{error.message}</p>
        <Button className="min-h-[48px] text-lg" onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </main>
    )
  }

  // ── 스케줄 없음 ────────────────────────────────────────────────
  if (!schedule) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <p className="text-2xl font-bold">아직 스케줄이 없어요</p>
          <p className="mt-2 text-lg text-muted-foreground">
            출근 스케줄을 등록하면 자동으로 경로를 안내해 드릴게요
          </p>
        </div>
        <Link href="/setup">
          <Button className="min-h-[56px] px-8 text-xl">스케줄 등록하기</Button>
        </Link>
      </main>
    )
  }

  // ── 스케줄 있음 ─────────────────────────────────────────────────
  const workplaceName = override?.workplace_name ?? schedule.workplace_name
  const arrivalTime = override?.arrival_time ?? schedule.arrival_time

  // 실제 traffic_type (오버라이드 우선)
  const trafficType =
    direction === 'commute'
      ? (override?.commute_traffic_type ?? schedule.commute_traffic_type)
      : (override?.return_traffic_type ?? schedule.return_traffic_type)

  const stopName =
    direction === 'commute'
      ? schedule.commute_stop_name
      : schedule.return_stop_name

  const busNo =
    direction === 'commute'
      ? (override?.commute_bus_no ?? schedule.commute_bus_no)
      : (override?.return_bus_no ?? schedule.return_bus_no)

  const subwayLine =
    direction === 'commute'
      ? (override?.commute_subway_line ?? schedule.commute_subway_line)
      : (override?.return_subway_line ?? schedule.return_subway_line)

  return (
    <main className="mx-auto min-h-screen max-w-md p-4 pb-12">
      {/* 상단 설정 링크 */}
      <div className="mb-4 flex justify-end">
        <Link href="/setup">
          <Button variant="ghost" className="min-h-[48px] text-base" aria-label="설정">
            설정 ⚙
          </Button>
        </Link>
      </div>

      {/* 모드 헤더 (출근/퇴근) */}
      <div className="mb-6">
        <ModeHeader
          mode={direction}
          workplaceName={workplaceName}
        />
      </div>

      {/* 목표 도착 시간 (출근 모드에서만) */}
      {direction === 'commute' && arrivalTime && (
        <p className="mb-6 text-lg text-muted-foreground">
          목표 도착: <span className="font-semibold text-foreground">{arrivalTime.slice(0, 5)}</span>
        </p>
      )}

      {/* 오버라이드 배지 — role="status"로 스크린 리더에 상태 변경 알림 */}
      {override && (
        <div
          role="status"
          className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        >
          <p className="text-base">오늘만 변경된 일정입니다</p>
        </div>
      )}

      {/* 출발 타이머 (출근 모드) */}
      {direction === 'commute' && (
        <div className="mb-6">
          <DepartureTimer
            minutesLeft={minutesLeft}
            isOverdue={isOverdue}
            departureTime={departureTime}
            isRouteSearching={isRouteSearching}
            arrivalTime={arrivalTime}
          />
        </div>
      )}

      {/* 퇴근 모드 퀵 트리거 */}
      {direction === 'return' && !returnDepartAt && (
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-lg text-muted-foreground text-center">언제 출발하시나요?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="min-h-[64px] flex flex-col gap-1 text-lg font-bold"
              onClick={() => setReturnDepartAt(new Date())}
            >
              <span>지금 퇴근</span>
              <span className="text-2xl">🏃</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[64px] flex flex-col gap-1 text-lg font-bold"
              onClick={() => setReturnDepartAt(new Date(Date.now() + 10 * 60 * 1000))}
            >
              <span>10분 뒤 퇴근</span>
              <span className="text-2xl">☕</span>
            </Button>
          </div>
        </div>
      )}

      {/* 퇴근 모드 카운트다운 (출발 시각 확정 후) */}
      {direction === 'return' && returnDepartAt && (
        <div className="mb-6">
          <DepartureTimer
            minutesLeft={minutesLeft}
            isOverdue={isOverdue}
            departureTime={departureTime}
            isRouteSearching={false}
          />
          <button
            className="mt-2 w-full text-sm text-muted-foreground underline underline-offset-2"
            onClick={() => setReturnDepartAt(null)}
          >
            다시 선택
          </button>
        </div>
      )}

      {/* 퇴근 모드는 출발 시각 확정 후에만 실시간 정보 표시 */}
      {(direction === 'commute' || returnDepartAt !== null) && (
        <div className="mb-6">
          <TransitInfo
            trafficType={trafficType}
            stopName={stopName}
            busNo={busNo}
            subwayLine={subwayLine}
            data={transitData}
            isLoading={transitLoading}
            isError={transitError}
            isNetworkError={isNetworkError}
            isRouteSearching={isRouteSearching}
            onRetry={transitRefetch}
          />
        </div>
      )}

      {/* 오늘만 변경 링크 (출근/퇴근 모두 표시) */}
      <div className="text-center">
        <Link href="/override">
          <Button variant="outline" className="min-h-[48px] text-base">
            오늘만 변경
          </Button>
        </Link>
      </div>
    </main>
  )
}
