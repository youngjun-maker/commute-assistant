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
  if (isRouteSearching) {
    return (
      <div className="rounded-2xl bg-muted p-6 text-center">
        <p className="text-2xl font-semibold text-muted-foreground">경로를 탐색 중입니다</p>
        <p className="mt-2 text-base text-muted-foreground">잠시만 기다려 주세요...</p>
      </div>
    )
  }

  if (minutesLeft === null) {
    return (
      <div className="rounded-2xl bg-muted p-6 text-center">
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
      className={`rounded-2xl p-6 text-center ${
        isUrgent ? 'bg-destructive/10' : 'bg-primary/10'
      }`}
    >
      <p
        className={`text-4xl font-bold leading-tight ${
          isUrgent ? 'text-destructive' : 'text-primary'
        }`}
        aria-live="polite"
        aria-label={
          isUrgent
            ? '서둘러 출발하세요'
            : `${minutesLeft}분 뒤 출발하세요`
        }
      >
        {isUrgent ? '서둘러 출발하세요!' : `${minutesLeft}분 뒤 출발하세요`}
      </p>

      {departureTime && !isUrgent && (
        <p className="mt-3 text-lg text-muted-foreground">
          권장 출발 시각: {formatKSTTime(departureTime)}
        </p>
      )}
    </div>
  )
}
