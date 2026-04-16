"use client"

import { useMemo, useState } from "react"
import { PlayerAvatar } from "@/components/player-avatar"
import { RoleIcon, formatRoleName } from "@/components/role-icon"
import { SpecializationIcon } from "@/components/specialization-icon"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getMetricIcon, type AppMetricIconKey } from "@/lib/app-icons"
import type { PastGamePlayerStat, PastGameSummary, Player } from "@/lib/data-utils"
import { cn } from "@/lib/utils"
import { getSquadLabels, getSquadToneClasses, getSquadToneKey, isSelectableSquadLabel, type SquadToneKey } from "@/lib/squad-utils"
import { Award, Crown, ExternalLink, Shield, Sparkles, Swords, Trophy } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"

type SquadMetricKey = "games" | "avgRevives" | "avgHeals" | "avgDowns" | "avgKills" | "avgDeaths" | "avgVehicle" | "kd" | "kda" | "avgElo" | "avgTbf" | "avgRating"
type ChartMetricKey = Exclude<SquadMetricKey, "games"> | "mvpCount"
type MetricDef = { key: SquadMetricKey; label: string; icon: AppMetricIconKey; digits?: number }
type ChartMetricDef = { key: ChartMetricKey; label: string; icon: AppMetricIconKey; digits?: number }
type SquadOverviewProps = { games: PastGameSummary[]; players: Player[]; squadDomain: string[]; onOpenGame?: (eventId: string) => void; onOpenPlayer?: (playerId: string) => void }
type SquadPlayerSummary = { player_id: string; nickname: string; tag: string; steam_id: string; games: number; wins: number; kills: number; deaths: number; downs: number; revives: number; heals: number; vehicle: number; avgElo: number; avgTbf: number; avgRating: number; kd: number; kda: number; popularRole: string; specialization: string; isSquadLeader: boolean }
type SquadMatchSummary = { eventId: string; startedAt: string; map: string; mode: string | null; opponent: string | null; faction: string | null; result: string | null; isWin: boolean | null; players: number; kills: number; deaths: number; downs: number; revives: number; heals: number; vehicle: number; avgElo: number; kd: number; kda: number; isMvp: boolean }
type DistributionSlice = { label: string; count: number; color: string }
type SquadSummary = { label: string; games: number; wins: number; kills: number; deaths: number; downs: number; revives: number; heals: number; vehicle: number; mvpCount: number; avgRevives: number; avgHeals: number; avgDowns: number; avgKills: number; avgDeaths: number; avgVehicle: number; avgElo: number; avgTbf: number; avgRating: number; kd: number; kda: number; playersRanked: SquadPlayerSummary[]; leader: SquadPlayerSummary | null; roleSlices: DistributionSlice[]; specializationSlices: DistributionSlice[]; recent: SquadMatchSummary[]; allMatches: SquadMatchSummary[]; bestMatch: SquadMatchSummary | null }
type ChartValueEntry = { key: string; name: string; color: string; value: number | null }
type LockedChartValues = { label: string; eventLabel?: string; entries: ChartValueEntry[] }

