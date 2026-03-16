'use client'

import { Button } from '@/components/ui/button'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: '월',
  tuesday: '화',
  wednesday: '수',
  thursday: '목',
  friday: '금',
}

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

interface DaySelectorProps {
  selectedDay: DayOfWeek | null
  activeDays: DayOfWeek[]
  onSelect: (d: DayOfWeek) => void
  onToggle: (d: DayOfWeek, active: boolean) => void
}

export function DaySelector({ selectedDay, activeDays, onSelect, onToggle }: DaySelectorProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="요일 선택">
      {DAYS.map((day) => {
        const isSelected = selectedDay === day
        const isActive = activeDays.includes(day)

        return (
          <div key={day} className="flex flex-col items-center gap-1">
            {/* 요일 선택 버튼 */}
            <Button
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              aria-pressed={isSelected}
              aria-label={`${DAY_LABELS[day]}요일${!isActive ? ' (휴무)' : ''}`}
              className={`min-h-[48px] min-w-[48px] text-lg font-semibold transition-opacity ${
                !isActive ? 'opacity-40' : ''
              }`}
              onClick={() => onSelect(day)}
            >
              {DAY_LABELS[day]}
            </Button>

            {/* 활성화 토글 */}
            <button
              type="button"
              role="checkbox"
              aria-checked={isActive}
              aria-label={`${DAY_LABELS[day]}요일 ${isActive ? '비활성화' : '활성화'}`}
              className={`h-4 w-4 rounded-sm border-2 transition-colors ${
                isActive
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground bg-background'
              }`}
              onClick={() => onToggle(day, !isActive)}
            >
              {isActive && (
                <svg
                  viewBox="0 0 12 12"
                  className="h-full w-full fill-none stroke-primary-foreground stroke-2"
                >
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
