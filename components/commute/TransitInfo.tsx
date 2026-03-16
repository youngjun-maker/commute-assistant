import { Button } from '@/components/ui/button'
import type { TransitArrivalResult } from '@/lib/transit'

interface TransitInfoProps {
  trafficType: number | null // 1=지하철, 2=버스
  stopName: string | null
  busNo: string | null
  subwayLine: string | null
  data: TransitArrivalResult | null
  isLoading: boolean
  isError: boolean
  isNetworkError: boolean
  isRouteSearching: boolean
  onRetry: () => void
}

function formatArrival(arrivalSec: number): string {
  const minutes = Math.ceil(arrivalSec / 60)
  if (minutes <= 0) return '곧 도착'
  return `${minutes}분 후 도착`
}

export function TransitInfo({
  trafficType,
  stopName,
  busNo,
  subwayLine,
  data,
  isLoading,
  isError,
  isNetworkError,
  isRouteSearching,
  onRetry,
}: TransitInfoProps) {
  // 경로 탐색 전
  if (isRouteSearching || trafficType === null) {
    return (
      <div className="rounded-2xl bg-muted p-6">
        <p className="text-lg text-muted-foreground text-center">경로 탐색 후 도착 정보가 표시됩니다</p>
      </div>
    )
  }

  // 네트워크 에러 (3회 연속 실패)
  if (isNetworkError) {
    return (
      <div className="rounded-2xl bg-muted p-6 flex flex-col gap-4 items-center">
        <p className="text-lg text-center">네트워크 오류로 실시간 정보를 불러오지 못했습니다</p>
        <Button
          variant="outline"
          className="min-h-[48px] text-lg w-full"
          onClick={onRetry}
        >
          다시 시도
        </Button>
      </div>
    )
  }

  // 일반 에러
  if (isError && !data) {
    return (
      <div className="rounded-2xl bg-muted p-6 flex flex-col gap-3 items-center">
        <p className="text-lg text-center text-muted-foreground">도착 정보를 불러오지 못했습니다</p>
        <Button
          variant="outline"
          className="min-h-[48px] text-base w-full"
          onClick={onRetry}
        >
          다시 시도
        </Button>
      </div>
    )
  }

  // 로딩 (초기 + 데이터 없음)
  if (isLoading && !data) {
    return (
      <div className="rounded-2xl bg-muted p-6 animate-pulse">
        <div className="h-6 bg-muted-foreground/20 rounded w-1/2 mb-3" />
        <div className="h-10 bg-muted-foreground/20 rounded w-3/4" />
      </div>
    )
  }

  // 데이터 없음 (빈 응답)
  if (!data) {
    const lineLabel = trafficType === 2 ? busNo : subwayLine
    return (
      <div className="rounded-2xl bg-muted p-6">
        <p className="text-base text-muted-foreground">
          {stopName ?? '정류장'} · {lineLabel ?? '노선'}
        </p>
        <p className="mt-2 text-lg font-medium">현재 운행 정보가 없습니다</p>
      </div>
    )
  }

  // 정상 데이터
  const isBus = data.type === 'bus'
  const lineLabel = data.line

  return (
    <div className="rounded-2xl border bg-card p-6 flex flex-col gap-4" role="region" aria-label="실시간 도착 정보">
      {/* 정류장/역 정보 */}
      <div>
        <p className="text-base text-muted-foreground">
          {isBus ? '버스 정류장' : '지하철역'} · {lineLabel}
        </p>
        <p className="text-xl font-semibold mt-1">{data.stopName}</p>
      </div>

      {/* 다음 차량 */}
      <div className="flex flex-col gap-1">
        <p className="text-base text-muted-foreground">다음 차량</p>
        <p className="text-3xl font-bold text-primary" aria-live="polite">
          {formatArrival(data.next.arrivalSec)}
        </p>
        <p className="text-base text-muted-foreground">
          {/* 버스는 "정류장 전", 지하철은 "역 전"으로 표시 */}
          {data.next.leftStation}{isBus ? '정류장 전' : '역 전'}
          {isBus
            ? (data.next.message && ` · ${data.next.message}`)
            : (data.direction && ` · ${data.direction}`)}
        </p>
      </div>

      {/* 이후 차량 */}
      {data.following && (
        <div className="border-t pt-3">
          <p className="text-base text-muted-foreground">이후 차량</p>
          <p className="text-xl font-medium mt-1">
            {formatArrival(data.following.arrivalSec)}
          </p>
          <p className="text-base text-muted-foreground">
            {/* 버스는 "정류장 전", 지하철은 "역 전"으로 표시 */}
            {data.following.leftStation}{isBus ? '정류장 전' : '역 전'}
          </p>
        </div>
      )}
    </div>
  )
}
