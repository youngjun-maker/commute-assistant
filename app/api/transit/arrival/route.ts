export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'bus') {
    // stopId = commute_stop_id (ODsay 숫자 startID) — arsID 문자열 불가 (V-02 검증)
    const stopId = searchParams.get('stopId')
    const busNo = searchParams.get('busNo')

    if (!stopId) {
      return Response.json({ error: 'stopId is required' }, { status: 400 })
    }

    const url = new URL('https://api.odsay.com/v1/api/realtimeStation')
    url.searchParams.set('stationID', stopId)
    url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!)

    const res = await fetch(url.toString(), {
      headers: { Referer: process.env.ODSAY_REFERER_URL ?? '' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return Response.json({ error: `ODsay 버스 API 오류: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()

    if (data.error) {
      return Response.json({ error: data.error.message ?? 'ODsay 오류' }, { status: 500 })
    }

    // busNo로 필터링 (없으면 전체 반환)
    const realList: Array<{ routeNm: string }> = data.result?.real ?? []
    const filtered = busNo
      ? realList.filter((r) => r.routeNm === busNo)
      : realList

    return Response.json({ result: { real: filtered } })
  }

  if (type === 'subway') {
    // stopId = commute_stop_id (ODsay 숫자 startID) — stationName 파라미터 불가 (V-03 검증)
    const stopId = searchParams.get('stopId')
    const line = searchParams.get('line') // commute_subway_line (laneName으로 필터링)

    if (!stopId) {
      return Response.json({ error: 'stopId is required' }, { status: 400 })
    }

    const url = new URL('https://api.odsay.com/v1/api/realtimeSubwayStation')
    url.searchParams.set('stationID', stopId)
    url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!)

    const res = await fetch(url.toString(), {
      headers: { Referer: process.env.ODSAY_REFERER_URL ?? '' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return Response.json({ error: `ODsay 지하철 API 오류: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()

    if (data.error) {
      return Response.json({ error: data.error.message ?? 'ODsay 오류' }, { status: 500 })
    }

    // laneName으로 필터링 (없으면 전체 반환)
    // 주의: 경로탐색 lane[0].name = "수도권 4호선", 실시간 laneName = "4호선" — 부분 일치로 처리
    const realList: Array<{ laneName: string }> = data.result?.real ?? []
    const filtered = line
      ? realList.filter((r) => r.laneName.includes(line) || line.includes(r.laneName))
      : realList

    return Response.json({ result: { real: filtered } })
  }

  return Response.json({ error: 'type must be "bus" or "subway"' }, { status: 400 })
}
