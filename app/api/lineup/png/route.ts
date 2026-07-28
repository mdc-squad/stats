import React from "react"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

const LINEUP_API_BASE = (process.env.NEXT_PUBLIC_MDC_API_BASE ?? "https://api.hungryfishteam.org/gas/mdc").replace(/\/$/, "")
const LINEUP_API_URL = `${LINEUP_API_BASE}/lineup?publish=true`
const SQUAD_ORDER = ["GREEN", "RED", "YELLOW", "BLUE", "PURPLE", "ORANGE", "BROWN", "BLACK", "PINK", "WHITE"] as const

type SquadName = (typeof SQUAD_ORDER)[number]
type LineupSideKey = "siteOne" | "siteTwo"

type LineupPlayer = {
  vehicle?: string | number | null
  role?: string | null
  specialist?: string | null
  number?: string | number | null
  vehicle_color?: string | null
  tag?: string | null
  nickname?: string | null
}

type LineupPayload = {
  name?: string | null
  siteOne?: Partial<Record<SquadName, LineupPlayer[]>>
  siteTwo?: Partial<Record<SquadName, LineupPlayer[]>>
}

const SQUAD_COLORS: Record<SquadName, string> = {
  GREEN: "#10b981",
  RED: "#ef4444",
  YELLOW: "#eab308",
  BLUE: "#06b6d4",
  PURPLE: "#8b5cf6",
  ORANGE: "#f97316",
  BROWN: "#92400e",
  BLACK: "#a3a3a3",
  PINK: "#ec4899",
  WHITE: "#f8fafc",
}

const VEHICLE_ICON_BY_LABEL: Record<string, string> = {
  "соплай груз": "10.png",
  "пехотка груз": "8.png",
  "пехотка с пул": "9.png",
  "соплай джип": "5.png",
  "мрап": "1.png",
  "мрап рвс": "6.png",
  "пехотка джип": "2.png",
  "вертолет тр": "12.png",
  "пво груз": "11.png",
  "арт джип": "3.png",
  "пвт джип": "4.png",
  "мотоцикл": "7.png",
  "пехотка гус": "19.png",
  "соплайка гус": "18.png",
  "пехотка гус с пул": "20.png",
  "msv гус": "17.png",
  "арт гус": "21.png",
  "мр гус": "22.png",
  "пво гус": "27.png",
  "бтр гус": "23.png",
  "бмп гус": "24.png",
  "сау гус": "25.png",
  "танк": "26.png",
  "бтр кол отк": "16.png",
  "мр кол": "15.png",
  "бтр кол": "14.png",
  "бмп кол": "13.png",
  "соплайка лодка": "30.png",
  "пехотка лодка": "28.png",
  "лодка с пул": "29.png",
}

const ROLE_ICON_PATHS: Record<string, string> = {
  "squad-leader": "squad-leader.png",
  medic: "medic.png",
  grenadier: "grenadier.png",
  rifleman: "rifleman.png",
  lat: "lat.png",
  hat: "hat.png",
  "automatic-rifleman": "automatic-rifleman.png",
  "machine-gunner": "machine-gunner.png",
  marksman: "marksman.png",
  sniper: "sniper.png",
  scout: "scout.png",
  raider: "raider.png",
  "combat-engineer": "combat-engineer.png",
  sapper: "sapper.png",
  "lead-crewman": "lead-crewman.png",
  crewman: "crewman.png",
  "lead-pilot": "lead-pilot.png",
  pilot: "pilot.png",
  unarmed: "unarmed.png",
}

const ROLE_ALIASES: Record<string, string> = {
  sl: "squad-leader",
  "сл": "squad-leader",
  squadleader: "squad-leader",
  medic: "medic",
  med: "medic",
  "медик": "medic",
  gp: "grenadier",
  gl: "grenadier",
  "гп": "grenadier",
  "гранатомет": "grenadier",
  rifleman: "rifleman",
  rif: "rifleman",
  "стрелок": "rifleman",
  lat: "lat",
  "лат": "lat",
  hat: "hat",
  "хат": "hat",
  "тандем": "hat",
  ar: "automatic-rifleman",
  lmg: "automatic-rifleman",
  mg: "machine-gunner",
  hmg: "machine-gunner",
  marksman: "marksman",
  "марксмен": "marksman",
  sniper: "sniper",
  "снайпер": "sniper",
  scout: "scout",
  "разведчик": "scout",
  raider: "raider",
  "рейдер": "raider",
  engineer: "combat-engineer",
  eng: "combat-engineer",
  "инженер": "combat-engineer",
  sapper: "sapper",
  "сапер": "sapper",
  slcrewman: "lead-crewman",
  "слкрюмен": "lead-crewman",
  crewman: "crewman",
  "крюмен": "crewman",
  slpilot: "lead-pilot",
  "слпилот": "lead-pilot",
  pilot: "pilot",
  "пилот": "pilot",
}

