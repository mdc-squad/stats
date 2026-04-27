"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { RefreshCw, Users } from "lucide-react"
import { RoleIcon, formatRoleName } from "@/components/role-icon"
import { SpecializationIcon, getSpecializationLabel } from "@/components/specialization-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { withBasePath } from "@/lib/base-path"
import { cn } from "@/lib/utils"

const LINEUP_API_BASE = (process.env.NEXT_PUBLIC_MDC_API_BASE ?? "https://api.hungryfishteam.org/gas/mdc").replace(/\/$/, "")
const LINEUP_API_URL = `${LINEUP_API_BASE}/lineup?publish=true`
const SQUAD_ORDER = ["GREEN", "RED", "YELLOW", "BLUE", "PURPLE", "ORANGE", "BROWN", "BLACK"] as const

type SquadName = (typeof SQUAD_ORDER)[number]
type LineupSideKey = "siteOne" | "siteTwo"

type LineupPlayer = {
  vehicle?: string | number | null
  role?: string | null
  specialist?: string | null
  number?: string | number | null
  vehicle_color?: string | null
  vehicle_icon?: string | null
  role_icon?: string | null
  specialist_icon?: string | null
  tag?: string | null
  nickname?: string | null
}

type LineupPayload = {
  name?: string | null
  siteOne?: Partial<Record<SquadName, LineupPlayer[]>>
  siteTwo?: Partial<Record<SquadName, LineupPlayer[]>>
}

const SQUAD_STYLES: Record<
  SquadName,
  {
    border: string
    badge: string
    text: string
    glow: string
    accent: string
    panel: string
  }
> = {
  GREEN: { border: "border-emerald-500/35", badge: "bg-emerald-500/15 text-emerald-200", text: "text-emerald-200", glow: "from-emerald-500/18 via-emerald-500/6 to-transparent", accent: "bg-emerald-500", panel: "bg-emerald-500/6" },
  RED: { border: "border-red-500/35", badge: "bg-red-500/15 text-red-200", text: "text-red-200", glow: "from-red-500/18 via-red-500/6 to-transparent", accent: "bg-red-500", panel: "bg-red-500/6" },
  YELLOW: { border: "border-yellow-500/35", badge: "bg-yellow-500/15 text-yellow-200", text: "text-yellow-200", glow: "from-yellow-500/18 via-yellow-500/6 to-transparent", accent: "bg-yellow-500", panel: "bg-yellow-500/6" },
  BLUE: { border: "border-cyan-500/35", badge: "bg-cyan-500/15 text-cyan-200", text: "text-cyan-200", glow: "from-cyan-500/18 via-cyan-500/6 to-transparent", accent: "bg-cyan-500", panel: "bg-cyan-500/6" },
  PURPLE: { border: "border-violet-500/35", badge: "bg-violet-500/15 text-violet-200", text: "text-violet-200", glow: "from-violet-500/18 via-violet-500/6 to-transparent", accent: "bg-violet-500", panel: "bg-violet-500/6" },
  ORANGE: { border: "border-orange-500/35", badge: "bg-orange-500/15 text-orange-200", text: "text-orange-200", glow: "from-orange-500/18 via-orange-500/6 to-transparent", accent: "bg-orange-500", panel: "bg-orange-500/6" },
  BROWN: { border: "border-amber-700/35", badge: "bg-amber-700/15 text-amber-200", text: "text-amber-200", glow: "from-amber-700/18 via-amber-700/6 to-transparent", accent: "bg-amber-700", panel: "bg-amber-700/6" },
  BLACK: { border: "border-zinc-500/35", badge: "bg-zinc-400/15 text-zinc-200", text: "text-zinc-200", glow: "from-zinc-400/18 via-zinc-400/6 to-transparent", accent: "bg-zinc-500", panel: "bg-zinc-400/6" },
}

