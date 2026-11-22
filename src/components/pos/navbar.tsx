"use client"

import { BarChart3, Boxes, Moon, ReceiptText, ShoppingBasket, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { InstallButton } from "@/components/pos/pwa"
import { cn } from "@/lib/utils"

export type TabKey = "produk" | "stok" | "transaksi" | "laporan"

const TABS: { key: TabKey; label: string; icon: typeof ShoppingBasket }[] = [
  { key: "produk", label: "Produk", icon: ShoppingBasket },
  { key: "stok", label: "Stok", icon: Boxes },
  { key: "transaksi", label: "Transaksi", icon: ReceiptText },
  { key: "laporan", label: "Laporan", icon: BarChart3 },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ganti tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  )
}

export function TopNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="MELLOW"
            className="h-8 w-auto select-none object-contain dark:invert"
          />
        </div>

        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Menu utama">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={active === t.key ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:ml-2">
          <InstallButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur sm:hidden"
      aria-label="Menu utama"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-14 items-stretch">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-current={active === t.key ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active === t.key ? "text-primary" : "text-muted-foreground"
            )}
          >
            <t.icon className={cn("size-5", active === t.key && "fill-primary/15")} />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
