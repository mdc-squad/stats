"use client"

import type React from "react"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toPng } from "html-to-image"

interface ExportCardProps {
  title: string
  filename: string
  children: React.ReactNode
  className?: string
}

export function ExportCard({ title, filename, children, className }: ExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    if (!cardRef.current) return

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#1a1a2e",
        skipFonts: true,
        filter: (node: HTMLElement) => {
          if (node.tagName === "LINK" && node.getAttribute("rel") === "stylesheet") {
            return false
          }
          return true
        },
      })

      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  return (
    <div className={`relative group ${className}`}>
      <Card ref={cardRef}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <Button
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleExport}
      >
        <Download className="w-4 h-4 mr-1" />
        PNG
      </Button>
    </div>
  )
}