const VEHICLE_ICON_BY_LABEL: Record<string, string> = {
  "соплай груз": withBasePath("/lineup-vehicle-icons/10.png"),
  "пехотка груз": withBasePath("/lineup-vehicle-icons/8.png"),
  "пехотка с пул": withBasePath("/lineup-vehicle-icons/9.png"),
  "соплай джип": withBasePath("/lineup-vehicle-icons/5.png"),
  "мрап": withBasePath("/lineup-vehicle-icons/1.png"),
  "мрап рвс": withBasePath("/lineup-vehicle-icons/6.png"),
  "пехотка джип": withBasePath("/lineup-vehicle-icons/2.png"),
  "вертолет тр": withBasePath("/lineup-vehicle-icons/12.png"),
  "пво груз": withBasePath("/lineup-vehicle-icons/11.png"),
  "арт джип": withBasePath("/lineup-vehicle-icons/3.png"),
  "пвт джип": withBasePath("/lineup-vehicle-icons/4.png"),
  "мотоцикл": withBasePath("/lineup-vehicle-icons/7.png"),
  "пехотка гус": withBasePath("/lineup-vehicle-icons/19.png"),
  "соплайка гус": withBasePath("/lineup-vehicle-icons/18.png"),
  "пехотка гус с пул": withBasePath("/lineup-vehicle-icons/20.png"),
  "msv гус": withBasePath("/lineup-vehicle-icons/17.png"),
  "арт гус": withBasePath("/lineup-vehicle-icons/21.png"),
  "мр гус": withBasePath("/lineup-vehicle-icons/22.png"),
  "пво гус": withBasePath("/lineup-vehicle-icons/27.png"),
  "бтр гус": withBasePath("/lineup-vehicle-icons/23.png"),
  "бмп гус": withBasePath("/lineup-vehicle-icons/24.png"),
  "сау гус": withBasePath("/lineup-vehicle-icons/25.png"),
  "танк": withBasePath("/lineup-vehicle-icons/26.png"),
  "бтр кол отк": withBasePath("/lineup-vehicle-icons/16.png"),
  "мр кол": withBasePath("/lineup-vehicle-icons/15.png"),
  "бтр кол": withBasePath("/lineup-vehicle-icons/14.png"),
  "бмп кол": withBasePath("/lineup-vehicle-icons/13.png"),
  "соплайка лодка": withBasePath("/lineup-vehicle-icons/30.png"),
  "пехотка лодка": withBasePath("/lineup-vehicle-icons/28.png"),
  "лодка с пул": withBasePath("/lineup-vehicle-icons/29.png"),
}

function isMeaningful(value: unknown) {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  return text.length > 0 && text.toLowerCase() !== "cellimage"
}

function isHeaderRow(player: LineupPlayer) {
  return ["N", "№", "Role", "Роль", "Игрок", "Тэг", "Отряд"].some((value) =>
    [player.number, player.role, player.nickname, player.tag, player.vehicle_color].some((field) => String(field ?? "").trim().toLowerCase() === value.toLowerCase()),
  )
}

function isServiceRow(player: LineupPlayer) {
  const number = Number(player.number)
  return Number.isFinite(number) && number < 1
}

function hasAssignedPlayer(player: LineupPlayer) {
  return [player.nickname, player.tag, player.role, player.specialist, player.vehicle].some(isMeaningful)
}

function normalizeRows(rows: LineupPlayer[] | undefined) {
  const cleanRows = (rows ?? []).filter((row) => !isHeaderRow(row) && !isServiceRow(row))
  const byNumber = new Map<number, LineupPlayer>()

  cleanRows.forEach((row, index) => {
    const number = Number(row.number)
    const fallbackNumber = index + 1
    const rowNumber = Number.isFinite(number) && number >= 1 && number <= 9 ? number : fallbackNumber
    if (rowNumber >= 1 && rowNumber <= 9 && !byNumber.has(rowNumber)) {
      byNumber.set(rowNumber, { ...row, number: rowNumber })
    }
  })

  return Array.from({ length: 9 }, (_, index) => byNumber.get(index + 1) ?? { number: index + 1 })
}

function parseMatchTitle(name: string | null | undefined, side: LineupSideKey) {
  const source = String(name ?? "").trim()
  if (!source) return side === "siteOne" ? "Сторона 1" : "Сторона 2"

  const parts = source.split("|").map((part) => part.trim()).filter(Boolean)
  const matchup = parts.at(-1)
  if (!matchup?.includes(" vs ")) return source

  const [left, right] = matchup.split(/\s+vs\s+/i).map((part) => part.trim())
  if (!left || !right || side === "siteOne") return source

  return [...parts.slice(0, -1), `${right} vs ${left}`].join(" | ")
}

