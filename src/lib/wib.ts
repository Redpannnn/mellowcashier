export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** "YYYY-MM-DD" -> Date at 00:00:00 WIB */
export function wibDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+07:00`)
}

/** "YYYY-MM-DD" -> Date at 23:59:59.999 WIB */
export function wibDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+07:00`)
}

/** "YYYY-MM" -> start & end of month in WIB */
export function wibMonthRange(monthStr: string): { start: Date; end: Date } {
  const [y, m] = monthStr.split("-").map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
  const start = new Date(`${monthStr}-01T00:00:00+07:00`)
  const end = new Date(new Date(`${nextMonth}-01T00:00:00+07:00`).getTime() - 1)
  return { start, end }
}

/** Given any "YYYY-MM-DD", returns Monday-Sunday range of that week in WIB */
export function wibWeekRange(dateStr: string): { start: Date; end: Date; mondayStr: string } {
  const d = new Date(`${dateStr}T00:00:00+07:00`)
  const wib = new Date(d.getTime() + WIB_OFFSET_MS)
  const dow = wib.getUTCDay() // 0 = Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const mondayUtcMs = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + mondayOffset)
  const mondayStr = new Date(mondayUtcMs).toISOString().slice(0, 10)
  const start = wibDayStart(mondayStr)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
  return { start, end, mondayStr }
}

/** Today's date string (YYYY-MM-DD) in WIB */
export function wibTodayStr(): string {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

/** Current month string (YYYY-MM) in WIB */
export function wibCurrentMonthStr(): string {
  return wibTodayStr().slice(0, 7)
}

/** Generate unique transaction code e.g. TRX-20250108-AB3F */
export function makeTrxCode(): string {
  const now = new Date(Date.now() + WIB_OFFSET_MS)
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TRX-${ymd}-${rand}`
}
