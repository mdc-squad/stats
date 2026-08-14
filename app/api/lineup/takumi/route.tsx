import { ImageResponse } from "takumi-js/response"
import { googleFonts } from "takumi-js/helpers"
import { EXTERNAL_LINEUP_API_URL } from "@/lib/lineup-source"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const WIDTH = 1440
const HEIGHT = 860
const SQUAD_ORDER = ["GREEN", "RED", "YELLOW", "BLUE", "PURPLE", "ORANGE", "BROWN", "BLACK", "PINK", "WHITE"] as const

type LineupSide = "1" | "2"
type LineupSideKey = "siteOne" | "siteTwo"
type SquadName = (typeof SQUAD_ORDER)[number]

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

const takumiImageFetchCache = new Map<string, Promise<ArrayBuffer>>()

const SQUAD_COLORS: Record<SquadName, { border: string; panel: string; text: string; accent: string; row: string }> = {
  GREEN: { border: "#047857", panel: "rgba(4, 120, 87, 0.30)", text: "#a7f3d0", accent: "#10b981", row: "rgba(16, 185, 129, 0.25)" },
  RED: { border: "#b91c1c", panel: "rgba(185, 28, 28, 0.30)", text: "#fecaca", accent: "#ff3b45", row: "rgba(239, 68, 68, 0.24)" },
  YELLOW: { border: "#ca8a04", panel: "rgba(202, 138, 4, 0.26)", text: "#fef08a", accent: "#facc15", row: "rgba(234, 179, 8, 0.26)" },
  BLUE: { border: "#0891b2", panel: "rgba(8, 145, 178, 0.30)", text: "#a5f3fc", accent: "#06b6d4", row: "rgba(6, 182, 212, 0.25)" },
  PURPLE: { border: "#6d28d9", panel: "rgba(109, 40, 217, 0.30)", text: "#ddd6fe", accent: "#8b5cf6", row: "rgba(139, 92, 246, 0.25)" },
  ORANGE: { border: "#ea580c", panel: "rgba(154, 52, 18, 0.32)", text: "#fed7aa", accent: "#f97316", row: "rgba(249, 115, 22, 0.25)" },
  BROWN: { border: "#92400e", panel: "rgba(120, 53, 15, 0.32)", text: "#fde68a", accent: "#b45309", row: "rgba(180, 83, 9, 0.25)" },
  BLACK: { border: "#737373", panel: "rgba(64, 64, 64, 0.35)", text: "#fafafa", accent: "#737373", row: "rgba(163, 163, 163, 0.25)" },
  PINK: { border: "#db2777", panel: "rgba(190, 24, 93, 0.30)", text: "#fbcfe8", accent: "#ec4899", row: "rgba(236, 72, 153, 0.25)" },
  WHITE: { border: "#cbd5e1", panel: "rgba(203, 213, 225, 0.24)", text: "#f8fafc", accent: "#e2e8f0", row: "rgba(226, 232, 240, 0.28)" },
}

const VEHICLE_COLORS: Record<string, string> = {
  BLACK: "#3f3f46",
  BLUE: "#0891b2",
  BROWN: "#7f1d1d",
  GREEN: "#047857",
  ORANGE: "#ea580c",
  PINK: "#db2777",
  PURPLE: "#6d28d9",
  RED: "#b91c1c",
  WHITE: "#8b95a1",
  YELLOW: "#ca8a04",
}

const FACTION_ICON_BY_KEY: Record<string, string> = {
  ADF: "ADF.png",
  AFU: "AFU.png",
  BAF: "BAF.png",
  CAF: "CAF.png",
  CRF: "CRF.png",
  GFI: "GFI.png",
  IMF: "IMF.png",
  MEA: "MEI.png",
  MEI: "MEI.png",
  PLA: "PLA.png",
  PLAAGF: "PLAAGF.png",
  PLANMC: "PLANMC.png",
  RGF: "RGF.png",
  TLF: "TLF.png",
  USA: "USA.png",
  USMC: "USMC.png",
  VDV: "VDV.png",
  WPMC: "WPMC.png",
}

const ROLE_ICON_PATHS: Record<string, string> = {
  sl: "/squad-role-icons/squad-leader.png",
  squadleader: "/squad-role-icons/squad-leader.png",
  сквадной: "/squad-role-icons/squad-leader.png",
  медик: "/squad-role-icons/medic.png",
  medic: "/squad-role-icons/medic.png",
  гп: "/squad-role-icons/grenadier.png",
  гранатомет: "/squad-role-icons/grenadier.png",
  гранатомёт: "/squad-role-icons/grenadier.png",
  стрелок: "/squad-role-icons/rifleman.png",
  rifleman: "/squad-role-icons/rifleman.png",
  lat: "/squad-role-icons/lat.png",
  лат: "/squad-role-icons/lat.png",
  тандем: "/squad-role-icons/hat.png",
  hat: "/squad-role-icons/hat.png",
  инженер: "/squad-role-icons/combat-engineer.png",
  сапер: "/squad-role-icons/sapper.png",
  сапёр: "/squad-role-icons/sapper.png",
  крюмен: "/squad-role-icons/crewman.png",
  пилот: "/squad-role-icons/pilot.png",
}

