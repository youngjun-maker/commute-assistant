import { createSupabaseServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// 서비스워커 pushsubscriptionchange 전용 — 앱을 열지 않아도 구독 갱신
// old_endpoint를 신원 증명으로 사용 (endpoint URL은 브라우저·서버만 아는 시크릿)
export async function POST(request: Request) {
  try {
    const { old_endpoint, endpoint, p256dh, auth } = await request.json()

    if (!old_endpoint || !endpoint || !p256dh || !auth) {
      return Response.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // 기존 구독으로 user_id 조회
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('endpoint', old_endpoint)
      .maybeSingle()

    if (!existing) {
      // 기존 구독 없음 — 무시 (이미 다른 경로로 갱신됐을 수 있음)
      return Response.json({ ok: true })
    }

    // 기존 구독 삭제 후 새 구독 저장
    await supabase.from('push_subscriptions').delete().eq('user_id', existing.user_id)
    await supabase.from('push_subscriptions').insert({
      user_id: existing.user_id,
      endpoint,
      p256dh,
      auth_key: auth,
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}
