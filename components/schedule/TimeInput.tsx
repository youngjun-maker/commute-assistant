'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TimeInputProps {
  value: string
  onChange: (v: string) => void
  label?: string
}

export function TimeInput({ value, onChange, label }: TimeInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor="time-input" className="text-lg font-medium">
          {label}
        </Label>
      )}
      <Input
        id="time-input"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? '시간 선택'}
        className="h-14 min-h-[48px] w-full cursor-pointer text-xl"
      />
    </div>
  )
}
