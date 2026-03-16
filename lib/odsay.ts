import { supabase } from '@/lib/supabase/client'

export interface OdsayRouteResult {
  traffic_type: number | null      // 1=지하철, 2=버스
  ars_id: string | null            // 버스 전용 (참고용)
  bus_no: string | null            // 버스 노선 번호
  station_name: string | null      // 지하철 역명
  subway_line: string | null       // 지하철 노선명
  stop_id: number | null           // ODsay startID — 실시간 API stationID 파라미터
  stop_name: string | null         // 정류장/역 이름
  route_id: number | null          // ODsay busID (참고용)
  total_time: number | null        // 총 소요 시간 (분)
  full_cache: Record<string, unknown> | null
}

export interface Schedule {
  id: string
  user_id: string
  day: string
  is_active: boolean
  workplace_name: string
  workplace_address: string
  workplace_lat: number
  workplace_lng: number
  arrival_time: string
  commute_traffic_type: number | null
  commute_ars_id: string | null
  commute_bus_no: string | null
  commute_station_name: string | null
  commute_subway_line: string | null
  commute_stop_id: string | null
  commute_stop_name: string | null
  commute_route_id: string | null
  odsay_route_cache: Record<string, unknown> | null
  route_cached_at: string | null
  return_traffic_type: number | null
  return_ars_id: string | null
  return_bus_no: string | null
  return_station_name: string | null
  return_subway_line: string | null
  return_stop_id: string | null
  return_stop_name: string | null
  return_route_id: string | null
  return_odsay_cache: Record<string, unknown> | null
  return_route_cached_at: string | null
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  home_address: string
  home_lat: number
  home_lng: number
  buffer_minutes: number
  commute_start_hour: number
  commute_end_hour: number
}

/** ODsay 경로 탐색 Route Handler 호출 */
export async function fetchOdsayRoute(
  sx: number,
  sy: number,
  ex: number,
  ey: number
): Promise<OdsayRouteResult> {
  const res = await fetch('/api/odsay/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sx, sy, ex, ey }),
  })

  if (!res.ok) {
    throw new Error(`ODsay 경로 탐색 실패: ${res.status}`)
  }

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return data as OdsayRouteResult
}

/** 캐시 만료 여부 확인 (7일 기준) */
function isCacheExpired(cachedAt: string | null): boolean {
  if (!cachedAt) return true
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return new Date(cachedAt) < sevenDaysAgo
}

/**
 * ODsay 경로 캐시 유효성 검사 후 필요 시 갱신
 * @param scheduleId - schedules.id
 * @param direction - 'commute' | 'return'
 * @returns 최신 schedule 레코드
 */
export async function checkAndRefreshRouteCache(
  scheduleId: string,
  direction: 'commute' | 'return'
): Promise<Schedule> {
  // 1. 현재 schedule + user_settings 조회
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (scheduleError || !schedule) {
    throw new Error(`스케줄 조회 실패: ${scheduleError?.message}`)
  }

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('home_lat, home_lng')
    .eq('user_id', schedule.user_id)
    .single()

  if (settingsError || !settings) {
    throw new Error(`사용자 설정 조회 실패: ${settingsError?.message}`)
  }

  // 2. 캐시 유효성 확인
  const cachedAt =
    direction === 'commute' ? schedule.route_cached_at : schedule.return_route_cached_at
  const cache =
    direction === 'commute' ? schedule.odsay_route_cache : schedule.return_odsay_cache

  if (cache !== null && !isCacheExpired(cachedAt)) {
    return schedule as Schedule
  }

  // 3. 캐시 만료 — ODsay 재탐색
  const isCommute = direction === 'commute'
  const sx = isCommute ? settings.home_lng : schedule.workplace_lng
  const sy = isCommute ? settings.home_lat : schedule.workplace_lat
  const ex = isCommute ? schedule.workplace_lng : settings.home_lng
  const ey = isCommute ? schedule.workplace_lat : settings.home_lat

  const result = await fetchOdsayRoute(sx, sy, ex, ey)

  // 4. Supabase 업데이트
  const now = new Date().toISOString()
  const updatePayload =
    direction === 'commute'
      ? {
          commute_traffic_type: result.traffic_type,
          commute_ars_id: result.ars_id,
          commute_bus_no: result.bus_no,
          commute_station_name: result.station_name,
          commute_subway_line: result.subway_line,
          commute_stop_id: result.stop_id ? String(result.stop_id) : null,
          commute_stop_name: result.stop_name,
          commute_route_id: result.route_id ? String(result.route_id) : null,
          odsay_route_cache: result.full_cache,
          route_cached_at: now,
          updated_at: now,
        }
      : {
          return_traffic_type: result.traffic_type,
          return_ars_id: result.ars_id,
          return_bus_no: result.bus_no,
          return_station_name: result.station_name,
          return_subway_line: result.subway_line,
          return_stop_id: result.stop_id ? String(result.stop_id) : null,
          return_stop_name: result.stop_name,
          return_route_id: result.route_id ? String(result.route_id) : null,
          return_odsay_cache: result.full_cache,
          return_route_cached_at: now,
          updated_at: now,
        }

  const { data: updated, error: updateError } = await supabase
    .from('schedules')
    .update(updatePayload)
    .eq('id', scheduleId)
    .select()
    .single()

  if (updateError || !updated) {
    throw new Error(`스케줄 캐시 업데이트 실패: ${updateError?.message}`)
  }

  return updated as Schedule
}
