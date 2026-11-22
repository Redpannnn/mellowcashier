import { formatDateWIB, formatIDR, formatTimeWIB } from "./format"
import type { Trx } from "./types"

/**
 * Builder struk ESC/POS untuk printer thermal mini (kertas 58mm, 32 kolom).
 * Semua command mengikuti spesifikasi ESC/POS standar (Epson TM).
 */

const WIDTH = 32

// ---- Perintah ESC/POS ----
const INIT = [0x1b, 0x40] // ESC @ - reset
const ALIGN_LEFT = [0x1b, 0x61, 0x00]
const ALIGN_CENTER = [0x1b, 0x61, 0x01]
const SIZE_DOUBLE = [0x1d, 0x21, 0x11] // GS ! - 2x lebar & 2x tinggi
const SIZE_NORMAL = [0x1d, 0x21, 0x00]
const BOLD_ON = [0x1b, 0x45, 0x01]
const BOLD_OFF = [0x1b, 0x45, 0x00]
const FEED_LINES = (n: number) => [0x1b, 0x64, n] // ESC d n
const CUT = [0x1d, 0x56, 0x42, 0x00] // GS V B 0 - potong kertas

/** Rupiah versi hemat spasi untuk struk: Rp18.000 */
function rp(n: number): string {
  return formatIDR(n).replace("Rp ", "Rp")
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "~" : s
}

/** Baris dua kolom kiri-kanan yang selalu pas `width` karakter */
function row(left: string, right: string, width = WIDTH): string {
  const maxLeft = Math.max(width - right.length - 1, 1)
  const l = truncate(left, maxLeft)
  const r = truncate(right, Math.max(width - l.length, 1))
  const spaces = Math.max(width - l.length - r.length, 1)
  return l + " ".repeat(spaces) + r
}

/** Word wrap nama produk */
function wrapText(s: string, width: number): string[] {
  const words = s.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w
    if (cand.length <= width) {
      cur = cand
    } else {
      if (cur) lines.push(cur)
      if (w.length > width) {
        let rest = w
        while (rest.length > width) {
          lines.push(rest.slice(0, width))
          rest = rest.slice(width)
        }
        cur = rest
      } else {
        cur = w
      }
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [""]
}

export function buildReceiptBytes(trx: Trx): Uint8Array {
  const enc = new TextEncoder()
  const out: number[] = []
  const text = (s: string) => {
    out.push(...enc.encode(s))
  }
  const cmd = (...bytes: number[]) => {
    out.push(...bytes)
  }
  const line = () => text("-".repeat(WIDTH) + "\n")

  cmd(...INIT)

  // Header: logo tulisan MELLOW besar di tengah
  cmd(...ALIGN_CENTER, ...SIZE_DOUBLE, ...BOLD_ON)
  text("MELLOW\n")
  cmd(...SIZE_NORMAL, ...BOLD_OFF)
  text("Struk Penjualan\n\n")

  // Info transaksi
  cmd(...ALIGN_LEFT)
  text(truncate(trx.code, WIDTH) + "\n")
  text(`${formatDateWIB(trx.createdAt)} ${formatTimeWIB(trx.createdAt)}` + "\n")
  line()

  // Item
  for (const item of trx.items) {
    const nameLines = wrapText(item.name, WIDTH)
    for (const l of nameLines) text(l + "\n")
    text(row(`  ${item.quantity} x ${rp(item.price)}`, rp(item.price * item.quantity)) + "\n")
  }
  line()

  // Total (besar)
  cmd(...SIZE_DOUBLE, ...BOLD_ON)
  text(row("TOTAL", rp(trx.total), 16) + "\n")
  cmd(...SIZE_NORMAL, ...BOLD_OFF)

  // Pembayaran
  text(row(trx.paymentMethod === "QRIS" ? "QRIS" : "CASH", rp(trx.paidAmount)) + "\n")
  text(row("Kembali", rp(trx.changeAmount)) + "\n")
  line()

  // Footer
  cmd(...ALIGN_CENTER)
  text("Terima kasih sudah berbelanja!\n")
  text("\n")

  cmd(...FEED_LINES(3), ...CUT)

  return new Uint8Array(out)
}
