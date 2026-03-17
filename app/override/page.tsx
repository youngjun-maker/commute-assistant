'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TimeInput } from '@/components/schedule/TimeInput'
import { AddressSearch } from '@/components/schedule/AddressSearch'
import { supabase } from '@/lib/supabase/client'
import { fetchOdsayRoute } from '@/lib/odsay'
import { getKSTDate } from '@/lib/utils'

type OverrideMode = 'time' | 'place' | 'both' | null

interface ExistingOverride {
  id: string
  arrival_time: string | null
  workplace_name: string | null
  workplace_address: string | null
  route_cached_at: string | null
}

interface WorkplaceSelection {
  name: string
  address: string
  lat: number
  lng: number
}

export default function OverridePage() {
  const router = useRouter()
  const [mode, setMode] = useState<OverrideMode>(null)
  const [existingOverride, setExistingOverride] = useState<ExistingOverride | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 폼 상태
  const [arrivalTime, setArrivalTime] = useState('')
  const [workplace, setWorkplace] = useState<WorkplaceSelection | null>(null)

  useEffect(() => {
    async function loadOverride() {
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('overrides')
          .select('id, arrival_time, workplace_name, workplace_address, route_cached_at')
          .eq('user_id', user.id)
          .eq('override_date', getKSTDate())
          .maybeSingle()

        if (data) {
          setExistingOverride(data)
          if (data.arrival_time) setArrivalTime(data.arrival_time.slice(0, 5))
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadOverride()
  }, [])

  // T-47: 목표 시간만 변경 저장
  async function saveTimeOverride() {
    setSaveError(null)
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 세션이 없습니다')

      const { error } = await supabase
        .from('overrides')
        .upsert(
          { user_id: user.id, override_date: getKSTDate(), arrival_time: arrivalTime },
          { onConflict: 'user_id,override_date' }
        )

      if (error) throw new Error(error.message)
      router.push('/')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  // T-48: 출근지 변경 저장 (출근+퇴근 ODsay 동시 탐색)
  async function savePlaceOverride() {
    if (!workplace) return
    setSaveError(null)
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 세션이 없습니다')

      const today = getKSTDate()

      // 당일 중복 탐색 방지 — 캐시가 오늘 생성된 것이면 재탐색 스킵
      const existingCachedAt = existingOverride?.route_cached_at
      const hasTodayCache = existingCachedAt?.startsWith(today) ?? false

      let commuteRoute = null
      let returnRoute = null

      if (!hasTodayCache) {
        // 집 좌표 조회
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('home_lat, home_lng')
          .eq('user_id', user.id)
          .single()

        if (settingsError || !settings) throw new Error('집 주소 정보가 없습니다. 설정에서 집 주소를 먼저 등록해 주세요.')

        // 출근(집→변경출근지) + 퇴근(변경출근지→집) 동시 탐색
        ;[commuteRoute, returnRoute] = await Promise.all([
          fetchOdsayRoute(settings.home_lng, settings.home_lat, workplace.lng, workplace.lat),
          fetchOdsayRoute(workplace.lng, workplace.lat, settings.home_lng, settings.home_lat),
        ])
      }

      const now = new Date().toISOString()

      const payload: Record<string, unknown> = {
        user_id: user.id,
        override_date: today,
        workplace_name: workplace.name,
        workplace_address: workplace.address,
        workplace_lat: workplace.lat,
        workplace_lng: workplace.lng,
        ...(mode === 'both' && arrivalTime ? { arrival_time: arrivalTime } : {}),
      }

      if (commuteRoute) {
        payload.commute_traffic_type = commuteRoute.traffic_type
        payload.commute_ars_id = commuteRoute.ars_id
        payload.commute_bus_no = commuteRoute.bus_no
        payload.commute_station_name = commuteRoute.station_name
        payload.commute_subway_line = commuteRoute.subway_line
        payload.odsay_route_cache = commuteRoute.full_cache
        payload.route_cached_at = now
      }

      if (returnRoute) {
        payload.return_traffic_type = returnRoute.traffic_type
        payload.return_ars_id = returnRoute.ars_id
        payload.return_bus_no = returnRoute.bus_no
        payload.return_station_name = returnRoute.station_name
        payload.return_subway_line = returnRoute.subway_line
        payload.return_odsay_cache = returnRoute.full_cache
        payload.return_route_cached_at = now
      }

      const { error } = await supabase
        .from('overrides')
        .upsert(payload, { onConflict: 'user_id,override_date' })

      if (error) throw new Error(error.message)
      router.push('/')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  // T-49: 오버라이드 취소
  async function cancelOverride() {
    setSaveError(null)
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 세션이 없습니다')

      const { error } = await supabase
        .from('overrides')
        .delete()
        .eq('user_id', user.id)
        .eq('override_date', getKSTDate())

      if (error) throw new Error(error.message)
      router.push('/')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '취소에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSave() {
    if (mode === 'time') return saveTimeOverride()
    if (mode === 'place') return savePlaceOverride()
    if (mode === 'both') return savePlaceOverride() // both도 place 로직 (arrival_time 포함)
  }

  const showTimeForm = mode === 'time' || mode === 'both'
  const showPlaceForm = mode === 'place' || mode === 'both'

  const isSaveDisabled =
    isSaving ||
    (showTimeForm && !arrivalTime) ||
    (showPlaceForm && !workplace)

  return (
    <main className="mx-auto min-h-screen max-w-md p-4 pb-12">
      {/* 상단 뒤로가기 */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="min-h-[48px] text-base" aria-label="메인 화면으로 돌아가기">
            ← 메인
          </Button>
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">오늘만 변경</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        오늘 하루만 일정을 바꿉니다. 내일은 자동으로 원래 일정으로 돌아와요.
      </p>

      {/* 기존 오버라이드 배지 */}
      {existingOverride && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <p className="text-lg font-medium">현재 오늘 일정이 변경되어 있습니다</p>
          {existingOverride.workplace_name && (
            <p className="mt-1 text-base">출근지: {existingOverride.workplace_name}</p>
          )}
          {existingOverride.arrival_time && (
            <p className="mt-1 text-base">목표 도착: {existingOverride.arrival_time.slice(0, 5)}</p>
          )}
        </div>
      )}

      {/* 모드 선택 버튼 3개 */}
      {!isLoading && (
        <div className="flex flex-col gap-3">
          <Button
            variant={mode === 'time' ? 'default' : 'outline'}
            className="min-h-[56px] w-full text-xl"
            onClick={() => setMode(mode === 'time' ? null : 'time')}
          >
            목표 시간만 변경
          </Button>
          <Button
            variant={mode === 'place' ? 'default' : 'outline'}
            className="min-h-[56px] w-full text-xl"
            onClick={() => setMode(mode === 'place' ? null : 'place')}
          >
            출근지 변경
          </Button>
          <Button
            variant={mode === 'both' ? 'default' : 'outline'}
            className="min-h-[56px] w-full text-xl"
            onClick={() => setMode(mode === 'both' ? null : 'both')}
          >
            전부 변경
          </Button>
        </div>
      )}

      {/* 폼 영역 */}
      {mode && (
        <div className="mt-8 flex flex-col gap-6">
          {showTimeForm && (
            <TimeInput
              label="목표 도착 시간"
              value={arrivalTime}
              onChange={setArrivalTime}
            />
          )}

          {showPlaceForm && (
            <AddressSearch
              label="오늘의 출근지"
              placeholder="주소를 검색하세요"
              onSelect={(result) =>
                setWorkplace({
                  name: result.addressName,
                  address: result.addressName,
                  lat: parseFloat(result.y),
                  lng: parseFloat(result.x),
                })
              }
            />
          )}

          {saveError && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2 text-base text-destructive">
              {saveError}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              className="min-h-[48px] flex-1 text-lg"
              disabled={isSaveDisabled}
              onClick={handleSave}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
            <Button
              variant="outline"
              className="min-h-[48px] flex-1 text-lg"
              onClick={() => { setMode(null); setSaveError(null) }}
              disabled={isSaving}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 오버라이드 취소 버튼 */}
      {existingOverride && (
        <div className="mt-8 border-t pt-6">
          <Button
            variant="destructive"
            className="min-h-[48px] w-full text-lg"
            disabled={isSaving}
            onClick={cancelOverride}
          >
            오늘 변경 취소 (원래 일정으로)
          </Button>
        </div>
      )}
    </main>
  )
}
