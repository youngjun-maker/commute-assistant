import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toZonedTime, format } from "date-fns-tz"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const KST = "Asia/Seoul"

/** UTC Date를 KST 기준 Date로 변환 */
export function toKST(date: Date): Date {
  return toZonedTime(date, KST)
}

/** 현재 KST 시각의 시(hour) 반환 (0~23) */
export function getKSTHour(): number {
  return parseInt(format(toZonedTime(new Date(), KST), "H", { timeZone: KST }), 10)
}

/** 현재 KST 시각의 분(minute) 반환 (0~59) */
export function getKSTMinute(): number {
  return parseInt(format(toZonedTime(new Date(), KST), "m", { timeZone: KST }), 10)
}

/** arrival_time 문자열("HH:MM" 또는 "HH:MM:SS")과 현재 KST를 비교해 direction 반환 */
export function getDirectionByArrivalTime(
  arrivalTime: string | null | undefined,
  fallbackEndHour: number = 12
): 'commute' | 'return' {
  const currentMinutes = getKSTHour() * 60 + getKSTMinute()
  if (arrivalTime) {
    const [h, m] = arrivalTime.split(':').map(Number)
    return currentMinutes >= h * 60 + m ? 'return' : 'commute'
  }
  return currentMinutes >= fallbackEndHour * 60 ? 'return' : 'commute'
}

/** 현재 KST 날짜 'YYYY-MM-DD' 반환 */
export function getKSTDate(): string {
  return format(toZonedTime(new Date(), KST), "yyyy-MM-dd", { timeZone: KST })
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

/** 현재 KST 요일 반환 */
export function getKSTDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  const kstDate = toZonedTime(new Date(), KST)
  return days[kstDate.getDay()]
}

/**
 * 'HH:MM' 형식 TIME 문자열을 오늘 KST 기준 Date로 변환
 * 예: "09:00" → 오늘 오전 9시 KST Date
 */
export function parseArrivalTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const kstNow = toZonedTime(new Date(), KST)
  const result = new Date(kstNow)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * 출발 권장 시각 계산
 * 출발 시각 = arrival_time - totalMinutes(분) - bufferMinutes(분)
 */
export function getDepartureTime(
  arrivalTimeStr: string,
  totalMinutes: number,
  bufferMinutes: number
): Date {
  const arrivalDate = parseArrivalTime(arrivalTimeStr)
  return new Date(arrivalDate.getTime() - (totalMinutes + bufferMinutes) * 60 * 1000)
}