const SQUAD_COLORS: Record<SquadToneKey, string> = { red: "#fb7185", blue: "#38bdf8", green: "#34d399", yellow: "#fbbf24", orange: "#fb923c", purple: "#a78bfa", pink: "#f472b6", cyan: "#22d3ee", brown: "#b45309", black: "#cbd5e1", white: "#f8fafc", neutral: "#94a3b8" }
const SQUAD_ORDER: SquadToneKey[] = ["green", "red", "yellow", "blue", "purple", "orange", "brown", "black"]
const ROLE_COLORS = ["#fbbf24", "#38bdf8", "#34d399", "#fb7185", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c"]
const METRIC_DEFS: MetricDef[] = [
  { key: "games", label: "Игр", icon: "events", digits: 0 },
  { key: "avgRevives", label: "Ср. поднятий", icon: "revives" },
  { key: "avgHeals", label: "Ср. хил", icon: "heals" },
  { key: "avgDowns", label: "Ср. ноки", icon: "downs" },
  { key: "avgKills", label: "Ср. убийства", icon: "kills" },
  { key: "avgDeaths", label: "Ср. смерти", icon: "deaths" },
  { key: "avgVehicle", label: "Ср. техника", icon: "vehicle" },
  { key: "kd", label: "Ср. KD", icon: "kd", digits: 2 },
  { key: "kda", label: "Ср. KDA", icon: "kda", digits: 2 },
  { key: "avgElo", label: "Ср. ELO", icon: "elo" },
  { key: "avgTbf", label: "Ср. ТБФ", icon: "tbf" },
  { key: "avgRating", label: "Ср. ОР", icon: "rating" },
]
const CHART_METRICS: ChartMetricDef[] = [
  ...METRIC_DEFS.filter((m): m is MetricDef & { key: Exclude<ChartMetricKey, "mvpCount"> } => m.key !== "games" && m.key !== "avgTbf" && m.key !== "avgRating"),
  { key: "mvpCount", label: "MVP", icon: "win_rate", digits: 0 },
]
const PLAYER_METRICS: MetricDef[] = METRIC_DEFS.map((metric) => ({
  ...metric,
  label: capitalizeMetricLabel(metric.label.replace(/^(?:Ср\.|РЎСЂ\.)\s*/i, "")),
}))

function isVisibleSquadLabel(label: string) {
  const normalized = label.trim().toLowerCase()
  return (
    isSelectableSquadLabel(label) &&
    normalized !== "0" &&
    normalized !== "без отряда" &&
    normalized !== "не указан" &&
    !normalized.includes("без отряда")
  )
}

function squadOrderIndex(label: string) {
  const index = SQUAD_ORDER.indexOf(getSquadToneKey(label))
  return index === -1 ? SQUAD_ORDER.length : index
}

function capitalizeMetricLabel(label: string) {
  return label ? `${label[0].toLocaleUpperCase("ru-RU")}${label.slice(1)}` : label
}

function isIgnoredSpecialization(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  return (
    !normalized ||
    normalized === "нет" ||
    normalized === "no" ||
    normalized === "none" ||
    normalized === "null" ||
    normalized === "-" ||
    normalized === "каст" ||
    normalized === "cast" ||
    normalized === "caster" ||
    normalized.includes("не указан") ||
    normalized.includes("отсутств")
  )
}

function cleanSpecialization(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return isIgnoredSpecialization(trimmed) ? "" : trimmed
}

function fDate(value: string) { const d = new Date(value); return value && !Number.isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}` : "?" }
function fNum(value: number, digits = 1) { if (!Number.isFinite(value)) return "0"; return digits === 0 ? Math.round(value).toLocaleString("ru-RU") : value.toFixed(digits) }
function ratio(a: number, b: number) { return b > 0 ? a / b : a }
function popular(values: string[]) { const m = new Map<string, number>(); values.map((v) => v.trim()).filter(Boolean).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))[0]?.[0] ?? "" }
function popularSpecialization(values: string[]) { return popular(values.map(cleanSpecialization).filter(Boolean)) }
function resultLabel(isWin: boolean | null, result: string | null) { return result?.trim() || (isWin === true ? "Победа" : isWin === false ? "Поражение" : "Результат не указан") }
function playerSquadLabel(player: PastGamePlayerStat, squadDomain: string[]) {
  return [player.squad_label, ...(player.squad_labels ?? [])]
    .map((v) => (v ? getSquadLabels([v], squadDomain)[0]?.trim() : undefined))
    .find((v): v is string => Boolean(v) && isVisibleSquadLabel(v)) ?? null
}
function matchMetric(match: SquadMatchSummary, metric: ChartMetricKey) { if (metric === "kd") return match.kd; if (metric === "kda") return match.kda; if (metric === "avgElo") return match.avgElo; if (metric === "mvpCount") return match.isMvp ? 1 : 0; if (metric === "avgTbf" || metric === "avgRating") return 0; const key = metric.replace("avg", "").toLowerCase() as keyof SquadMatchSummary; return match.players > 0 ? Number(match[key] ?? 0) / match.players : 0 }
function playerMetric(player: SquadPlayerSummary, metric: SquadMetricKey) {
  if (metric === "games") return player.games
  if (metric === "kd") return player.kd
  if (metric === "kda") return player.kda
  if (metric === "avgElo") return player.avgElo
  if (metric === "avgTbf") return player.avgTbf
  if (metric === "avgRating") return player.avgRating
  const key = metric.replace("avg", "").toLowerCase() as keyof SquadPlayerSummary
  return player.games > 0 ? Number(player[key] ?? 0) / player.games : 0
}
function playerMetricDigits(metric: SquadMetricKey) {
  if (metric === "games" || metric === "avgElo" || metric === "avgTbf" || metric === "avgRating") return 0
  if (metric === "kd" || metric === "kda") return 2
  return 1
}
function MetricTile({ metric, value, compact = false }: { metric: MetricDef; value: number; compact?: boolean }) {
  const Icon = getMetricIcon(metric.icon)
  return <Tooltip><TooltipTrigger asChild><div className={cn("rounded-lg border border-border/50 bg-background/35 p-3 text-center", compact && "p-2")}><p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5 text-christmas-gold" /><span className="truncate">{metric.label}</span></p><p className={cn("mt-2 font-semibold text-christmas-snow", compact ? "text-sm" : "text-lg")}>{fNum(value, metric.digits)}</p></div></TooltipTrigger><TooltipContent side="top" className="border border-border bg-card text-card-foreground">{metric.label}</TooltipContent></Tooltip>
}

function PlayerMetricValue({ metric, value }: { metric: MetricDef; value: number }) {
  const Icon = getMetricIcon(metric.icon)
  return <Tooltip><TooltipTrigger asChild><div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-center"><Icon className="h-3.5 w-3.5 text-christmas-gold" /><span className="text-[11px] font-medium text-christmas-snow">{fNum(value, playerMetricDigits(metric.key))}</span></div></TooltipTrigger><TooltipContent side="top" className="border border-border bg-card text-card-foreground">{metric.label}</TooltipContent></Tooltip>
}

function DistributionDonut({ slices, emptyText, iconType = "role" }: { slices: DistributionSlice[]; emptyText: string; iconType?: "role" | "specialization" }) {
  if (slices.length === 0) return <div className="flex h-full flex-1 items-center gap-3 rounded-lg border border-border/50 bg-background/35 p-3"><div className="h-16 w-16 rounded-full border border-border/60 bg-background/60" /><p className="text-xs text-muted-foreground">{emptyText}</p></div>
  const total = slices.reduce((s, x) => s + x.count, 0); let c = 0
  const gradient = slices.map((x) => { const a = c; const b = c + (x.count / total) * 100; c = b; return `${x.color} ${a}% ${b}%` }).join(", ")
  return <div className="grid h-full flex-1 gap-3 rounded-lg border border-border/50 bg-background/35 p-3 sm:grid-cols-[auto_1fr]"><div className="h-20 w-20 rounded-full border border-border/60" style={{ background: `conic-gradient(${gradient})` }}><div className="m-4 h-12 w-12 rounded-full border border-border/50 bg-card/95" /></div><div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">{slices.map((x) => <div key={x.label} className="flex min-w-0 items-center gap-1.5">{iconType === "specialization" ? <SpecializationIcon specialization={x.label} className="text-sm" /> : <RoleIcon role={x.label} className="h-4 w-4" />}<span className="truncate text-muted-foreground">{iconType === "specialization" ? x.label : formatRoleName(x.label)}</span><span className="font-medium text-christmas-snow">{x.count}</span></div>)}</div></div>
}

function SquadChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const rows = [...payload].filter((x) => Number.isFinite(Number(x.value))).sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
  return <div className="max-h-80 min-w-[220px] overflow-y-auto rounded-lg border border-border bg-card/95 p-3 text-xs shadow-xl"><p className="mb-2 font-semibold text-christmas-snow">{label}</p><div className="space-y-1">{rows.map((x) => <div key={x.name} className="grid grid-cols-[1fr_auto] items-center gap-3"><span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: x.color }} /><span className="truncate">{x.name}</span></span><span className="font-medium text-christmas-snow">{fNum(Number(x.value), 1)}</span></div>)}</div></div>
}

function chartMetricDigits(metric: ChartMetricKey) {
  if (metric === "kd" || metric === "kda") return 2
  if (metric === "mvpCount") return 0
  return 1
}

function formatChartMetric(metric: ChartMetricKey, value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "\u043d/\u0434"
  return fNum(value, chartMetricDigits(metric))
}

function formatChartDelta(metric: ChartMetricKey, value: number) {
  const formatted = fNum(Math.abs(value), chartMetricDigits(metric))
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}`
}

