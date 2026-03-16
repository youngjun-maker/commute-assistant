import { Badge } from '@/components/ui/badge'

interface ModeHeaderProps {
  mode: 'commute' | 'return'
  workplaceName?: string
}

export function ModeHeader({ mode, workplaceName }: ModeHeaderProps) {
  const isCommute = mode === 'commute'

  return (
    <div className="flex items-center gap-3">
      <Badge
        variant={isCommute ? 'default' : 'secondary'}
        className="px-3 py-1 text-base font-bold"
      >
        {isCommute ? '출근' : '퇴근'}
      </Badge>
      <span className="text-2xl font-semibold">
        {isCommute ? (workplaceName ?? '출근지') : '집으로'}
      </span>
    </div>
  )
}