const ROLE_LABELS: Record<string, string> = {
  "squad-leader": "Сквадной",
  medic: "Медик",
  grenadier: "ГП",
  rifleman: "Стрелок",
  lat: "LAT",
  hat: "HAT",
  "automatic-rifleman": "Л. пулемет",
  "machine-gunner": "Т. пулемет",
  marksman: "Марксмен",
  sniper: "Снайпер",
  scout: "Разведчик",
  raider: "Рейдер",
  "combat-engineer": "Инженер",
  sapper: "Сапер",
  "lead-crewman": "SL Крюмен",
  crewman: "Крюмен",
  "lead-pilot": "SL Пилот",
  pilot: "Пилот",
  unarmed: "Без кита",
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

function h(type: React.ElementType, props: Record<string, unknown> | null, ...children: React.ReactNode[]) {
  return React.createElement(type, props, ...children)
}

function assetUrl(request: NextRequest, path: string) {
  return new URL(path, request.nextUrl.origin).toString()
}

function normalizeLookupText(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^(\d+)\s*[.)-]?\s*/, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
}

function normalizeIconKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/gi, "")
}

function getVehicleIconPath(vehicle: string | number | null | undefined) {
  const fileName = VEHICLE_ICON_BY_LABEL[normalizeLookupText(vehicle)]
  return fileName ? `/lineup-vehicle-icons/${fileName}` : null
}

function getVehicleColor(value: string | null | undefined) {
  const colors: Record<string, string> = {
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
  return colors[String(value ?? "").trim().toUpperCase()] ?? "#52525b"
}

function getRoleKey(role: string | null | undefined) {
  return ROLE_ALIASES[normalizeIconKey(role)] ?? null
}

function getRoleLabel(role: string | null | undefined) {
  const key = getRoleKey(role)
  return key ? ROLE_LABELS[key] ?? String(role ?? "") : String(role ?? "").trim()
}

function getRoleIconPath(role: string | null | undefined) {
  const key = getRoleKey(role)
  const fileName = key ? ROLE_ICON_PATHS[key] : null
  return fileName ? `/squad-role-icons/${fileName}` : null
}

function getSpecialistIcon(player: LineupPlayer) {
  const direct = String(player.specialist_icon ?? "").trim()
  if (direct && direct.toLowerCase() !== "cellimage") return direct
  const normalized = normalizeIconKey(player.specialist)
  if (normalized === "pusher" || normalized === "пушер") return "🗡️"
  if (normalized === "anchor" || normalized === "якорь") return "🛡️"
  if (normalized === "drg" || normalized === "дрг") return "💥"
  if (normalized === "mortar" || normalized === "миномет") return "💣"
  if (normalized === "tech" || normalized === "тех") return "🚙"
  return ""
}

function getFactionKey(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "")
  if (normalized === "MEA") return "MEI"
  return normalized
}

function getFactionIconPath(value: string | null | undefined) {
  const fileName = FACTION_ICON_BY_KEY[getFactionKey(value)]
  return fileName ? `/faction-icons/${fileName}` : null
}

function renderFactionMatchup(request: NextRequest, value: string) {
  const parts = value.split(/\s+vs\s+/i).map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return value

  return h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 8 } },
    ...parts.flatMap((part, index) => {
      const iconPath = getFactionIconPath(part)
      const item = h(
        "div",
        { key: `${part}-${index}`, style: { display: "flex", alignItems: "center", gap: 6 } },
        iconPath
          ? h("img", {
              src: assetUrl(request, iconPath),
              width: 36,
              height: 22,
              style: { objectFit: "cover", borderRadius: 3, border: "1px solid rgba(255,255,255,0.2)" },
            })
          : null,
        h("span", null, getFactionKey(part)),
      )

      return index > 0
        ? [h("span", { key: `vs-${index}`, style: { color: "#94a3b8" } }, "vs"), item]
        : [item]
    }),
  )
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

function isSquadMarkerRow(player: LineupPlayer) {
  const vehicle = String(player.vehicle ?? "").trim().toUpperCase()
  const tag = String(player.tag ?? "").trim()
  const nickname = String(player.nickname ?? "").trim()
  const role = String(player.role ?? "").trim()
  const specialist = String(player.specialist ?? "").trim()
  return SQUAD_ORDER.includes(vehicle as SquadName) && !tag && !nickname && !role && !specialist
}

function normalizeRows(rows: LineupPlayer[] | undefined) {
  return (rows ?? [])
    .filter((row) => !isHeaderRow(row) && !isServiceRow(row) && !isSquadMarkerRow(row))
    .filter((row) => [row.nickname, row.tag, row.role, row.specialist, row.vehicle].some(isMeaningful))
    .slice(0, 9)
    .map((row, index) => ({ ...row, number: index + 1 }))
}

function parseMatchTitle(name: string | null | undefined, side: LineupSideKey) {
  const source = String(name ?? "").trim()
  if (!source) return side === "siteOne" ? "Side 1" : "Side 2"

  const parts = source.split("|").map((part) => part.trim()).filter(Boolean)
  const matchup = parts.at(-1)
  if (!matchup?.includes(" vs ")) return source

  const [left, right] = matchup.split(/\s+vs\s+/i).map((part) => part.trim())
  if (!left || !right || side === "siteOne") return source

  return [...parts.slice(0, -1), `${right} vs ${left}`].join(" | ")
}

