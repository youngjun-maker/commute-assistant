import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return Response.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: '인증 필요' }, { status: 401 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}
