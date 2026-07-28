"use client"

import { useEffect, useMemo, useState } from "react"
import { FactionMatchup } from "@/components/faction-icon"
import {
  LINEUP_API_URL,
  SQUAD_ORDER,
  SquadTable,
  hasSquadContent,
  parseMatchTitle,
  splitMatchTitle,
  type LineupPayload,
  type LineupSideKey,
} from "@/components/lineup-board"
import type { Player } from "@/lib/data-utils"

function resolveSide(value: string | null | undefined): LineupSideKey {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two"].includes(normalized) ? "siteTwo" : "siteOne"
}

export function LineupExportShot({ side: rawSide }: { side?: string | null }) {
  const side = resolveSide(rawSide)
  const [lineup, setLineup] = useState<LineupPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const playerLookup = useMemo(() => new Map<string, Player>(), [])

  useEffect(() => {
    let active = true

    fetch(`${LINEUP_API_URL}?_=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`)
        return response.json() as Promise<LineupPayload>
      })
      .then((payload) => {
        if (active) setLineup(payload)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Lineup load failed")
      })

    return () => {
      active = false
    }
  }, [])

  const sideData = lineup?.[side] ?? {}
  const title = parseMatchTitle(lineup?.name, side)
  const titleMeta = splitMatchTitle(title)
  const visibleSquads = SQUAD_ORDER.filter((squadName) => hasSquadContent(sideData[squadName] ?? []))

  useEffect(() => {
    if (lineup || error) {
      document.documentElement.dataset.lineupExportReady = "true"
    }
  }, [error, lineup])

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] p-8 text-christmas-snow">
        <div data-lineup-export-card className="rounded-xl border border-christmas-red/40 bg-card px-6 py-5 text-xl text-christmas-red">
          {error}
        </div>
      </main>
    )
  }

  if (!lineup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070d] p-8 text-christmas-snow">
        <div className="text-xl font-semibold text-christmas-gold">Loading lineup...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#05070d] p-6 text-christmas-snow">
      <div data-lineup-export-card className="w-[1440px] bg-[#05070d] text-christmas-snow">
        <div className="mb-5 rounded-2xl border border-christmas-gold/25 bg-card/80 px-6 py-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <h1 className="text-3xl font-black text-christmas-snow">{titleMeta.lead}</h1>
          {titleMeta.details.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {titleMeta.details.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full border border-christmas-gold/20 bg-background/55 px-3 py-1.5 text-sm font-semibold text-muted-foreground"
                >
                  {detail.includes(" vs ") ? <FactionMatchup value={detail} /> : detail}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {visibleSquads.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {visibleSquads.map((squadName) => (
              <SquadTable
                key={`${side}-${squadName}`}
                name={squadName}
                rows={sideData[squadName] ?? []}
                playerLookup={playerLookup}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-christmas-gold/25 bg-background/35 px-4 py-10 text-center text-sm font-medium text-muted-foreground">
            Lineup is empty
          </div>
        )}
      </div>
    </main>
  )
}