function getMatchupLabel(name: string | null | undefined, side: LineupSideKey) {
  const title = parseMatchTitle(name, side)
  return title.split("|").map((part) => part.trim()).filter(Boolean).at(-1) ?? (side === "siteOne" ? "Сторона 1" : "Сторона 2")
}

function normalizeVehicleKey(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^(\d+)\s*[.)-]?\s*/, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
}

function getVehicleColor(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase()
  const colors: Record<string, string> = {
    BLACK: "#3f3f46",
    BLUE: "#0891b2",
    BROWN: "#7f1d1d",
    GREEN: "#047857",
    ORANGE: "#ea580c",
    PURPLE: "#6d28d9",
    RED: "#b91c1c",
    YELLOW: "#ca8a04",
  }
  return colors[normalized] ?? "#52525b"
}

function getVehicleIconAsset(vehicle: string | number | null | undefined) {
  return VEHICLE_ICON_BY_LABEL[normalizeVehicleKey(vehicle)] ?? null
}

function splitMatchTitle(title: string) {
  const parts = title.split("|").map((part) => part.trim()).filter(Boolean)
  return {
    lead: parts[0] ?? title,
    details: parts.slice(1),
  }
}

function VehicleIconBadge({ vehicle, color }: { vehicle: string; color?: string | null }) {
  const icon = getVehicleIconAsset(vehicle)
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] border border-white/20 shadow-sm"
      style={{ backgroundColor: getVehicleColor(color) }}
    >
      {icon ? <Image src={icon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" unoptimized /> : null}
    </span>
  )
}