function getSortedChartEntries(payload: Array<{ dataKey?: string | number; name?: string | number; color?: string; value?: number | string | null }>): ChartValueEntry[] {
  return payload
    .map((entry) => {
      const value = typeof entry.value === "number" ? entry.value : typeof entry.value === "string" ? Number(entry.value) : null
      return { key: String(entry.dataKey ?? entry.name ?? ""), name: String(entry.name ?? ""), color: entry.color ?? "var(--muted-foreground)", value }
    })
    .filter((entry) => entry.key && entry.name && entry.value !== null && Number.isFinite(entry.value))
    .sort((a, b) => Number(b.value) - Number(a.value))
}

function ChartValuesPanel({ title, metric, values, onClear }: { title: string; metric: ChartMetricKey; values: LockedChartValues; onClear?: () => void }) {
  return <div className="rounded-xl border border-border/50 bg-background/35 p-3 text-sm"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-christmas-snow">{title}: {values.label}{values.eventLabel ? ` \u2022 ${values.eventLabel}` : ""}</p>{onClear ? <button type="button" className="rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-background/70 hover:text-christmas-snow" onClick={onClear}>{"\u0421\u043d\u044f\u0442\u044c \u0444\u0438\u043a\u0441\u0430\u0446\u0438\u044e"}</button> : null}</div><div className={values.entries.length > 8 ? "grid grid-cols-1 gap-1.5 sm:grid-cols-2" : "space-y-1.5"}>{values.entries.map((entry) => <div key={entry.key} className="flex items-center gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate text-christmas-snow">{entry.name}</span></span><span className="shrink-0 font-medium text-christmas-snow">{formatChartMetric(metric, entry.value)}</span></div>)}</div></div>
}

