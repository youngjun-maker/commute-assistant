export interface TransitArrivalResult {
  type: 'bus' | 'subway'
  stopName: string
  line: string
  direction?: string  // 지하철 방면 (예: "마천 방면")
  next: {
    arrivalSec: number
    leftStation: number
    message?: string
  }
  following?: {
    arrivalSec: number
    leftStation: number
  }
}

export interface BusParams {
  type: 'bus'
  stopId: string   // commute_stop_id (ODsay 숫자 startID)
  stopName: string // commute_stop_name
  busNo: string    // commute_bus_no
}

export interface SubwayParams {
  type: 'subway'
  stopId: string   // commute_stop_id (ODsay 숫자 startID)
  stopName: string // commute_stop_name
  line: string     // commute_subway_line
}

export async function fetchTransitArrival(
  params: BusParams | SubwayParams
): Promise<TransitArrivalResult> {
  const url = new URL('/api/transit/arrival', window.location.origin)
  url.searchParams.set('type', params.type)
  url.searchParams.set('stopId', params.stopId)

  if (params.type === 'bus') {
    url.searchParams.set('busNo', params.busNo)
  } else {
    url.searchParams.set('line', params.line)
  }

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error(`실시간 도착 정보 오류: ${res.status}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error)
  }

  const realList = data.result?.real ?? []

  if (params.type === 'bus') {
    const item = realList[0]
    if (!item) {
      throw new Error('도착 정보 없음')
    }
    return {
      type: 'bus',
      stopName: params.stopName,
      line: item.routeNm,
      next: {
        arrivalSec: item.arrival1?.arrivalSec ?? 0,
        leftStation: item.arrival1?.leftStation ?? 0,
        message: item.arrival1?.arrivalMsg,
      },
      following: item.arrival2
        ? {
            arrivalSec: item.arrival2.arrivalSec ?? 0,
            leftStation: item.arrival2.leftStation ?? 0,
          }
        : undefined,
    }
  } else {
    const item = realList[0]
    if (!item) {
      throw new Error('도착 정보 없음')
    }
    const firstLane = item.lane?.[0]
    const firstArrival = firstLane?.arrivalInfo?.[0]
    const secondArrival = firstLane?.arrivalInfo?.[1]

    return {
      type: 'subway',
      stopName: item.stationName ?? params.stopName,
      line: item.laneName,
      direction: firstLane?.directionNm,
      next: {
        arrivalSec: firstArrival?.arrivalSec ?? 0,
        leftStation: firstArrival?.leftStationCnt ?? 0,
        message: firstArrival?.arrivalMsg,
      },
      following: secondArrival
        ? {
            arrivalSec: secondArrival.arrivalSec ?? 0,
            leftStation: secondArrival.leftStationCnt ?? 0,
          }
        : undefined,
    }
  }
}
