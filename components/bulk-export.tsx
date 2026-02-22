"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Player } from "@/lib/data-utils"
import { Download, Loader2, Gift } from "lucide-react"
import { toPng } from "html-to-image"

interface BulkExportProps {
  players: Player[]
  renderCard: (player: Player, index: number) => React.ReactNode
}

export function BulkExport({ players, renderCard }: BulkExportProps) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleBulkExport = async () => {
    setExporting(true)
    setProgress(0)

    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const element = document.getElementById(`player-card-${player.player_id}`)

      if (element) {
        try {
          const dataUrl = await toPng(element, {
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
          link.download = `${player.nickname}-stats-2025.png`
          link.href = dataUrl
          link.click()

          await new Promise((r) => setTimeout(r, 300))
        } catch (err) {
          console.error(`Failed to export ${player.nickname}:`, err)
        }
      }

      setProgress(((i + 1) / players.length) * 100)
    }

    setExporting(false)
    setProgress(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleBulkExport}
          disabled={exporting || players.length === 0}
          className="gap-2 bg-christmas-red hover:bg-christmas-red/80 text-christmas-snow"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Экспорт... {progress.toFixed(0)}%
            </>
          ) : (
            <>
              <Gift className="w-4 h-4" />
              <Download className="w-4 h-4" />
              Экспорт всех ({players.length})
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player, index) => (
          <div key={player.player_id} id={`player-card-${player.player_id}`}>
            {renderCard(player, index)}
          </div>
        ))}
      </div>
    </div>
  )
}