function splitMatchTitle(title: string) {
  const parts = title.split("|").map((part) => part.trim()).filter(Boolean)
  return {
    lead: parts[0] ?? title,
    details: parts.slice(1),
  }
}

function resolveSide(value: string | null): LineupSideKey {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two"].includes(normalized) ? "siteTwo" : "siteOne"
}

function renderImageBadge(request: NextRequest, src: string | null, background: string, size = 32) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 5,
        background,
        border: "1px solid rgba(255,255,255,0.18)",
      },
    },
    src
      ? h("img", {
          src: assetUrl(request, src),
          width: size - 8,
          height: size - 8,
          style: { objectFit: "contain" },
        })
      : null,
  )
}

function renderSquad(request: NextRequest, name: SquadName, rows: LineupPlayer[]) {
  const color = SQUAD_COLORS[name]

  return h(
    "div",
    {
      key: name,
      style: {
        display: "flex",
        flexDirection: "column",
        width: 292,
        border: `2px solid ${color}66`,
        borderRadius: 18,
        background: "#0b0f1a",
        overflow: "hidden",
        color: "#f8fafc",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          height: 54,
          padding: "0 18px",
          background: `${color}22`,
          borderBottom: `1px solid ${color}44`,
        },
      },
      h("div", { style: { fontSize: 24, fontWeight: 900, letterSpacing: 3, color } }, name),
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8, padding: 12 } },
      rows.length > 0
        ? rows.map((player, index) =>
            h(
              "div",
              {
                key: `${name}-${index}`,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minHeight: 42,
                  padding: "7px 9px",
                  borderRadius: 12,
                  background: "#05070dcc",
                  border: `1px solid ${color}44`,
                },
              },
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: color,
                    color: "#020617",
                    fontSize: 16,
                    fontWeight: 900,
                    flexShrink: 0,
                  },
                },
                String(player.number ?? index + 1),
              ),
              renderImageBadge(request, getVehicleIconPath(player.vehicle), getVehicleColor(player.vehicle_color), 32),
              renderImageBadge(request, getRoleIconPath(player.role), "#facc15", 32),
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 32,
                    fontSize: 23,
                    lineHeight: 1,
                    flexShrink: 0,
                  },
                },
                getSpecialistIcon(player),
              ),
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", minWidth: 0 } },
                h(
                  "div",
                  { style: { fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 } },
                  `${isMeaningful(player.tag) ? `${player.tag} ` : ""}${isMeaningful(player.nickname) ? player.nickname : ""}`.trim() || getRoleLabel(player.role) || "-",
                ),
                h(
                  "div",
                  { style: { marginTop: 2, fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 165 } },
                  [getRoleLabel(player.role), player.specialist].filter(isMeaningful).join(" / "),
                ),
              ),
            ),
          )
        : h("div", { style: { padding: 18, color: "#94a3b8", fontSize: 14, textAlign: "center" } }, "Squad is empty"),
    ),
  )
}

export async function GET(request: NextRequest) {
  const side = resolveSide(request.nextUrl.searchParams.get("side"))
  const response = await fetch(LINEUP_API_URL, { cache: "no-store" })

  if (!response.ok) {
    return new Response(`Lineup API ${response.status}`, { status: 502 })
  }

  const lineup = (await response.json()) as LineupPayload
  const title = splitMatchTitle(parseMatchTitle(lineup.name, side))
  const sideData = lineup[side] ?? {}
  const squads = SQUAD_ORDER.map((squadName) => ({ name: squadName, rows: normalizeRows(sideData[squadName] ?? []) })).filter((squad) => squad.rows.length > 0)

  const image = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 30,
        background: "#05070d",
        color: "#f8fafc",
        fontFamily: "Arial",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 132,
          border: "2px solid #d8a92d55",
          borderRadius: 20,
          background: "#0b0f1acc",
          marginBottom: 20,
        },
      },
      h("div", { style: { fontSize: 36, fontWeight: 900, maxWidth: 1420, textAlign: "center" } }, title.lead),
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 12 } },
        ...title.details.map((detail) =>
          h("div", { key: detail, style: { padding: "7px 13px", borderRadius: 999, border: "1px solid #d8a92d55", color: "#cbd5e1", fontSize: 18, fontWeight: 700 } }, renderFactionMatchup(request, detail)),
        ),
        h("div", { style: { padding: "7px 13px", borderRadius: 999, border: "1px solid #d8a92d55", color: "#d8a92d", fontSize: 18, fontWeight: 800 } }, side === "siteOne" ? "Side 1" : "Side 2"),
      ),
    ),
    squads.length > 0
      ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 14 } }, ...squads.map((squad) => renderSquad(request, squad.name, squad.rows)))
      : h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#94a3b8", fontSize: 30 } }, "Lineup is empty"),
  )

  return new ImageResponse(image, {
    width: 1600,
    height: 1200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="lineup-${side === "siteOne" ? "side-1" : "side-2"}.png"`,
    },
  })
}
