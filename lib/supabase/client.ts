import { createBrowserClient } from '@supabase/ssr'

// 브라우저용 Supabase 클라이언트 싱글턴
// createBrowserClient는 기본적으로 싱글턴으로 캐싱됨
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
