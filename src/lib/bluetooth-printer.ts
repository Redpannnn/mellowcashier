import { buildReceiptBytes } from "./escpos"
import type { Trx } from "./types"

/**
 * Koneksi ke printer thermal Bluetooth (BLE) via Web Bluetooth API.
 * Mendukung kebanyakan printer mini 58mm (UUID service umum: 0000ff00,
 * 0000fee7, 18f0, Nordic UART, dll). Karakteristik write dicari otomatis.
 */

const PRINT_SERVICES = [
  "0000ff00-0000-1000-8000-00805f9b34fb", // paling umum di printer thermal murah
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8faa-094d9c498d64", // Nordic UART (microchip)
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "0000fff0-0000-1000-8000-00805f9b34fb",
]

const DEVICE_KEY = "kasirku-bt-device"
const NAME_KEY = "kasirku-bt-name"

type BluetoothLike = Bluetooth & {
  getDevices?: () => Promise<BluetoothDevice[]>
}

let cachedDevice: BluetoothDevice | null = null

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator
}

/** Nama printer yang terakhir berhasil terhubung (untuk ditampilkan di tombol) */
export function getSavedPrinterName(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Cari karakteristik yang bisa ditulis di seluruh service printer */
async function findWritableCharacteristic(device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic> {
  if (!device.gatt) throw new Error("GATT tidak tersedia di perangkat ini")
  const server = await device.gatt.connect()
  const services = await server.getPrimaryServices().catch(() => [])
  for (const service of services) {
    const chars = await service.getCharacteristics()
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) return c
    }
  }
  throw new Error("Tidak menemukan kanal data untuk kirim struk di printer ini")
}

async function ensureDevice(): Promise<BluetoothDevice> {
  if (!isBluetoothSupported()) {
    throw new Error(
      "Browser ini tidak mendukung Web Bluetooth. Pakai Chrome/Edge di Android atau laptop."
    )
  }
  const bt = navigator.bluetooth as BluetoothLike
  if (cachedDevice?.gatt?.connected) return cachedDevice

  // Reconnect ke printer yang sudah pernah dipasangkan (tanpa dialog)
  if (bt.getDevices) {
    const known = await bt.getDevices().catch(() => [])
    if (known.length > 0) {
      const savedId = window.localStorage.getItem(DEVICE_KEY)
      const found = (savedId && known.find((d) => d.id === savedId)) || known[0]
      cachedDevice = found
      return found
    }
  }

  // Belum ada: minta user pilih printer via dialog pairing
  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINT_SERVICES,
  })
  device.addEventListener("gattserverdisconnected", () => {
    cachedDevice = null
  })
  window.localStorage.setItem(DEVICE_KEY, device.id)
  if (device.name) window.localStorage.setItem(NAME_KEY, device.name)
  cachedDevice = device
  return device
}

/** Kirim bytes ke printer, balikin nama printer yang dipakai */
export async function sendToBluetoothPrinter(bytes: Uint8Array): Promise<string> {
  const device = await ensureDevice()
  const char = await findWritableCharacteristic(device)

  // Dikirim per potongan kecil, printer thermal murah butuh jeda antar paket
  const chunkSize = 100
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const part = bytes.slice(i, i + chunkSize)
    if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
      await char.writeValueWithoutResponse(part)
    } else {
      await char.writeValue(part)
    }
    await sleep(20)
  }
  return device.name || "Printer Bluetooth"
}

/** Bangun struk ESC/POS dari data transaksi lalu kirim ke printer */
export async function printReceiptBluetooth(trx: Trx): Promise<string> {
  const bytes = buildReceiptBytes(trx)
  return sendToBluetoothPrinter(bytes)
}
