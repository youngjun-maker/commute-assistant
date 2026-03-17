'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddressSearch } from '@/components/schedule/AddressSearch'
import { TimeInput } from '@/components/schedule/TimeInput'
import { supabase } from '@/lib/supabase/client'
import type { Schedule, UserSettings } from '@/lib/odsay'
import { cn } from '@/lib/utils'

// ─── 상수 ─────────────────────────────────────────────────────────
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

const DAYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

const DAY_LABELS: Record<DayKey, string> = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
}

// ─── 폼 상태 타입 ─────────────────────────────────────────────────
interface HomeFormState {
  address: string
  lat: number | null
  lng: number | null
}

interface ScheduleFormState {
  workplace_name: string
  workplace_address: string
  workplace_lat: number | null
  workplace_lng: number | null
  arrival_time: string
  is_active: boolean
}

const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
  workplace_name: '',
  workplace_address: '',
  workplace_lat: null,
  workplace_lng: null,
  arrival_time: '09:00',
  is_active: true,
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
type SetupTab = 'home' | 'schedules'

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState<SetupTab>('home')
  const [pageLoading, setPageLoading] = useState(true)

  // 집 주소
  const [homeForm, setHomeForm] = useState<HomeFormState>({ address: '', lat: null, lng: null })
  const [homeSaving, setHomeSaving] = useState(false)
  const [homeSaved, setHomeSaved] = useState(false)
  const [homeError, setHomeError] = useState<string | null>(null)

  // 스케줄 목록
  const [schedules, setSchedules] = useState<Record<DayKey, Schedule | null>>({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
  })

  // 스케줄 폼
  const [editingDay, setEditingDay] = useState<DayKey | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(EMPTY_SCHEDULE_FORM)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // ── 초기 데이터 로딩 ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setPageLoading(false)
        return
      }

      const [settingsRes, schedulesRes] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('schedules').select('*').eq('user_id', user.id),
      ])

      if (settingsRes.data) {
        const s = settingsRes.data as UserSettings
        setHomeForm({ address: s.home_address, lat: s.home_lat, lng: s.home_lng })
      }

      if (schedulesRes.data) {
        const map: Record<DayKey, Schedule | null> = {
          monday: null,
          tuesday: null,
          wednesday: null,
          thursday: null,
          friday: null,
        }
        for (const sch of schedulesRes.data as Schedule[]) {
          const d = sch.day as DayKey
          if (d in map) map[d] = sch
        }
        setSchedules(map)
      }

      setPageLoading(false)
    }
    load()
  }, [])

  // ── 집 주소 저장 ────────────────────────────────────────────────
  async function saveHomeAddress() {
    if (!homeForm.address || homeForm.lat === null || homeForm.lng === null) {
      setHomeError('주소를 검색 후 선택해 주세요')
      return
    }
    setHomeSaving(true)
    setHomeError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setHomeError('로그인이 필요합니다')
      setHomeSaving(false)
      return
    }

    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        home_address: homeForm.address,
        home_lat: homeForm.lat,
        home_lng: homeForm.lng,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    setHomeSaving(false)
    if (error) {
      setHomeError(`저장 실패: ${error.message}`)
    } else {
      setHomeSaved(true)
      setTimeout(() => setHomeSaved(false), 3000)
    }
  }

  // ── 스케줄 편집 시작 ────────────────────────────────────────────
  function startEdit(day: DayKey) {
    const existing = schedules[day]
    if (existing) {
      setScheduleForm({
        workplace_name: existing.workplace_name,
        workplace_address: existing.workplace_address,
        workplace_lat: existing.workplace_lat,
        workplace_lng: existing.workplace_lng,
        arrival_time: existing.arrival_time.slice(0, 5),
        is_active: existing.is_active,
      })
    } else {
      setScheduleForm(EMPTY_SCHEDULE_FORM)
    }
    setEditingDay(day)
    setScheduleError(null)
  }

  function cancelEdit() {
    setEditingDay(null)
    setScheduleError(null)
  }

  // ── 스케줄 저장 ─────────────────────────────────────────────────
  async function saveSchedule(day: DayKey) {
    if (!scheduleForm.workplace_name.trim()) {
      setScheduleError('출근지 이름을 입력해 주세요')
      return
    }
    if (
      !scheduleForm.workplace_address ||
      scheduleForm.workplace_lat === null ||
      scheduleForm.workplace_lng === null
    ) {
      setScheduleError('출근지 주소를 검색 후 선택해 주세요')
      return
    }

    setScheduleSaving(true)
    setScheduleError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setScheduleError('로그인이 필요합니다')
      setScheduleSaving(false)
      return
    }

    const existing = schedules[day]
    const addressChanged =
      existing &&
      (scheduleForm.workplace_lat !== existing.workplace_lat ||
        scheduleForm.workplace_lng !== existing.workplace_lng)

    const payload: Record<string, unknown> = {
      user_id: user.id,
      day,
      workplace_name: scheduleForm.workplace_name.trim(),
      workplace_address: scheduleForm.workplace_address,
      workplace_lat: scheduleForm.workplace_lat,
      workplace_lng: scheduleForm.workplace_lng,
      arrival_time: scheduleForm.arrival_time,
      is_active: scheduleForm.is_active,
      updated_at: new Date().toISOString(),
    }

    // 주소 변경 시 ODsay 캐시 리셋
    if (addressChanged) {
      payload.commute_traffic_type = null
      payload.odsay_route_cache = null
      payload.route_cached_at = null
      payload.return_traffic_type = null
      payload.return_odsay_cache = null
      payload.return_route_cached_at = null
    }

    const { data: saved, error } = await supabase
      .from('schedules')
      .upsert(payload, { onConflict: 'user_id,day' })
      .select()
      .single()

    setScheduleSaving(false)
    if (error) {
      setScheduleError(`저장 실패: ${error.message}`)
      return
    }

    setSchedules((prev) => ({ ...prev, [day]: saved as Schedule }))
    setEditingDay(null)
  }

  // ── 스케줄 삭제 ─────────────────────────────────────────────────
  async function deleteSchedule(day: DayKey) {
    const schedule = schedules[day]
    if (!schedule) return

    const { error } = await supabase.from('schedules').delete().eq('id', schedule.id)
    if (!error) {
      setSchedules((prev) => ({ ...prev, [day]: null }))
      if (editingDay === day) setEditingDay(null)
    }
  }

  // ── 로딩 화면 ───────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  // ── 메인 렌더 ───────────────────────────────────────────────────
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-6 pb-16">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" className="min-h-[48px] px-3 text-lg" aria-label="메인으로">
            ← 메인
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">설정</h1>
      </div>

      {/* pill 탭 — Button 대신 네이티브 button으로 교체 */}
      <div className="mb-6 flex rounded-2xl bg-muted p-1 gap-1">
        <button
          className={cn(
            'flex-1 rounded-xl py-3 text-lg font-semibold transition-all',
            activeTab === 'home'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-foreground/50'
          )}
          onClick={() => setActiveTab('home')}
        >
          집 주소
        </button>
        <button
          className={cn(
            'flex-1 rounded-xl py-3 text-lg font-semibold transition-all',
            activeTab === 'schedules'
              ? 'bg-white shadow-sm text-foreground'
              : 'text-foreground/50'
          )}
          onClick={() => setActiveTab('schedules')}
        >
          요일 스케줄
        </button>
      </div>

      {/* ── 집 주소 탭 ── */}
      {activeTab === 'home' && (
        <div className="flex flex-col gap-4">
          <p className="text-lg text-muted-foreground">
            집 주소를 등록하면 출근 경로를 자동으로 탐색합니다.
          </p>

          {/* 현재 등록된 주소 박스 — 흰색 카드 */}
          {homeForm.address && (
            <div className="rounded-2xl bg-white shadow-sm p-4">
              <p className="mb-1 text-base text-muted-foreground">현재 등록된 주소</p>
              <p className="text-lg font-medium">{homeForm.address}</p>
            </div>
          )}

          <AddressSearch
            label="주소 검색"
            placeholder="새 집 주소를 검색하세요"
            onSelect={(result) => {
              setHomeForm({
                address: result.addressName,
                lat: parseFloat(result.y),
                lng: parseFloat(result.x),
              })
              setHomeSaved(false)
            }}
          />

          {homeError && (
            <p className="text-base text-destructive" role="alert">
              {homeError}
            </p>
          )}

          {/* 집 주소 저장 버튼 — 민트 배경 강조 */}
          <Button
            onClick={saveHomeAddress}
            disabled={homeSaving || homeForm.lat === null}
            className="min-h-[56px] w-full text-xl bg-[oklch(0.82_0.09_180)] hover:bg-[oklch(0.75_0.11_180)] text-[oklch(0.2_0.05_180)] border-0 font-bold"
          >
            {homeSaving ? '저장 중...' : homeSaved ? '✓ 저장됨' : '집 주소 저장'}
          </Button>

          <p className="text-base text-muted-foreground">
            * 브라우저 데이터를 삭제하면 스케줄을 다시 등록해야 합니다
          </p>
        </div>
      )}

      {/* ── 요일 스케줄 탭 ── */}
      {activeTab === 'schedules' && (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-lg text-muted-foreground">
            요일별 출근지와 목표 도착 시간을 등록하세요.
          </p>

          {DAYS.map((day) => {
            const schedule = schedules[day]
            const isEditing = editingDay === day

            return (
              // 요일 카드 — 흰색 카드 + 편집 ring 민트
              <Card
                key={day}
                className={cn(
                  'gap-0 overflow-hidden py-0 rounded-2xl bg-white shadow-sm border-0',
                  isEditing && 'ring-2 ring-[oklch(0.82_0.09_180)]'
                )}
              >
                {/* 요일 행 */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <span className="text-xl font-semibold">{DAY_LABELS[day]}</span>
                    {schedule ? (
                      <p className="mt-0.5 text-lg">
                        {/* 등록된 요일은 출근지명을 강조 표시 */}
                        <span className="font-semibold text-foreground">{schedule.workplace_name}</span>
                        {' · '}
                        <span className="text-[oklch(0.35_0.10_180)]">{schedule.arrival_time.slice(0, 5)} 도착</span>
                        {!schedule.is_active && (
                          <span className="ml-2 text-base text-muted-foreground">(휴무)</span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-lg text-muted-foreground">미등록</p>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="min-h-[48px] min-w-[56px]"
                        onClick={() => startEdit(day)}
                        aria-label={`${DAY_LABELS[day]} ${schedule ? '수정' : '등록'}`}
                      >
                        {schedule ? '수정' : '등록'}
                      </Button>
                      {schedule && (
                        <Button
                          variant="outline"
                          className="min-h-[48px] min-w-[56px] text-destructive hover:text-destructive"
                          onClick={() => deleteSchedule(day)}
                          aria-label={`${DAY_LABELS[day]} 삭제`}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* 인라인 편집 폼 */}
                {isEditing && (
                  <CardContent className="flex flex-col gap-4 border-t pb-6 pt-4">
                    {/* 출근지 이름 — 밑줄 스타일 Input */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-lg font-medium">출근지 이름</Label>
                      <Input
                        value={scheduleForm.workplace_name}
                        onChange={(e) =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            workplace_name: e.target.value,
                          }))
                        }
                        placeholder="예: 강남 사무소"
                        className="h-14 text-lg border-0 border-b-2 border-input rounded-none px-0 focus-visible:ring-0 focus-visible:border-[oklch(0.82_0.09_180)] bg-transparent"
                        aria-label="출근지 이름"
                      />
                    </div>

                    {/* 출근지 주소 */}
                    <AddressSearch
                      label="출근지 주소"
                      placeholder="출근지 주소를 검색하세요"
                      onSelect={(result) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          workplace_address: result.addressName,
                          workplace_lat: parseFloat(result.y),
                          workplace_lng: parseFloat(result.x),
                        }))
                      }
                    />
                    {scheduleForm.workplace_address && (
                      <div className="-mt-2 rounded-lg bg-muted p-3">
                        <p className="text-base text-muted-foreground">선택된 주소</p>
                        <p className="text-lg">{scheduleForm.workplace_address}</p>
                      </div>
                    )}

                    {/* 목표 도착 시간 */}
                    <TimeInput
                      label="목표 도착 시간"
                      value={scheduleForm.arrival_time}
                      onChange={(v) =>
                        setScheduleForm((prev) => ({ ...prev, arrival_time: v }))
                      }
                    />

                    {/* 활성화 토글 */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={scheduleForm.is_active}
                        aria-label="이 요일 활성화"
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-sm border-2 transition-colors',
                          scheduleForm.is_active
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground bg-background'
                        )}
                        onClick={() =>
                          setScheduleForm((prev) => ({
                            ...prev,
                            is_active: !prev.is_active,
                          }))
                        }
                      >
                        {scheduleForm.is_active && (
                          <svg
                            viewBox="0 0 12 12"
                            className="h-4 w-4 fill-none stroke-primary-foreground stroke-2"
                          >
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        )}
                      </button>
                      <span className="text-lg">이 요일 활성화</span>
                    </div>

                    {scheduleError && (
                      <p className="text-base text-destructive" role="alert">
                        {scheduleError}
                      </p>
                    )}

                    {/* 저장/취소 버튼 */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="min-h-[48px] flex-1 text-lg"
                        onClick={cancelEdit}
                      >
                        취소
                      </Button>
                      {/* 저장 버튼 — 민트 배경 강조 */}
                      <Button
                        className="min-h-[56px] flex-1 text-xl font-bold bg-[oklch(0.82_0.09_180)] hover:bg-[oklch(0.75_0.11_180)] text-[oklch(0.2_0.05_180)] border-0"
                        onClick={() => saveSchedule(day)}
                        disabled={scheduleSaving}
                      >
                        {scheduleSaving ? '저장 중...' : '저장'}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* 빈 상태 */}
          {Object.values(schedules).every((s) => s === null) && (
            <div className="py-8 text-center">
              <p className="text-xl text-muted-foreground">아직 등록된 스케줄이 없어요</p>
              <p className="mt-2 text-lg text-muted-foreground">
                위에서 요일을 선택해 등록해 보세요
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
