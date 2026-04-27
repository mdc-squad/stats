"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Image from "next/image"
import { RefreshCw } from "lucide-react"
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

const SQUAD_STYLES: Record<SquadName, { header: string; cell: string; number: string; ring: string }> = {
  GREEN: { header: "bg-emerald-800", cell: "bg-emerald-200/85 text-slate-950", number: "bg-emerald-700 text-white", ring: "border-emerald-500/60" },
  RED: { header: "bg-red-800", cell: "bg-red-200/85 text-slate-950", number: "bg-red-700 text-white", ring: "border-red-500/60" },
  YELLOW: { header: "bg-yellow-600", cell: "bg-yellow-200/90 text-slate-950", number: "bg-yellow-600 text-white", ring: "border-yellow-400/70" },
  BLUE: { header: "bg-cyan-700", cell: "bg-cyan-200/80 text-slate-950", number: "bg-cyan-700 text-white", ring: "border-cyan-400/60" },
  PURPLE: { header: "bg-violet-800", cell: "bg-violet-200/80 text-slate-950", number: "bg-violet-800 text-white", ring: "border-violet-500/60" },
  ORANGE: { header: "bg-orange-600", cell: "bg-orange-200/85 text-slate-950", number: "bg-orange-600 text-white", ring: "border-orange-400/70" },
  BROWN: { header: "bg-red-950", cell: "bg-red-300/75 text-slate-950", number: "bg-red-950 text-white", ring: "border-red-900/80" },
  BLACK: { header: "bg-zinc-700", cell: "bg-zinc-400/75 text-slate-950", number: "bg-zinc-700 text-white", ring: "border-zinc-500/80" },
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

function LineupCell({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn("flex min-h-8 items-center border-r border-black/35 px-1.5", className)}>{children}</div>
}

function SquadTable({ name, rows }: { name: SquadName; rows: LineupPlayer[] }) {
  const style = SQUAD_STYLES[name]

  return (
    <div className={cn("min-w-[360px] overflow-hidden border border-black/55", style.ring)}>
      <div className={cn("flex h-9 items-center justify-center border-b border-black/50 text-lg font-bold text-white", style.header)}>{name}</div>
      <div>
        {normalizeRows(rows).map((player, index) => {
          const nickname = isMeaningful(player.nickname) ? String(player.nickname) : ""
          const tag = isMeaningful(player.tag) ? String(player.tag) : ""
          const vehicleText = isMeaningful(player.vehicle) ? String(player.vehicle) : ""
          const role = isMeaningful(player.role) ? String(player.role) : ""
          const specialist = isMeaningful(player.specialist) ? String(player.specialist) : ""

          return (
            <div key={`${name}-${index}`} className={cn("grid min-h-8 grid-cols-[32px_32px_32px_32px_minmax(94px,1fr)_minmax(130px,1.35fr)] border-b border-black/45 last:border-b-0", style.cell)}>
              <LineupCell className={cn("justify-center px-0 text-xs font-semibold", style.number)}>{index + 1}</LineupCell>
              <LineupCell className="justify-center px-0">
                {vehicleText ? (
                  <Tooltip>
                    <TooltipTrigger asChild><span><VehicleIconBadge vehicle={vehicleText} color={player.vehicle_color} /></span></TooltipTrigger>
                    <TooltipContent side="top">{vehicleText}</TooltipContent>
                  </Tooltip>
                ) : null}
              </LineupCell>
              <LineupCell className="justify-center px-0">
                {role ? (
                  <Tooltip>
                    <TooltipTrigger asChild><span><RoleIcon role={role} className="h-6 w-6" /></span></TooltipTrigger>
                    <TooltipContent side="top">{formatRoleName(role) || role}</TooltipContent>
                  </Tooltip>
                ) : null}
              </LineupCell>
              <LineupCell className="justify-center px-0">
                {specialist ? (
                  <Tooltip>
                    <TooltipTrigger asChild><span><SpecializationIcon specialization={specialist} className="text-xl" /></span></TooltipTrigger>
                    <TooltipContent side="top">{getSpecializationLabel(specialist)}</TooltipContent>
                  </Tooltip>
                ) : null}
              </LineupCell>
              <LineupCell className="justify-end gap-1 text-right text-sm font-semibold">
                {tag ? <span className="truncate">{tag}</span> : null}
              </LineupCell>
              <LineupCell className="min-w-0 text-base font-semibold">
                {nickname ? <span className="truncate">{nickname}</span> : null}
              </LineupCell>
            </div>
          )
        })}
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

  return (
    <Card className="overflow-hidden border-christmas-gold/20 bg-card/60">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)_minmax(240px,1fr)] xl:items-center">
          <div className="hidden xl:block" />
          <h2 className="min-w-0 truncate text-center text-xl font-bold text-christmas-snow">{title}</h2>
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
          <div className="overflow-x-auto rounded-md border border-border/60 bg-black/80 p-1">
            <div className="grid min-w-[1460px] grid-cols-4 gap-0">
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
