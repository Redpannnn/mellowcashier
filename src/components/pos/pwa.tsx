"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** Register service worker saat pertama kali load */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // diam saja kalau gagal register (misal tidak didukung browser)
      })
    }
  }, [])

  return null
}

/** Tombol install PWA, muncul otomatis saat browser mengizinkan install */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches
  )

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed || !promptEvent) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Install aplikasi"
      title="Install aplikasi ke HP"
      onClick={async () => {
        try {
          await promptEvent.prompt()
          const { outcome } = await promptEvent.userChoice
          if (outcome === "accepted") setInstalled(true)
          setPromptEvent(null)
        } catch {
          setPromptEvent(null)
        }
      }}
    >
      <Download className="size-4" />
    </Button>
  )
}
