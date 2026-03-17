// 출발 타이머 컴포넌트 — 흰색 카드 기반, 핵심 숫자 초대형 강조
interface DepartureTimerProps {
  minutesLeft: number | null
  isOverdue: boolean
  departureTime: Date | null
  isRouteSearching: boolean
  arrivalTime?: string | null // 한도 초과 fallback — 목표 도착 시간만 표시
}

function formatKSTTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  })
}

export function DepartureTimer({
  minutesLeft,
  isOverdue,
  departureTime,
  isRouteSearching,
  arrivalTime,
}: DepartureTimerProps) {
  // 경로 탐색 중 상태
  if (isRouteSearching) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
        <p className="text-2xl font-semibold text-muted-foreground">경로를 탐색 중입니다</p>
        <p className="mt-2 text-lg text-muted-foreground">잠시만 기다려 주세요...</p>
      </div>
    )
  }

  // 출발 시각 계산 불가 상태
  if (minutesLeft === null) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
        {arrivalTime ? (
          <>
            <p className="text-2xl font-semibold text-muted-foreground">실시간 경로 정보 없음</p>
            <p className="mt-2 text-lg text-muted-foreground">
              목표 도착: <span className="font-semibold text-foreground">{arrivalTime.slice(0, 5)}</span>
            </p>
          </>
        ) : (
          <p className="text-2xl font-semibold text-muted-foreground">출발 시각 계산 중...</p>
        )}
      </div>
    )
  }

  const isUrgent = isOverdue || minutesLeft === 0

  return (
    <div
      className={`rounded-3xl p-6 text-center ${
        isUrgent ? 'bg-destructive/5' : 'bg-white shadow-sm'
      }`}
    >
      {isUrgent ? (
        /* 긴박 상태 — 전체 텍스트를 크게 강조 */
        <p
          className="text-5xl font-black text-destructive leading-tight"
          aria-live="polite"
          aria-label="서둘러 출발하세요"
        >
          서둘러 출발하세요!
        </p>
      ) : (
        /* 일반 상태 — 숫자만 초대형으로, 텍스트는 별도 크기 */
        <p
          aria-live="polite"
          aria-label={`${minutesLeft}분 뒤 출발하세요`}
        >
          <span className="block text-6xl font-black text-[oklch(0.45_0.15_180)]">
            {minutesLeft}분
          </span>
          <span className="text-2xl font-semibold">뒤 출발하세요</span>
        </p>
      )}

      {/* 권장 출발 시각 — 긴박하지 않을 때만 표시 */}
      {departureTime && !isUrgent && (
        <p className="mt-4 text-lg text-muted-foreground">
          권장 출발 시각: {formatKSTTime(departureTime)}
        </p>
      )}
    </div>
  )
}
