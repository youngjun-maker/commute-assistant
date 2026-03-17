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

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        // 410 Gone: 만료된 구독 삭제
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )
}

async function handleNotify() {
  const supabase = createSupabaseServiceClient()
  const nowMin = getKSTMinutes()

  // 오늘 KST 요일 (pg day_of_week enum과 맞춤)
  const kstDate = toZonedTime(new Date(), KST)
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDay = days[kstDate.getDay()]

  // 활성 스케줄 + user_settings 조회
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      user_id,
      workplace_name,
      arrival_time,
      odsay_route_cache,
      user_settings!inner(buffer_minutes, return_start_hour)
    `)
    .eq('day', todayDay)
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) return

  for (const schedule of schedules) {
    const settings = Array.isArray(schedule.user_settings)
      ? schedule.user_settings[0]
      : schedule.user_settings
    const bufferMin: number = settings?.buffer_minutes ?? 5
    const returnStartHour: number = settings?.return_start_hour ?? 17

    // ── 출근 알림: 출발 시각 ±1분 ────────────────────────
    if (schedule.arrival_time && schedule.odsay_route_cache) {
      const cache = schedule.odsay_route_cache as { info?: { totalTime?: number } }
      const totalTime = cache?.info?.totalTime
      if (totalTime) {
        const departMin = getDepartureMinutes(schedule.arrival_time, totalTime, bufferMin)
        if (Math.abs(nowMin - departMin) <= 1) {
          const minutesLeft = departMin - nowMin
          const title = minutesLeft <= 0 ? '지금 바로 출발하세요!' : `${minutesLeft}분 후 출발하세요`
          await sendPush(supabase, schedule.user_id, {
            type: 'commute',
            title,
            body: schedule.workplace_name ?? '출근지',
            tag: 'commute',
          })
        }
      }
    }

    // ── 퇴근 알림: return_start_hour - 30분 ±1분 ────────
    const returnNotifyMin = returnStartHour * 60 - 30
    if (Math.abs(nowMin - returnNotifyMin) <= 1) {
      await sendPush(supabase, schedule.user_id, {
        type: 'return',
        title: '퇴근 시간이 됐어요',
        body: '언제 퇴근하세요?',
        tag: 'return',
        actions: [
          { action: 'depart_now', title: '지금 퇴근' },
          { action: 'depart_10', title: '10분 후' },
        ],
      })
    }
  }
}

// Vercel Cron (GET) 및 Supabase pg_cron (POST) 모두 지원
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