function ChartDynamicsPanel({ metric, left, right }: { metric: ChartMetricKey; left: LockedChartValues; right: LockedChartValues }) {
  const leftByKey = new Map(left.entries.map((entry) => [entry.key, entry]))
  const dynamics = right.entries.map((rightEntry) => { const leftEntry = leftByKey.get(rightEntry.key); if (!leftEntry || leftEntry.value === null || rightEntry.value === null) return null; return { key: rightEntry.key, name: rightEntry.name, color: rightEntry.color, from: leftEntry.value, to: rightEntry.value, delta: rightEntry.value - leftEntry.value } }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).sort((a, b) => b.delta - a.delta)
  if (dynamics.length === 0) return null
  return <div className="rounded-xl border border-christmas-gold/20 bg-christmas-gold/10 p-3 text-sm"><div className="mb-2 space-y-1"><p className="font-medium text-christmas-snow">{"\u0414\u0438\u043d\u0430\u043c\u0438\u043a\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f"}</p><p className="text-xs text-muted-foreground">{left.label}{left.eventLabel ? ` \u2022 ${left.eventLabel}` : ""} {"\u2192"} {right.label}{right.eventLabel ? ` \u2022 ${right.eventLabel}` : ""}</p></div><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{dynamics.map((entry) => <div key={entry.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-christmas-snow">{entry.name}</span><span className="text-muted-foreground">{formatChartMetric(metric, entry.from)} {"\u2192"} {formatChartMetric(metric, entry.to)}</span><span className={entry.delta >= 0 ? "font-medium text-christmas-green" : "font-medium text-christmas-red"}>{formatChartDelta(metric, entry.delta)}</span></div>)}</div></div>
}

export function SquadOverview({ games, players, squadDomain, onOpenGame, onOpenPlayer }: SquadOverviewProps) {
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>("avgElo")
  const [hiddenSquadLabels, setHiddenSquadLabels] = useState<Set<string>>(() => new Set())
  const [lockedValues, setLockedValues] = useState<LockedChartValues[]>([])
  const { squads, chartData, chartLines } = useMemo(() => {
    const playersById = new Map(players.map((p) => [p.player_id, p]))
    type MP = Omit<SquadPlayerSummary, "avgElo" | "avgTbf" | "avgRating" | "kd" | "kda" | "popularRole" | "specialization"> & { elo: number; roles: string[]; specs: string[] }
    type MS = Omit<SquadSummary, "avgRevives" | "avgHeals" | "avgDowns" | "avgKills" | "avgDeaths" | "avgVehicle" | "avgElo" | "avgTbf" | "avgRating" | "kd" | "kda" | "playersRanked" | "leader" | "roleSlices" | "specializationSlices" | "recent" | "allMatches" | "bestMatch"> & { elo: number; players: Map<string, MP>; roles: Map<string, number>; specializations: Map<string, number>; matches: SquadMatchSummary[] }
    const bySquad = new Map<string, MS>()
    const ensure = (label: string) => {
      if (!bySquad.has(label)) bySquad.set(label, { label, games: 0, wins: 0, kills: 0, deaths: 0, downs: 0, revives: 0, heals: 0, vehicle: 0, elo: 0, mvpCount: 0, players: new Map(), roles: new Map(), specializations: new Map(), matches: [] })
      return bySquad.get(label)!
    }
    const addRoster = (label: string, p: Player) => {
      const s = ensure(label)
      if (!s.players.has(p.player_id)) s.players.set(p.player_id, { player_id: p.player_id, nickname: p.nickname, tag: p.tag, steam_id: p.steam_id, games: 0, wins: 0, kills: 0, deaths: 0, downs: 0, revives: 0, heals: 0, vehicle: 0, elo: 0, roles: [], specs: [] })
    }

    squadDomain.map((x) => getSquadLabels([x], squadDomain)[0]?.trim()).filter((x): x is string => Boolean(x) && isVisibleSquadLabel(x)).forEach(ensure)
    players.forEach((p) => getSquadLabels(p.teams ?? [], squadDomain).filter(isVisibleSquadLabel).forEach((label) => addRoster(label, p)))

    games.forEach((game) => {
      const grouped = new Map<string, PastGamePlayerStat[]>()
      game.players.forEach((p) => {
        const label = playerSquadLabel(p, squadDomain)
        if (!label) return
        ensure(label)
        if (!grouped.has(label)) grouped.set(label, [])
        grouped.get(label)!.push(p)
      })
      const matchSummaries: Array<{ squad: MS; match: SquadMatchSummary }> = []
      grouped.forEach((group, label) => {
        const squad = ensure(label)
        const count = group.length
        const kills = group.reduce((s, p) => s + p.kills, 0)
        const deaths = group.reduce((s, p) => s + p.deaths, 0)
        const downs = group.reduce((s, p) => s + p.downs, 0)
        const revives = group.reduce((s, p) => s + p.revives, 0)
        const heals = group.reduce((s, p) => s + p.heals, 0)
        const vehicle = group.reduce((s, p) => s + p.vehicle, 0)
        const avgElo = count > 0 ? group.reduce((s, p) => s + p.elo, 0) / count : 0
        const match: SquadMatchSummary = { eventId: game.event_id, startedAt: game.started_at, map: game.map || "Карта не указана", mode: game.mode, opponent: game.opponent, faction: game.faction_matchup || game.faction_1, result: game.result, isWin: game.is_win, players: count, kills, deaths, downs, revives, heals, vehicle, avgElo, kd: ratio(kills, deaths), kda: ratio(kills + downs, deaths), isMvp: false }
        squad.games += 1; squad.wins += game.is_win ? 1 : 0; squad.kills += kills; squad.deaths += deaths; squad.downs += downs; squad.revives += revives; squad.heals += heals; squad.vehicle += vehicle; squad.elo += avgElo; squad.matches.push(match); matchSummaries.push({ squad, match })
        group.forEach((gp) => {
          if (!squad.players.has(gp.player_id)) return
          const sp = squad.players.get(gp.player_id)!
          sp.games += 1; sp.wins += game.is_win ? 1 : 0; sp.kills += gp.kills; sp.deaths += gp.deaths; sp.downs += gp.downs; sp.revives += gp.revives; sp.heals += gp.heals; sp.vehicle += gp.vehicle; sp.elo += gp.elo
          if (gp.role) { sp.roles.push(gp.role); squad.roles.set(gp.role, (squad.roles.get(gp.role) ?? 0) + 1) }
          const specialization = cleanSpecialization(gp.specialization)
          if (specialization) { sp.specs.push(specialization); squad.specializations.set(specialization, (squad.specializations.get(specialization) ?? 0) + 1) }
        })
      })
      const best = [...matchSummaries].sort((a, b) => b.match.avgElo - a.match.avgElo)[0]
      if (best) { best.match.isMvp = true; best.squad.mvpCount += 1 }
    })

    const squads = [...bySquad.values()].map<SquadSummary>((squad) => {
      const playersRanked = [...squad.players.values()].map<SquadPlayerSummary>((p) => {
        const profile = playersById.get(p.player_id)
        const totals = profile?.totals
        const leadLabels = getSquadLabels(profile?.team_leads ?? [], squadDomain).filter(isVisibleSquadLabel)
        return { player_id: p.player_id, nickname: p.nickname, tag: p.tag || profile?.tag || "", steam_id: p.steam_id || profile?.steam_id || "", games: totals?.events ?? p.games, wins: totals?.wins ?? p.wins, kills: totals?.kills ?? p.kills, deaths: totals?.deaths ?? p.deaths, downs: totals?.downs ?? p.downs, revives: totals?.revives ?? p.revives, heals: totals?.heals ?? p.heals, vehicle: totals?.vehicle ?? p.vehicle, avgElo: totals?.elo ?? (p.games > 0 ? p.elo / p.games : 0), avgTbf: totals?.tbf ?? 0, avgRating: totals?.rating ?? 0, kd: totals?.kd ?? ratio(p.kills, p.deaths), kda: totals?.kda ?? ratio(p.kills + p.downs, p.deaths), popularRole: profile?.favorites.role_1 || popular(p.roles) || "", specialization: cleanSpecialization(profile?.favorites.specialization) || popularSpecialization(p.specs), isSquadLeader: leadLabels.includes(squad.label) }
      }).sort((a, b) => b.avgElo - a.avgElo || b.games - a.games || a.nickname.localeCompare(b.nickname, "ru"))
      const recent = [...squad.matches].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      const avgTbf = playersRanked.length ? playersRanked.reduce((s, p) => s + p.avgTbf, 0) / playersRanked.length : 0
      const avgRating = playersRanked.length ? playersRanked.reduce((s, p) => s + p.avgRating, 0) / playersRanked.length : 0
      return { label: squad.label, games: squad.games, wins: squad.wins, kills: squad.kills, deaths: squad.deaths, downs: squad.downs, revives: squad.revives, heals: squad.heals, vehicle: squad.vehicle, mvpCount: squad.mvpCount, avgRevives: squad.games ? squad.revives / squad.games : 0, avgHeals: squad.games ? squad.heals / squad.games : 0, avgDowns: squad.games ? squad.downs / squad.games : 0, avgKills: squad.games ? squad.kills / squad.games : 0, avgDeaths: squad.games ? squad.deaths / squad.games : 0, avgVehicle: squad.games ? squad.vehicle / squad.games : 0, avgElo: squad.games ? squad.elo / squad.games : 0, avgTbf, avgRating, kd: ratio(squad.kills, squad.deaths), kda: ratio(squad.kills + squad.downs, squad.deaths), playersRanked, leader: playersRanked.find((p) => p.isSquadLeader) ?? null, roleSlices: [...squad.roles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, 8).map(([label, count], i) => ({ label, count, color: ROLE_COLORS[i % ROLE_COLORS.length] })), specializationSlices: [...squad.specializations.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, 8).map(([label, count], i) => ({ label, count, color: ROLE_COLORS[(i + 2) % ROLE_COLORS.length] })), recent: recent.slice(0, 10), allMatches: recent, bestMatch: [...squad.matches].sort((a, b) => b.avgElo - a.avgElo)[0] ?? null }
    }).sort((a, b) => squadOrderIndex(a.label) - squadOrderIndex(b.label) || b.games - a.games || b.avgElo - a.avgElo || a.label.localeCompare(b.label, "ru"))

    const chartLines = squads.filter((s) => s.games > 0).map((s, i) => ({ label: s.label, key: `squad_${i}`, color: SQUAD_COLORS[getSquadToneKey(s.label)] }))
    const keyByLabel = new Map(chartLines.map((l) => [l.label, l.key]))
    const rows = new Map<string, Record<string, string | number>>()
    squads.forEach((s) => {
      const key = keyByLabel.get(s.label)
      if (!key) return
      let mvpTotal = 0
      s.allMatches.slice().reverse().forEach((m) => { if (!rows.has(m.eventId)) rows.set(m.eventId, { eventId: m.eventId, date: fDate(m.startedAt), fullDate: m.startedAt, eventLabel: m.map }); if (chartMetric === "mvpCount") mvpTotal += m.isMvp ? 1 : 0; rows.get(m.eventId)![key] = chartMetric === "mvpCount" ? mvpTotal : matchMetric(m, chartMetric) })
    })
    const chartData = [...rows.values()].sort((a, b) => new Date(String(a.fullDate)).getTime() - new Date(String(b.fullDate)).getTime())
    return { squads, chartData, chartLines }
  }, [chartMetric, games, players, squadDomain])

  const selectedChartMetric = CHART_METRICS.find((m) => m.key === chartMetric) ?? CHART_METRICS[0]
  const visibleChartLines = chartLines.filter((line) => !hiddenSquadLabels.has(line.label))
  const toggleChartSquad = (label: string) => { setHiddenSquadLabels((current) => { const next = new Set(current); if (next.has(label)) next.delete(label); else next.add(label); return next }); setLockedValues([]) }
  const handleChartMetricChange = (value: ChartMetricKey) => { setChartMetric(value); setLockedValues([]) }
  const handleChartClick = (state: unknown) => {
    const chartState = state as { activeLabel?: string | number; activePayload?: Array<{ dataKey?: string | number; name?: string | number; color?: string; value?: number | string | null; payload?: { eventLabel?: string } }> } | null | undefined
    if (!chartState?.activePayload?.length) return
    const entries = getSortedChartEntries(chartState.activePayload.filter((entry) => visibleChartLines.some((line) => line.key === String(entry.dataKey))))
    if (entries.length === 0) return
    const point = chartState.activePayload[0]?.payload
    setLockedValues((current) => [...current, { label: String(chartState.activeLabel ?? ""), eventLabel: point?.eventLabel ? String(point.eventLabel) : undefined, entries }].slice(-2))
  }
  if (squads.length === 0) return <Card className="border-border/50 bg-card/60"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-christmas-snow"><Shield className="h-4 w-4 text-christmas-gold" />Отряды по цветам</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Нет доступных отрядов для текущего среза.</CardContent></Card>

  return (
    <div className="space-y-4">
      <Card className="border-christmas-gold/20 bg-card/60">
        <CardContent className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-base font-semibold text-christmas-snow">Отряды по цветам</p><p className="text-sm text-muted-foreground">Общие показатели, последние матчи, составы и сравнение динамики между отрядами.</p></div>
          <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold">{squads.length} отрядов</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {squads.map((squad, index) => {
          const tone = getSquadToneClasses(squad.label)
          const maxElo = Math.max(...squad.recent.map((x) => x.avgElo), 1)
          return (
            <Card key={squad.label} className={`border ${tone.panel}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={tone.badge}>#{index + 1} • {squad.label}</Badge>
                      <Badge variant="outline" className="border-christmas-gold/30 text-christmas-gold"><Trophy className="mr-1 h-3.5 w-3.5" />MVP отряда: {squad.mvpCount}</Badge>
                      <Badge variant="outline" className="border-border/60 text-muted-foreground">{squad.playersRanked.length} игроков</Badge>
                    </div>
                    <CardTitle className="text-base text-christmas-snow">Карточка отряда</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Crown className="h-3.5 w-3.5 text-christmas-gold" /><span>Лидер отряда SL:</span>{squad.leader ? <button type="button" onClick={() => onOpenPlayer?.(squad.leader?.player_id ?? "")} className="font-medium text-christmas-snow transition-colors hover:text-christmas-gold">{squad.leader.tag ? `${squad.leader.tag} ` : ""}{squad.leader.nickname}</button> : <span>не указан</span>}</div>
                  </div>
                  <div className="text-right"><p className="text-4xl font-semibold leading-none text-christmas-snow md:text-5xl">{squad.avgElo.toFixed(1)}</p><p className="mt-1 text-[11px] text-muted-foreground">ср. ELO</p></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">{METRIC_DEFS.map((m) => <MetricTile key={m.key} metric={m} value={squad[m.key]} />)}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex h-full flex-col space-y-2"><p className="flex items-center gap-2 text-sm font-medium text-christmas-snow"><Sparkles className="h-4 w-4 text-christmas-gold" />Роли в отряде</p><DistributionDonut slices={squad.roleSlices} emptyText="Роли пока не определены." /></div>
                  <div className="flex h-full flex-col space-y-2"><p className="flex items-center gap-2 text-sm font-medium text-christmas-snow"><Award className="h-4 w-4 text-christmas-gold" />Специализации</p><DistributionDonut slices={squad.specializationSlices} emptyText="Специализации пока не определены." iconType="specialization" /></div>
                </div>
                {squad.bestMatch ? <button type="button" onClick={() => onOpenGame?.(squad.bestMatch?.eventId ?? "")} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-left transition-colors hover:border-christmas-gold/40 hover:bg-christmas-gold/10"><span className="min-w-0"><span className="block truncate text-sm font-medium text-christmas-snow">Лучший матч • {fDate(squad.bestMatch.startedAt)} • {squad.bestMatch.map}</span><span className="block truncate text-xs text-muted-foreground">{resultLabel(squad.bestMatch.isWin, squad.bestMatch.result)} • KD {squad.bestMatch.kd.toFixed(2)}</span></span><span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-christmas-gold">ELO {squad.bestMatch.avgElo.toFixed(1)}<ExternalLink className="h-3.5 w-3.5" /></span></button> : <div className="flex min-h-14 w-full items-center rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-xs text-muted-foreground">Лучший матч пока не определён.</div>}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-christmas-snow">Последние игры отряда</p>
                  {squad.recent.length === 0 ? <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-[11px] text-muted-foreground">У отряда пока нет матчей в текущем срезе.</div> : <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">{squad.recent.map((entry) => <div key={`${squad.label}-${entry.eventId}`} className="space-y-1"><Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onOpenGame?.(entry.eventId)} className="block w-full text-left"><div className={cn("w-full rounded-md border transition-transform hover:-translate-y-0.5", entry.isMvp ? "border-christmas-gold/70" : "border-transparent")} style={{ height: `${Math.max(18, Math.min(56, (entry.avgElo / maxElo) * 56))}px`, background: entry.isWin === true ? "linear-gradient(180deg, rgba(34,197,94,0.95), rgba(34,197,94,0.35))" : entry.isWin === false ? "linear-gradient(180deg, rgba(239,68,68,0.95), rgba(239,68,68,0.35))" : "linear-gradient(180deg, rgba(148,163,184,0.95), rgba(148,163,184,0.35))" }} /></button></TooltipTrigger><TooltipContent side="top" className="max-w-sm border border-border bg-card text-card-foreground"><p className="font-medium text-christmas-snow">{fDate(entry.startedAt)} • {resultLabel(entry.isWin, entry.result)}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Карта: {entry.map}</span><span>Режим: {entry.mode || "?"}</span><span>Оппонент: {entry.opponent || "?"}</span><span>Фракции: {entry.faction || "?"}</span><span>Игроков: {entry.players}</span><span>ELO: {entry.avgElo.toFixed(1)}</span><span>K/D: {entry.kd.toFixed(2)}</span><span>KDA: {entry.kda.toFixed(2)}</span><span>Убийства: {entry.kills}</span><span>Смерти: {entry.deaths}</span><span>Ноки: {entry.downs}</span><span>Поднятия: {entry.revives}</span><span>Хил: {entry.heals}</span><span>Техника: {entry.vehicle}</span></div>{entry.isMvp && <p className="mt-2 text-xs text-christmas-gold">Лучший отряд матча по среднему ELO.</p>}</TooltipContent></Tooltip><p className="text-center text-[10px] text-muted-foreground">{fDate(entry.startedAt)}</p></div>)}</div>}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-christmas-snow">Игроки отряда</p>
                  {squad.playersRanked.length === 0 ? <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-[11px] text-muted-foreground">Пока нет игроков, закрепленных за этим цветом.</div> : <div className="space-y-2">{squad.playersRanked.map((player) => <button type="button" key={`${squad.label}-${player.player_id}`} onClick={() => onOpenPlayer?.(player.player_id)} className="w-full rounded-lg border border-border/50 bg-background/35 px-3 py-2 text-left transition-colors hover:border-christmas-gold/40 hover:bg-christmas-gold/10"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1.45fr)] lg:items-center"><div className="flex min-w-0 items-center gap-3"><PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-christmas-snow">{player.tag ? <span className="text-christmas-gold">{player.tag} </span> : null}{player.nickname}</p><p className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground"><Tooltip><TooltipTrigger asChild><span className="inline-flex items-center gap-1"><RoleIcon role={player.popularRole} className="h-4 w-4" /><span className="truncate">{formatRoleName(player.popularRole) || "роль не указана"}</span></span></TooltipTrigger><TooltipContent side="top" className="border border-border bg-card text-card-foreground">Популярная роль</TooltipContent></Tooltip>{player.specialization ? <Tooltip><TooltipTrigger asChild><span className="inline-flex min-w-0 items-center gap-1"><SpecializationIcon specialization={player.specialization} className="text-sm" /><span className="truncate">{player.specialization}</span></span></TooltipTrigger><TooltipContent side="top" className="border border-border bg-card text-card-foreground">Популярная специализация</TooltipContent></Tooltip> : <span className="truncate">Специализация не указана</span>}</p></div></div><div className="grid grid-cols-6 gap-2 sm:grid-cols-12">{PLAYER_METRICS.map((m) => <PlayerMetricValue key={m.key} metric={m} value={playerMetric(player, m.key)} />)}</div></div></button>)}</div>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-christmas-gold/20 bg-card/60">
        <CardHeader className="gap-3 pb-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="flex items-center gap-2 text-base text-christmas-snow"><Swords className="h-4 w-4 text-christmas-gold" />Сравнение отрядов</CardTitle></div><Select value={chartMetric} onValueChange={(v) => handleChartMetricChange(v as ChartMetricKey)}><SelectTrigger className="w-full border-christmas-gold/20 bg-background/50 text-christmas-snow md:w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{CHART_METRICS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent></Select></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setHiddenSquadLabels(new Set()); setLockedValues([]) }} className="rounded-md border border-christmas-gold/30 px-2 py-1 text-xs text-christmas-gold hover:bg-christmas-gold/10">Все отряды</button>
            {chartLines.map((line) => {
              const hidden = hiddenSquadLabels.has(line.label)
              return <button key={line.key} type="button" onClick={() => toggleChartSquad(line.label)} className={cn("inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors", hidden ? "border-border/50 text-muted-foreground opacity-55" : "border-border/60 bg-background/30 text-christmas-snow hover:border-christmas-gold/40")}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />{line.label}</button>
            })}
          </div>
          <div className="h-[360px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }} onClick={handleChartClick}><CartesianGrid stroke="rgba(148, 163, 184, 0.18)" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickMargin={8} /><YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={42} /><RechartsTooltip content={<SquadChartTooltip />} wrapperStyle={{ pointerEvents: "auto" }} />{visibleChartLines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: line.color, fill: line.color }} connectNulls />)}</LineChart></ResponsiveContainer></div>
          <p className="text-[11px] text-muted-foreground">Параметр: {selectedChartMetric.label}. Клик по графику фиксирует до двух точек для сравнения.</p>
          {lockedValues.length > 0 ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{lockedValues.map((values, index) => <ChartValuesPanel key={`${values.label}-${values.eventLabel ?? ""}-${index}`} title={`Фиксация ${index + 1}`} metric={chartMetric} values={values} onClear={() => setLockedValues((current) => current.filter((_, currentIndex) => currentIndex !== index))} />)}</div> : null}
          {lockedValues.length === 2 ? <ChartDynamicsPanel metric={chartMetric} left={lockedValues[0]!} right={lockedValues[1]!} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
