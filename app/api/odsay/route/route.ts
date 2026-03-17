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

  const path0 = data.result?.path?.[0]

  if (!path0) {
    return Response.json({ error: '경로를 찾을 수 없습니다' }, { status: 404 })
  }

  function extractTransit(path: { subPath?: SubPath[]; info?: { totalTime?: number } }) {
    const transit: SubPath | undefined = path.subPath?.find(
      (s: SubPath) => s.trafficType === 1 || s.trafficType === 2
    )
    if (!transit) return null
    const isBus = transit.trafficType === 2
    return {
      traffic_type: transit.trafficType,
      ars_id: isBus ? (transit.startArsID ?? null) : null,
      bus_no: isBus ? (transit.lane?.[0]?.busNo ?? null) : null,
      station_name: !isBus ? (transit.startName ?? null) : null,
      subway_line: !isBus ? (transit.lane?.[0]?.name ?? null) : null,
      stop_id: transit.startID ?? null,
      stop_name: transit.startName ?? null,
      route_id: transit.lane?.[0]?.busID ?? null,
    }
  }

  const primary = extractTransit(path0)
  if (!primary) {
    return Response.json({ error: '대중교통 구간을 찾을 수 없습니다' }, { status: 404 })
  }

  // path[1]이 있고 primary와 다른 경로인 경우만 secondary로 반환
  const path1 = data.result?.path?.[1]
  const secondary = path1 ? extractTransit(path1) : null

  return Response.json({
    ...primary,
    total_time: path0.info?.totalTime ?? null, // 분 단위, 타이머 계산용
    full_cache: path0,                         // JSONB 전체 저장용
    secondary,                                 // 대안 경로 (없으면 null)
  })
}
