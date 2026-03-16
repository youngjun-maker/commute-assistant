export const dynamic = 'force-dynamic'

interface SubPath {
  trafficType: number
  startID: number
  startName: string
  startArsID?: string
  lane?: Array<{
    busNo?: string
    busID?: number
    name?: string
  }>
}

export async function POST(request: Request) {
  const { sx, sy, ex, ey } = await request.json()

  if (!sx || !sy || !ex || !ey) {
    return Response.json({ error: 'sx, sy, ex, ey are required' }, { status: 400 })
  }

  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT')
  url.searchParams.set('SX', String(sx))
  url.searchParams.set('SY', String(sy))
  url.searchParams.set('EX', String(ex))
  url.searchParams.set('EY', String(ey))
  url.searchParams.set('SearchType', '0')
  url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!)

  // ODsay는 등록된 도메인의 Referer 헤더가 있어야 인증 통과
  const res = await fetch(url.toString(), {
    headers: { Referer: process.env.ODSAY_REFERER_URL ?? '' },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    return Response.json({ error: `ODsay API 오류: ${res.status}` }, { status: res.status })
  }

  const data = await res.json()

  if (data.error) {
    return Response.json({ error: data.error.message ?? 'ODsay 오류' }, { status: 500 })
  }

  const path = data.result?.path?.[0]

  if (!path) {
    return Response.json({ error: '경로를 찾을 수 없습니다' }, { status: 404 })
  }

  // 첫 번째 대중교통 구간 (trafficType 1=지하철, 2=버스, 3=도보 제외)
  const firstTransit: SubPath | undefined = path.subPath?.find(
    (s: SubPath) => s.trafficType === 1 || s.trafficType === 2
  )

  if (!firstTransit) {
    return Response.json({ error: '대중교통 구간을 찾을 수 없습니다' }, { status: 404 })
  }

  const isBus = firstTransit.trafficType === 2

  return Response.json({
    traffic_type: firstTransit.trafficType,
    // 버스 전용
    ars_id: isBus ? (firstTransit.startArsID ?? null) : null,      // 참고용 (실시간 API 직접 사용 불가 — V-02)
    bus_no: isBus ? (firstTransit.lane?.[0]?.busNo ?? null) : null, // 실시간 API 필터링용
    // 지하철 전용
    station_name: !isBus ? (firstTransit.startName ?? null) : null,
    subway_line: !isBus ? (firstTransit.lane?.[0]?.name ?? null) : null, // 실시간 API 필터링용
    // 공통 — stop_id(startID)가 실시간 API stationID 파라미터의 핵심 값 (V-02, V-03)
    stop_id: firstTransit.startID ?? null,
    stop_name: firstTransit.startName ?? null,
    route_id: firstTransit.lane?.[0]?.busID ?? null, // 참고용
    total_time: path.info?.totalTime ?? null,        // 분 단위, 타이머 계산용
    full_cache: path,                                // JSONB 전체 저장용
  })
}
