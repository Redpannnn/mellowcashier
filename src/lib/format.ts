/** Format angka jadi Rupiah, contoh: Rp 23.000 */
export function formatIDR(n: number): string {
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`
}

/** Format angka pakai pemisah ribuan id-ID, contoh: 23.000 */
export function formatNumberID(n: number): string {
  return Math.round(n).toLocaleString("id-ID")
}

/** Parse string "50.000" / "50000" jadi number */
export function parseNumberID(s: string): number {
  const digits = s.replace(/\D/g, "")
  return digits ? parseInt(digits, 10) : 0
}

/** Tambah titik pemisah ribuan saat user mengetik */
export function formatThousandInput(digits: string): string {
  const clean = digits.replace(/\D/g, "")
  if (!clean) return ""
  return parseInt(clean, 10).toLocaleString("id-ID")
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const timeFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
})

const fullFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

/** Contoh: 8 Jan 2025 */
export function formatDateWIB(d: string | Date): string {
  return dateFmt.format(new Date(d))
}

/** Contoh: 14:30 */
export function formatTimeWIB(d: string | Date): string {
  return timeFmt.format(new Date(d))
}

/** Contoh: 8 Jan 2025 14:30 */
export function formatDateTimeWIB(d: string | Date): string {
  return `${formatDateWIB(d)} ${formatTimeWIB(d)}`
}

/** Contoh: Rabu, 8 Januari 2025 */
export function formatFullDateWIB(d: string | Date): string {
  return fullFmt.format(new Date(d))
}