const ROLE_LABELS: Record<string, string> = {
  sl: "Сквадной",
  squadleader: "Сквадной",
  сквадной: "Сквадной",
  медик: "Медик",
  medic: "Медик",
  гп: "ГП",
  гранатомет: "ГП",
  гранатомёт: "ГП",
  стрелок: "Стрелок",
  rifleman: "Стрелок",
  lat: "LAT",
  лат: "LAT",
  тандем: "HAT",
  hat: "HAT",
  инженер: "Инженер",
  сапер: "Сапер",
  сапёр: "Сапер",
  крюмен: "Крюмен",
  пилот: "Пилот",
}

function resolveSide(value: string | null | undefined): LineupSide {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two", "side-2", "side2"].includes(normalized) ? "2" : "1"
}

function getSideKey(side: LineupSide): LineupSideKey {
  return side === "2" ? "siteTwo" : "siteOne"
}

function isMeaningful(value: unknown) {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  return text.length > 0 && text.toLowerCase() !== "cellimage"
}

function normalizeKey(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^(\d+)\s*[.)-]?\s*/, "")
    .replace(/[^a-z0-9а-я]+/gi, "")
}

function hasRowContent(player: LineupPlayer) {
  return [player.nickname, player.tag, player.role, player.specialist, player.vehicle].some(isMeaningful)
}

function isHeaderRow(player: LineupPlayer) {
  return ["n", "№", "role", "роль", "игрок", "тэг", "отряд"].some((value) =>
    [player.number, player.role, player.nickname, player.tag, player.vehicle_color].some((field) => String(field ?? "").trim().toLowerCase() === value),
  )
}

function isServiceRow(player: LineupPlayer) {
  const number = Number(player.number)
  return Number.isFinite(number) && number < 1
}

function isSquadMarkerRow(player: LineupPlayer) {
  const vehicle = String(player.vehicle ?? "").trim().toUpperCase()
  const vehicleIcon = String(player.vehicle_icon ?? "").trim().toUpperCase()
  const marker = SQUAD_ORDER.includes(vehicle as SquadName) || SQUAD_ORDER.includes(vehicleIcon as SquadName)
  return marker && !isMeaningful(player.role) && !isMeaningful(player.specialist) && !isMeaningful(player.tag) && !isMeaningful(player.nickname)
}

function normalizeRows(rows: LineupPlayer[] | undefined) {
  return (rows ?? [])
    .filter((row) => !isHeaderRow(row) && !isServiceRow(row) && !isSquadMarkerRow(row))
    .slice(0, 9)
    .map((row, index) => ({ ...row, number: index + 1 }))
}

function hasSquadContent(rows: LineupPlayer[] | undefined) {
  return normalizeRows(rows).some(hasRowContent)
}

function parseMatchTitle(name: string | null | undefined, side: LineupSide) {
  const source = String(name ?? "").trim()
  if (!source) return side === "1" ? "Сторона 1" : "Сторона 2"

  const parts = source.split("|").map((part) => part.trim()).filter(Boolean)
  const matchup = parts.at(-1)
  if (!matchup || !/\s+vs\s+/i.test(matchup)) return source

  const [left, right] = matchup.split(/\s+vs\s+/i).map((part) => part.trim())
  if (!left || !right || side === "1") return source

  return [...parts.slice(0, -1), `${right} vs ${left}`].join(" | ")
}

function splitMatchTitle(title: string) {
  return title.split("|").map((part) => part.trim()).filter(Boolean)
}

function getSideFaction(name: string | null | undefined, side: LineupSide) {
  const title = parseMatchTitle(name, side)
  const matchup = splitMatchTitle(title).at(-1) ?? ""
  const faction = matchup.split(/\s+vs\s+/i).map((part) => part.trim()).filter(Boolean)[0] ?? ""
  return faction.toUpperCase().replace(/[^A-Z0-9]+/g, "")
}

function roleIconPath(role: string | null | undefined) {
  return ROLE_ICON_PATHS[normalizeKey(role)] ?? null
}

function roleLabel(role: string | null | undefined) {
  const source = String(role ?? "").trim()
  return ROLE_LABELS[normalizeKey(source)] ?? source
}

