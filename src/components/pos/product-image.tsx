"use client"

import { PackageOpen } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function ProductImage({
  src,
  alt,
  className,
  sizes,
}: {
  src?: string | null
  alt: string
  className?: string
  sizes?: string
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-accent text-primary/60",
          className
        )}
      >
        <PackageOpen className="size-8" aria-hidden />
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes || "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"}
      className={cn("object-cover", className)}
      draggable={false}
      unoptimized={src.startsWith("data:")}
    />
  )
}
