// 출근/퇴근 모드 헤더 컴포넌트 — 민트(출근) / 주황(퇴근) 배지 + 아이콘
interface ModeHeaderProps {
  mode: 'commute' | 'return'
  workplaceName?: string
}

export function ModeHeader({ mode, workplaceName }: ModeHeaderProps) {
  const isCommute = mode === 'commute'

  return (
    <div className="flex items-center gap-3">
      {/* 출근/퇴근 배지 — variant prop 없이 className으로만 색상 처리 */}
      <span
        className={
          isCommute
            ? 'inline-flex items-center rounded-full px-3 py-1 text-lg font-bold bg-[oklch(0.95_0.05_180)] text-[oklch(0.25_0.06_180)]'
            : 'inline-flex items-center rounded-full px-3 py-1 text-lg font-bold bg-[oklch(0.96_0.06_55)] text-[oklch(0.35_0.10_55)]'
        }
      >
        {isCommute ? '출근' : '퇴근'}
      </span>
      {/* 아이콘 + 목적지명 */}
      <span className="text-3xl font-bold">
        {isCommute ? '🏢' : '🏠'}{' '}
        {isCommute ? (workplaceName ?? '출근지') : '집으로'}
      </span>
    </div>
  )
}