function SquadTable({ name, rows }: { name: SquadName; rows: LineupPlayer[] }) {
  const style = SQUAD_STYLES[name]
  const normalizedRows = normalizeRows(rows)
  const filledRows = normalizedRows.filter(hasAssignedPlayer)
  const freeSlots = Math.max(0, 9 - filledRows.length)
  const topVehicles = Array.from(
    filledRows.reduce((acc, player) => {
      const key = isMeaningful(player.vehicle) ? String(player.vehicle) : ""
      if (key) {
        acc.set(key, (acc.get(key) ?? 0) + 1)
      }
      return acc
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .slice(0, 3)

  return (
    <div className={cn("overflow-hidden rounded-[18px] border bg-background/40 shadow-[0_18px_40px_rgba(0,0,0,0.25)] backdrop-blur-sm", style.border)}>
      <div className={cn("relative overflow-hidden border-b border-white/8", style.panel)}>
        <div className={cn("absolute inset-0 bg-gradient-to-r", style.glow)} />
        <div className="relative flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold tracking-[0.22em]", style.text)}>{name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", style.badge)}>
                {filledRows.length}/9
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filledRows.length > 0 ? `Занято ${filledRows.length} слотов` : "Состав пока не заполнен"}
            </p>
          </div>
          {topVehicles.length > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {topVehicles.map(([vehicle]) => (
                <Tooltip key={`${name}-${vehicle}`}>
                  <TooltipTrigger asChild>
                    <span>
                      <VehicleIconBadge vehicle={vehicle} color={name} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{vehicle}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-3">
        {filledRows.length > 0 ? (
          filledRows.map((player, index) => {
          const nickname = isMeaningful(player.nickname) ? String(player.nickname) : ""
          const tag = isMeaningful(player.tag) ? String(player.tag) : ""
          const vehicleText = isMeaningful(player.vehicle) ? String(player.vehicle) : ""
          const role = isMeaningful(player.role) ? String(player.role) : ""
          const specialist = isMeaningful(player.specialist) ? String(player.specialist) : ""

          return (
            <div
              key={`${name}-${index}-${nickname || tag || vehicleText}`}
              className="grid grid-cols-[auto_auto_auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 transition-colors hover:border-white/15"
            >
              <div className="flex items-center justify-center">
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-slate-950", style.accent)}>
                  {Number(player.number) || index + 1}
                </span>
              </div>
              <div className="flex items-center justify-center">
                {vehicleText ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <VehicleIconBadge vehicle={vehicleText} color={player.vehicle_color} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{vehicleText}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex items-center justify-center">
                {role ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <RoleIcon role={role} className="h-6 w-6" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{formatRoleName(role) || role}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex items-center justify-center">
                {specialist ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <SpecializationIcon specialization={specialist} className="text-xl" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{getSpecializationLabel(specialist)}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {tag ? <span className={cn("shrink-0", style.text)}>{tag}</span> : null}
                  {nickname ? <span className="truncate text-christmas-snow">{nickname}</span> : <span className="text-muted-foreground">Игрок не указан</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {role ? <span className="truncate">{formatRoleName(role) || role}</span> : null}
                  {role && specialist ? <span className="text-white/20">•</span> : null}
                  {specialist ? <span className="truncate">{getSpecializationLabel(specialist)}</span> : null}
                </div>
              </div>
            </div>
          )
        })
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/15 px-4 py-6 text-center text-sm text-muted-foreground">
            Для этого отряда лайнап пока не заполнен.
          </div>
        )}

        {freeSlots > 0 && filledRows.length > 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-center text-xs text-muted-foreground">
            Свободных слотов: {freeSlots}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function LineupBoard() {
  const [lineup, setLineup] = useState<LineupPayload | null>(null)
  const [side, setSide] = useState<LineupSideKey>("siteOne")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLineup = useCallback(
    async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(LINEUP_API_URL, { cache: "no-store" })
        if (!response.ok) throw new Error(`API ${response.status}`)
        const payload = (await response.json()) as LineupPayload
        setLineup(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить лайнап")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadLineup()
  }, [loadLineup])

  const currentSide = lineup?.[side] ?? {}
  const title = parseMatchTitle(lineup?.name, side)
  const titleMeta = splitMatchTitle(title)
  const totalPlayers = SQUAD_ORDER.reduce((sum, squadName) => sum + normalizeRows(currentSide[squadName] ?? []).filter(hasAssignedPlayer).length, 0)
  const activeSquads = SQUAD_ORDER.reduce((sum, squadName) => sum + (normalizeRows(currentSide[squadName] ?? []).some(hasAssignedPlayer) ? 1 : 0), 0)

  return (
    <Card className="overflow-hidden border-christmas-gold/20 bg-card/60">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)_minmax(240px,1fr)] xl:items-center">
          <div className="hidden xl:block" />
          <div className="min-w-0 text-center">
            <h2 className="truncate text-xl font-bold text-christmas-snow">{titleMeta.lead}</h2>
            {titleMeta.details.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {titleMeta.details.map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full border border-christmas-gold/20 bg-background/35 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-christmas-gold/30">
              {(["siteOne", "siteTwo"] as const).map((sideKey) => (
                <button
                  key={sideKey}
                  type="button"
                  onClick={() => setSide(sideKey)}
                  className={cn(
                    "px-3 py-2 text-sm font-semibold transition-colors",
                    side === sideKey ? "bg-christmas-gold text-slate-950" : "bg-background/40 text-christmas-snow hover:bg-christmas-gold/10 hover:text-christmas-gold",
                  )}
                >
                  {getMatchupLabel(lineup?.name, sideKey)}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" className="border-christmas-gold/30 text-christmas-gold hover:bg-christmas-gold/10 hover:text-christmas-gold" onClick={() => void loadLineup()} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Обновить
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">Ошибка загрузки лайнапа: {error}</div> : null}

        {loading && !lineup ? (
          <div className="rounded-md border border-border/50 bg-background/30 px-3 py-8 text-center text-sm text-muted-foreground">Загрузка лайнапа...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-christmas-gold/15 bg-background/30 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">
                  <Users className="h-3.5 w-3.5" />
                  <span>Занято слотов</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-christmas-snow">{totalPlayers} / 72</p>
              </div>
              <div className="rounded-2xl border border-christmas-gold/15 bg-background/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">Активных отрядов</div>
                <p className="mt-2 text-lg font-semibold text-christmas-snow">{activeSquads} / 8</p>
              </div>
              <div className="rounded-2xl border border-christmas-gold/15 bg-background/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">Текущая сторона</div>
                <p className="mt-2 text-lg font-semibold text-christmas-snow">{getMatchupLabel(lineup?.name, side)}</p>
              </div>
              <div className="rounded-2xl border border-christmas-gold/15 bg-background/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-christmas-gold/80">Свободных мест</div>
                <p className="mt-2 text-lg font-semibold text-christmas-snow">{72 - totalPlayers}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {SQUAD_ORDER.map((squadName) => (
                <SquadTable key={`${side}-${squadName}`} name={squadName} rows={currentSide[squadName] ?? []} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
