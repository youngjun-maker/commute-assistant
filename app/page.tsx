'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ModeHeader } from '@/components/commute/ModeHeader'
import { DepartureTimer } from '@/components/commute/DepartureTimer'
import { TransitInfo } from '@/components/commute/TransitInfo'
import { useSchedule } from '@/hooks/useSchedule'
import { useDepartureTimer } from '@/hooks/useDepartureTimer'
import { useTransitInfo } from '@/hooks/useTransitInfo'
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { getKSTDate, getKSTHour } from '@/lib/utils'
import type { RouteOption } from '@/components/commute/TransitInfo'

const LS_KEY = () => `return-depart-at-${getKSTDate()}`

export default function Home() {
  // 퇴근 모드 퀵 버튼으로 사용자가 확정한 출발 시각 (null = 아직 미설정)
  const [returnDepartAt, setReturnDepartAt] = useState<Date | null>(null)
  // 직접 시각 입력 상태
  const [customTimeInput, setCustomTimeInput] = useState('')
  // 선택된 경로 인덱스 (0=1순위, 1=대안)
  const [selectedRoute, setSelectedRoute] = useState<0 | 1>(0)

  // localStorage에서 오늘 퇴근 출발 시각 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY())
      if (saved) setReturnDepartAt(new Date(saved))
    } catch {}
  }, [])

  const handleSetReturnDepart = (date: Date) => {
    setReturnDepartAt(date)
    try { localStorage.setItem(LS_KEY(), date.toISOString()) } catch {}
  }

  const handleClearReturnDepart = () => {
    setReturnDepartAt(null)
    setCustomTimeInput('')
    try { localStorage.removeItem(LS_KEY()) } catch {}
  }

  const handleCustomTimeConfirm = () => {
    if (!customTimeInput) return
    const [h, m] = customTimeInput.split(':').map(Number)
    const target = new Date()
    target.setHours(h, m, 0, 0)
    handleSetReturnDepart(target)
  }

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
    routeIndex: selectedRoute,
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
        {/* 빈 상태 카드 */}
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center mx-auto">
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
    <>
    <main className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-16">
      {/* 상단 설정 링크 */}
      <div className="mb-4 flex justify-end">
        <Link href="/setup">
          <Button variant="ghost" className="min-h-[48px] text-base text-muted-foreground" aria-label="설정">
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

      {/* 목표 도착 시간 pill — 출근 민트 테마 */}
      {direction === 'commute' && arrivalTime && (
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.95_0.05_180)] px-4 py-1.5 text-lg font-medium text-[oklch(0.25_0.06_180)]">
            목표 도착: {arrivalTime.slice(0, 5)}
          </span>
        </div>
      )}

      {/* 오버라이드 배지 — role="status"로 스크린 리더에 상태 변경 알림 */}
      {override && (
        <div
          role="status"
          className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
        >
          <p className="text-lg">오늘만 변경된 일정입니다</p>
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

      {/* 퇴근 모드 */}
      {direction === 'return' && (() => {
        const kstHour = getKSTHour()
        const returnStart = userSettings?.return_start_hour ?? 17
        const returnEnd   = userSettings?.return_end_hour   ?? 22

        // ① 출발 시각 확정 후 → 카운트다운
        if (returnDepartAt) {
          return (
            <div className="mb-6">
              <DepartureTimer
                minutesLeft={minutesLeft}
                isOverdue={isOverdue}
                departureTime={departureTime}
                isRouteSearching={false}
              />
              <button
                className="mt-2 w-full min-h-[48px] text-base text-muted-foreground/70 underline underline-offset-2"
                onClick={handleClearReturnDepart}
                aria-label="퇴근 출발 시각 다시 선택"
              >
                다시 선택
              </button>
            </div>
          )
        }

        // ② 퇴근 시간대 이전 → 조용히 대기 (아무것도 표시 안 함)
        if (kstHour < returnStart) return null

        // ③ 퇴근 시간대 종료 후 → 귀가 완료 메시지
        if (kstHour >= returnEnd) {
          return (
            <div className="mb-6 rounded-2xl bg-[oklch(0.96_0.02_250)] px-6 py-5 text-center">
              <p className="text-2xl font-bold">오늘도 수고하셨습니다 🌙</p>
              <p className="mt-1 text-lg text-muted-foreground">편안한 저녁 되세요</p>
            </div>
          )
        }

        // ④ 퇴근 시간대 내 → 출발 시각 선택 UI
        const quickOptions = [
          { label: '지금 퇴근', mins: 0, primary: true },
          { label: '10분 뒤', mins: 10, primary: false },
          { label: '20분 뒤', mins: 20, primary: false },
          { label: '30분 뒤', mins: 30, primary: false },
          { label: '40분 뒤', mins: 40, primary: false },
          { label: '1시간 뒤', mins: 60, primary: false },
        ]
        return (
          <div className="mb-6 flex flex-col gap-4">
            <p className="text-xl font-semibold text-center">퇴근 시간이 정해지셨나요?</p>

            {/* 퀵 버튼 3열 그리드 */}
            <div className="grid grid-cols-3 gap-3">
              {quickOptions.map(({ label, mins, primary }) => (
                <Button
                  key={label}
                  variant={primary ? 'default' : 'outline'}
                  className={
                    primary
                      ? 'min-h-[64px] text-lg font-bold bg-[oklch(0.85_0.12_55)] hover:bg-[oklch(0.80_0.14_55)] text-[oklch(0.25_0.08_55)] border-0'
                      : 'min-h-[64px] text-lg font-bold border-[oklch(0.85_0.12_55)] text-[oklch(0.35_0.10_55)]'
                  }
                  onClick={() => handleSetReturnDepart(new Date(Date.now() + mins * 60 * 1000))}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 직접 시각 입력 */}
            <div className="rounded-2xl border border-border px-4 py-4 flex flex-col gap-3">
              <p className="text-base text-muted-foreground text-center">정확한 퇴근 시각이 있으신가요?</p>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  className="flex-1 min-h-[52px] rounded-xl border border-input bg-background px-4 text-xl text-center"
                  aria-label="퇴근 시각 직접 입력"
                />
                <Button
                  className="min-h-[52px] px-5 text-lg font-bold"
                  disabled={!customTimeInput}
                  onClick={handleCustomTimeConfirm}
                >
                  확인
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 퇴근 모드는 출발 시각 확정 후에만 실시간 정보 표시 */}
      {(direction === 'commute' || returnDepartAt !== null) && (() => {
        // 대안 경로 탭 옵션 계산 (secondary 컬럼이 있을 때만)
        const isReturn = direction === 'return'
        const t1 = isReturn ? schedule.return_traffic_type : (override?.commute_traffic_type ?? schedule.commute_traffic_type)
        const s1 = isReturn ? schedule.return_stop_name : schedule.commute_stop_name
        const l1 = isReturn
          ? (t1 === 2 ? (override?.return_bus_no ?? schedule.return_bus_no) : schedule.return_subway_line)
          : (t1 === 2 ? (override?.commute_bus_no ?? schedule.commute_bus_no) : schedule.commute_subway_line)
        const t2 = isReturn ? schedule.return_traffic_type_2 : schedule.commute_traffic_type_2
        const s2 = isReturn ? schedule.return_stop_name_2 : schedule.commute_stop_name_2
        const l2 = isReturn
          ? (t2 === 2 ? schedule.return_bus_no_2 : schedule.return_subway_line_2)
          : (t2 === 2 ? schedule.commute_bus_no_2 : schedule.commute_subway_line_2)

        const routes: RouteOption[] | undefined =
          t1 && s1 && l1 && t2 && s2 && l2
            ? [
                { index: 0, trafficType: t1, stopName: s1, lineLabel: l1 },
                { index: 1, trafficType: t2, stopName: s2, lineLabel: l2 },
              ]
            : undefined

        return (
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
              routes={routes}
              selectedRouteIndex={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />
          </div>
        )
      })()}

      {/* 오늘만 변경 링크 (출근/퇴근 모두 표시) */}
      <div className="text-center">
        <Link href="/override">
          <Button variant="outline" className="min-h-[48px] text-base">
            오늘만 변경
          </Button>
        </Link>
      </div>
    </main>
    <InstallPrompt />
    </>
  )
}
