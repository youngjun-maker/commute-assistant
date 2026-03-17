import webpush from 'web-push'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { toZonedTime, format } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

const KST = 'Asia/Seoul'

function getKSTMinutes(): number {
  const kst = toZonedTime(new Date(), KST)
  return parseInt(format(kst, 'H', { timeZone: KST }), 10) * 60
    + parseInt(format(kst, 'm', { timeZone: KST }), 10)
}

function getDepartureMinutes(
  arrivalTime: string,
  totalTime: number,
  bufferMinutes: number
): number {
  const [h, m] = arrivalTime.split(':').map(Number)
  return h * 60 + m - totalTime - bufferMinutes
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function sendPush(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  payload: object
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const tag = (payload as { tag?: string }).tag

  await Promise.all(
    subs.map(async (sub) => {
      // apns-collapse-id는 iOS(APNs) 전용 — FCM(Android)에 보내면 400 에러
      const isApns = sub.endpoint.includes('web.push.apple.com')
      const pushOptions = tag && isApns ? { headers: { 'apns-collapse-id': tag } } : {}
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload),
          pushOptions
        )
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )
}

// ODsay 실시간 도착 정보 텍스트 반환 (예: "470번 버스 3분 후 도착")
async function fetchTransitText(
  trafficType: number,
  stopId: string,
  busNo: string | null,
  subwayLine: string | null,
  stopName?: string | null
): Promise<string | null> {
  try {
    if (trafficType === 2) {
      const url = new URL('https://api.odsay.com/v1/api/realtimeStation')
      url.searchParams.set('stationID', stopId)
      url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!)
      const res = await fetch(url.toString(), {
        headers: { Referer: process.env.ODSAY_REFERER_URL ?? '' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const realList: Array<{ routeNm: string; arrival1?: { arrivalSec?: number } }> = data.result?.real ?? []
      const filtered = busNo ? realList.filter((r) => r.routeNm === busNo) : realList
      if (filtered.length > 0 && filtered[0].arrival1?.arrivalSec != null) {
        const mins = Math.ceil(filtered[0].arrival1.arrivalSec! / 60)
        const label = stopName ? `${busNo ?? '버스'} ${stopName}` : (busNo ?? '버스')
        return `${label} ${mins}분 후 도착`
      }
    } else if (trafficType === 1) {
      const url = new URL('https://api.odsay.com/v1/api/realtimeSubwayStation')
      url.searchParams.set('stationID', stopId)
      url.searchParams.set('apiKey', process.env.ODSAY_API_KEY!)
      const res = await fetch(url.toString(), {
        headers: { Referer: process.env.ODSAY_REFERER_URL ?? '' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const realList: Array<{ laneName: string; stationName?: string; lane?: Array<{ arrivalInfo?: Array<{ arrivalSec?: number }> }> }> = data.result?.real ?? []
      const filtered = subwayLine
        ? realList.filter((r) => r.laneName.includes(subwayLine) || subwayLine.includes(r.laneName))
        : realList
      if (filtered.length > 0) {
        const arrSec = filtered[0].lane?.[0]?.arrivalInfo?.[0]?.arrivalSec
        if (arrSec != null) {
          const mins = Math.ceil(arrSec / 60)
          const stationName = filtered[0].stationName
          const label = stationName ? `${subwayLine ?? '지하철'} ${stationName}` : (subwayLine ?? '지하철')
          return `${label} ${mins}분 후 도착`
        }
      }
    }
  } catch {
    return null
  }
  return null
}

async function handleNotify() {
  const supabase = createSupabaseServiceClient()
  const nowMin = getKSTMinutes()

  const kstDate = toZonedTime(new Date(), KST)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDay = days[kstDate.getDay()]
  const todayStr = format(kstDate, 'yyyy-MM-dd', { timeZone: KST })

  // ── 출근 알림: 출발 10분 전부터 1분 후까지, 매분 실시간 정보 포함 ──────────
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      user_id,
      workplace_name,
      arrival_time,
      odsay_route_cache,
      commute_traffic_type,
      commute_stop_id,
      commute_stop_name,
      commute_bus_no,
      commute_subway_line,
      user_settings!inner(buffer_minutes)
    `)
    .eq('day', todayDay)
    .eq('is_active', true)

  if (schedules && schedules.length > 0) {
    for (const schedule of schedules) {
      const settings = Array.isArray(schedule.user_settings)
        ? schedule.user_settings[0]
        : schedule.user_settings
      const bufferMin: number = settings?.buffer_minutes ?? 5

      if (schedule.arrival_time && schedule.odsay_route_cache) {
        const cache = schedule.odsay_route_cache as { info?: { totalTime?: number } }
        const totalTime = cache?.info?.totalTime
        if (totalTime) {
          const departMin = getDepartureMinutes(schedule.arrival_time, totalTime, bufferMin)
          // 출발 10분 전 ~ 1분 후 구간
          if (nowMin >= departMin - 10 && nowMin <= departMin + 1) {
            const minutesLeft = departMin - nowMin
            const title = minutesLeft <= 0 ? '지금 바로 출발하세요!' : `${minutesLeft}분 후 출발하세요`

            // 실시간 도착 정보 조회
            let body = schedule.workplace_name ?? '출근지'
            if (schedule.commute_traffic_type && schedule.commute_stop_id) {
              const transitText = await fetchTransitText(
                schedule.commute_traffic_type,
                String(schedule.commute_stop_id),
                schedule.commute_bus_no ?? null,
                schedule.commute_subway_line ?? null,
                schedule.commute_stop_name ?? null
              )
              if (transitText) body = transitText
            }

            await sendPush(supabase, schedule.user_id, {
              type: 'commute',
              title,
              body,
              tag: 'commute', // 같은 tag → 이전 알림 교체
            })
          }
        }
      }
    }
  }

  // ── 퇴근 예고 알림: 퇴근 시작 30분 전 1회 ───────────────────────────────
  const { data: allSettings } = await supabase
    .from('user_settings')
    .select('user_id, return_start_hour, return_start_minute, return_depart_at')

  if (allSettings && allSettings.length > 0) {
    for (const settings of allSettings) {
      const returnStartHour: number = settings?.return_start_hour ?? 17
      const returnStartMinute: number = settings?.return_start_minute ?? 0
      const returnNotifyMin = returnStartHour * 60 + returnStartMinute - 30
      if (nowMin === returnNotifyMin) {
        await sendPush(supabase, settings.user_id, {
          type: 'return',
          title: '퇴근 시간이 됐어요',
          body: '언제 퇴근하세요?',
          tag: 'return',
          actions: [
            { action: 'depart_now', title: '지금 퇴근' },
          ],
        })
      }

      // ── 퇴근 실시간 알림: return_depart_at 기준 20분간 매분 ──────────────
      if (settings.return_depart_at) {
        const departedMs = Date.now() - new Date(settings.return_depart_at).getTime()
        const departedMin = Math.floor(departedMs / 60000)
        if (departedMin >= 0 && departedMin < 20) {
          // 오늘 스케줄에서 퇴근 경로 정보 조회 (오버라이드 우선)
          const [scheduleRes, overrideRes] = await Promise.all([
            supabase
              .from('schedules')
              .select('return_traffic_type, return_stop_id, return_stop_name, return_bus_no, return_subway_line')
              .eq('user_id', settings.user_id)
              .eq('day', todayDay)
              .eq('is_active', true)
              .maybeSingle(),
            supabase
              .from('overrides')
              .select('return_traffic_type, return_stop_id, return_bus_no, return_subway_line')
              .eq('user_id', settings.user_id)
              .eq('override_date', todayStr)
              .maybeSingle(),
          ])

          const ov = overrideRes.data
          const sc = scheduleRes.data
          const trafficType = ov?.return_traffic_type ?? sc?.return_traffic_type
          const stopId = ov?.return_stop_id ?? sc?.return_stop_id
          const busNo = ov?.return_bus_no ?? sc?.return_bus_no ?? null
          const subwayLine = ov?.return_subway_line ?? sc?.return_subway_line ?? null

          const stopName = sc?.return_stop_name ?? null
          if (trafficType && stopId) {
            const transitText = await fetchTransitText(trafficType, String(stopId), busNo, subwayLine, stopName)
            const body = transitText ?? (stopName ? `${stopName} 실시간 정보를 확인하세요` : '앱에서 확인하세요')
            await sendPush(supabase, settings.user_id, {
              type: 'return-transit',
              title: '귀갓길 실시간 정보',
              body,
              tag: 'return-transit',
            })
          }
        }
      }
    }
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  await handleNotify()
  return Response.json({ ok: true })
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: '인증 실패' }, { status: 401 })
  }
  await handleNotify()
  return Response.json({ ok: true })
}