function vehicleColor(value: string | null | undefined) {
  return VEHICLE_COLORS[String(value ?? "").trim().toUpperCase()] ?? "#52525b"
}

function specializationIcon(value: string | null | undefined) {
  const source = String(value ?? "").trim()
  if (!source || source.toLowerCase() === "cellimage") return ""
  return source
}

function absoluteAsset(request: Request, path: string | null | undefined) {
  if (!path) return ""
  return new URL(path, request.url).toString()
}

function LineupTakumiImage({ lineup, request, side }: { lineup: LineupPayload; request: Request; side: LineupSide }) {
  const sideKey = getSideKey(side)
  const sideData = lineup[sideKey] ?? {}
  const titleParts = splitMatchTitle(parseMatchTitle(lineup.name, side))
  const headerText = titleParts.join(" | ")
  const faction = getSideFaction(lineup.name, side)
  const factionIcon = absoluteAsset(request, FACTION_ICON_BY_KEY[faction] ? `/faction-icons/${FACTION_ICON_BY_KEY[faction]}` : null)
  const visibleSquads = SQUAD_ORDER.filter((squad) => hasSquadContent(sideData[squad]))

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "12px",
        background: "#05070d",
        color: "#f8fafc",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: 18,
          background: "rgba(10, 14, 24, 0.88)",
          padding: "0 22px",
        }}
      >
        {factionIcon ? <img src={factionIcon} width={42} height={26} style={{ objectFit: "cover", borderRadius: 3 }} /> : null}
        <div style={{ fontSize: 22, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headerText}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {visibleSquads.map((squad) => (
          <SquadCard key={squad} request={request} name={squad} rows={normalizeRows(sideData[squad])} />
        ))}
      </div>
    </div>
  )
}

function SquadCard({ request, name, rows }: { request: Request; name: SquadName; rows: LineupPlayer[] }) {
  const colors = SQUAD_COLORS[name]
  const displayRows = rows.filter(hasRowContent)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        background: "rgba(8, 12, 21, 0.72)",
      }}
    >
      <div style={{ height: 54, display: "flex", alignItems: "center", padding: "0 18px", background: colors.panel, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ color: colors.text, fontSize: 24, fontWeight: 900, letterSpacing: "0.24em" }}>{name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
        {displayRows.map((player, index) => {
          const iconPath = absoluteAsset(request, roleIconPath(player.role))
          const specialist = specializationIcon(player.specialist)
          const tag = String(player.tag ?? "").trim()
          const nickname = String(player.nickname ?? "").trim()
          const nameLine = [tag, nickname || "-"].filter(Boolean).join(" ")
          const metaLine = [roleLabel(player.role), String(player.specialist ?? "").trim()].filter(Boolean).join("  ·  ")

          return (
            <div
              key={`${name}-${index}-${nameLine}-${metaLine}`}
              style={{
                height: 52,
                display: "grid",
                gridTemplateColumns: "30px 30px 30px 30px minmax(0, 1fr)",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${colors.row}`,
                borderRadius: 12,
                background: "rgba(0, 0, 0, 0.22)",
                padding: "0 12px",
              }}
            >
              <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: colors.accent, color: "#020617", fontSize: 16, fontWeight: 900 }}>
                {Number(player.number) || index + 1}
              </div>
              <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, background: vehicleColor(player.vehicle_color), border: "1px solid rgba(255,255,255,0.18)", color: "#f8fafc", fontSize: 17, fontWeight: 900 }}>
                ▣
              </div>
              <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, background: "#facc15" }}>
                {iconPath ? <img src={iconPath} width={24} height={24} style={{ objectFit: "contain" }} /> : <span style={{ color: "#020617", fontSize: 17, fontWeight: 900 }}>?</span>}
              </div>
              <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, lineHeight: 1 }}>
                {specialist}
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameLine}</div>
                <div style={{ color: "rgba(203, 213, 225, 0.72)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{metaLine}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const side = resolveSide(url.searchParams.get("side"))
  const response = await fetch(EXTERNAL_LINEUP_API_URL, { cache: "no-store" })

  if (!response.ok) {
    return new Response(`Lineup API ${response.status}`, { status: 502 })
  }

  const lineup = (await response.json()) as LineupPayload

  return new ImageResponse(<LineupTakumiImage lineup={lineup} request={request} side={side} />, {
    width: WIDTH,
    height: HEIGHT,
    lang: "ru",
    emoji: "twemoji",
    fonts: googleFonts([{ name: "Inter", weight: "400..900" }]),
    images: {
      fetch,
      fetchCache: takumiImageFetchCache,
    },
  })
}

export const HEAD = GET
