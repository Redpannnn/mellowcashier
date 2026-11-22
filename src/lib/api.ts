/**
 * Parse body response dengan aman.
 * Kalau body kosong (mis. function timeout di Vercel / koneksi ke database putus
 * sebentar), fetch tetap balikin Response tapi body-nya kosong → res.json()
 * biasa bakal lempar "Unexpected end of JSON input" yang bikin bingung.
 * Helper ini ganti pesannya jadi jelas + sertain status code.
 */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text.trim()) {
    throw new Error(
      `Server tidak mengirim data (HTTP ${res.status}). Koneksi lagi gangguan, coba lagi ya.`
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Respons server tidak valid (HTTP ${res.status})`)
  }
}
