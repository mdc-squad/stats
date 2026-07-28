import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Resvg } from "@resvg/resvg-js"

export const SQUAD_ORDER = ["GREEN", "RED", "YELLOW", "BLUE", "PURPLE", "ORANGE", "BROWN", "BLACK", "PINK", "WHITE"] as const

export type SquadName = (typeof SQUAD_ORDER)[number]
export type LineupSideKey = "siteOne" | "siteTwo"
export type LineupPlayer = {
  vehicle?: string | number | null
  role?: string | null
  specialist?: string | null
  number?: string | number | null
  vehicle_color?: string | null
  tag?: string | null
  nickname?: string | null
}
export type LineupPayload = {
  name?: string | null
  siteOne?: Partial<Record<SquadName, LineupPlayer[]>>
  siteTwo?: Partial<Record<SquadName, LineupPlayer[]>>
}

const WIDTH = 1440
const PADDING = 26
const GAP = 14
const CARD_WIDTH = Math.floor((WIDTH - PADDING * 2 - GAP * 3) / 4)
const HEADER_HEIGHT = 120
const SQUAD_HEADER_HEIGHT = 54
const ROW_HEIGHT = 54
const ROW_GAP = 9
const SQUAD_PADDING = 14

const SQUAD_COLORS: Record<SquadName, { main: string; panel: string; text: string }> = {
  GREEN: { main: "#10b981", panel: "#052f2a", text: "#a7f3d0" },
  RED: { main: "#ff3b45", panel: "#321018", text: "#fecaca" },
  YELLOW: { main: "#facc15", panel: "#2d2a13", text: "#fef08a" },
  BLUE: { main: "#06b6d4", panel: "#082f3b", text: "#a5f3fc" },
  PURPLE: { main: "#8b5cf6", panel: "#21183f", text: "#ddd6fe" },
  ORANGE: { main: "#f97316", panel: "#35170e", text: "#fed7aa" },
  BROWN: { main: "#92400e", panel: "#2a170b", text: "#fde68a" },
  BLACK: { main: "#71717a", panel: "#18181b", text: "#f4f4f5" },
  PINK: { main: "#ec4899", panel: "#361325", text: "#fbcfe8" },
  WHITE: { main: "#e2e8f0", panel: "#2b303b", text: "#f8fafc" },
}

const VEHICLE_ICON_BY_LABEL: Record<string, string> = {
  "соплай груз": "10",
  "пехотка груз": "8",
  "пехотка с пул": "9",
  "соплай джип": "5",
  "мрап": "1",
  "мрап рвс": "6",
  "пехотка джип": "2",
  "вертолет тр": "12",
  "пво груз": "11",
  "арт джип": "3",
  "пвт джип": "4",
  "мотоцикл": "7",
  "пехотка гус": "19",
  "соплайка гус": "18",
  "пехотка гус с пул": "20",
  "msv гус": "17",
  "арт гус": "21",
  "мр гус": "22",
  "пво гус": "27",
  "бтр гус": "23",
  "бмп гус": "24",
  "сау гус": "25",
  "танк": "26",
  "бтр кол отк": "16",
  "мр кол": "15",
  "бтр кол": "14",
  "бмп кол": "13",
  "соплайка лодка": "30",
  "пехотка лодка": "28",
  "лодка с пул": "29",
}

const ROLE_ICON_BY_KEY: Record<string, string> = {
  sl: "squad-leader",
  squadleader: "squad-leader",
  "сквадной": "squad-leader",
  "медик": "medic",
  medic: "medic",
  "гп": "grenadier",
  grenadier: "grenadier",
  "стрелок": "rifleman",
  rifleman: "rifleman",
  lat: "lat",
  "лат": "lat",
  hat: "hat",
  "хат": "hat",
  "тандем": "hat",
  "инженер": "combat-engineer",
  engineer: "combat-engineer",
  "крюмен": "crewman",
  crewman: "crewman",
  "sl крюмен": "lead-crewman",
  "пилот": "pilot",
  pilot: "pilot",
  "sl пилот": "lead-pilot",
  "без кита": "unarmed",
}

const ROLE_LABELS: Record<string, string> = {
  "squad-leader": "Сквадной",
  medic: "Медик",
  grenadier: "ГП",
  rifleman: "Стрелок",
  lat: "LAT",
  hat: "HAT",
  "combat-engineer": "Инженер",
  crewman: "Крюмен",
  "lead-crewman": "SL Крюмен",
  pilot: "Пилот",
  "lead-pilot": "SL Пилот",
  unarmed: "Без кита",
}

const imageCache = new Map<string, string | null>()

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/^(\d+)\s*[.)-]?\s*/, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
}

function normalizeCompact(value: unknown) {
  return normalize(value).replace(/[^a-z0-9а-я]+/gi, "")
}

function assetDataUri(relativePath: string) {
  if (imageCache.has(relativePath)) return imageCache.get(relativePath)

  try {
    const path = join(process.cwd(), "public", relativePath)
    const body = readFileSync(path).toString("base64")
    const value = `data:image/png;base64,${body}`
    imageCache.set(relativePath, value)
    return value
  } catch {
    imageCache.set(relativePath, null)
    return null
  }
}

function isMeaningful(value: unknown) {
  const text = String(value ?? "").trim()
  return text.length > 0 && text.toLowerCase() !== "cellimage"
}

function hasLineupRowContent(player: LineupPlayer) {
  return [player.nickname, player.tag, player.role, player.specialist, player.vehicle].some(isMeaningful)
}

function normalizeRows(rows: LineupPlayer[] | undefined) {
  const cleanRows = (rows ?? []).filter((row) => hasLineupRowContent(row))
  return cleanRows.slice(0, 9).map((row, index) => ({ ...row, number: Number(row.number) || index + 1 }))
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

function splitMatchTitle(title: string) {
  const parts = title.split("|").map((part) => part.trim()).filter(Boolean)
  return {
    lead: parts[0] ?? title,
    details: parts.slice(1),
  }
}

function vehicleIcon(vehicle: unknown) {
  const key = VEHICLE_ICON_BY_LABEL[normalize(vehicle)]
  return key ? assetDataUri(`lineup-vehicle-icons/${key}.png`) : null
}

function roleIcon(role: unknown) {
  const key = ROLE_ICON_BY_KEY[normalizeCompact(role)] ?? ROLE_ICON_BY_KEY[normalize(role)]
  return key ? assetDataUri(`squad-role-icons/${key}.png`) : null
}

function roleLabel(role: unknown) {
  const key = ROLE_ICON_BY_KEY[normalizeCompact(role)] ?? ROLE_ICON_BY_KEY[normalize(role)]
  return key ? ROLE_LABELS[key] ?? String(role ?? "") : String(role ?? "")
}

function specialistIcon(specialist: unknown) {
  const key = normalize(specialist)
  if (key === "пушер" || key === "pusher") return "⚔"
  if (key === "якорь" || key === "anchor") return "◆"
  if (key === "дрг" || key === "drg") return "✹"
  if (key === "миномет" || key === "mortar") return "●"
  if (key === "тех" || key === "tech") return "▣"
  return isMeaningful(specialist) ? "•" : ""
}

function specialistLabel(specialist: unknown) {
  const key = normalize(specialist)
  if (key === "пушер" || key === "pusher") return "Пушер"
  if (key === "якорь" || key === "anchor") return "Якорь"
  if (key === "дрг" || key === "drg") return "ДРГ"
  if (key === "миномет" || key === "mortar") return "Миномёт"
  if (key === "тех" || key === "tech") return "Тех"
  return String(specialist ?? "")
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, Math.max(0, limit - 1))}…` : value
}

function renderText(text: string, x: number, y: number, size: number, color: string, weight = 600, extra = "") {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${esc(text)}</text>`
}

function renderImage(uri: string | null, x: number, y: number, size: number) {
  if (!uri) return ""
  return `<image href="${uri}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`
}

function renderSquad(name: SquadName, rows: LineupPlayer[], x: number, y: number) {
  const colors = SQUAD_COLORS[name]
  const height = SQUAD_HEADER_HEIGHT + SQUAD_PADDING * 2 + rows.length * ROW_HEIGHT + Math.max(0, rows.length - 1) * ROW_GAP
  const bodyY = y + SQUAD_HEADER_HEIGHT
  let svg = `
    <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${height}" rx="18" fill="#080d18" stroke="${colors.main}" stroke-opacity="0.65" stroke-width="1.4"/>
    <rect x="${x + 1}" y="${y + 1}" width="${CARD_WIDTH - 2}" height="${SQUAD_HEADER_HEIGHT}" rx="17" fill="${colors.panel}"/>
    <rect x="${x + 1}" y="${y + SQUAD_HEADER_HEIGHT - 1}" width="${CARD_WIDTH - 2}" height="1" fill="${colors.main}" opacity="0.35"/>
    ${renderText(name, x + 20, y + 34, 25, colors.text, 800, 'letter-spacing="8"')}
  `

  rows.forEach((player, index) => {
    const rowY = bodyY + SQUAD_PADDING + index * (ROW_HEIGHT + ROW_GAP)
    const number = String(player.number ?? index + 1)
    const vehicle = isMeaningful(player.vehicle) ? String(player.vehicle) : ""
    const role = isMeaningful(player.role) ? String(player.role) : ""
    const specialist = isMeaningful(player.specialist) ? String(player.specialist) : ""
    const tag = isMeaningful(player.tag) ? String(player.tag) : ""
    const nickname = isMeaningful(player.nickname) ? String(player.nickname) : ""
    const nameLine = [tag, nickname].filter(Boolean).join(" ") || "-"
    const meta = [vehicle, roleLabel(role), specialistLabel(specialist)].filter(Boolean).join(" / ")

    svg += `
      <rect x="${x + 14}" y="${rowY}" width="${CARD_WIDTH - 28}" height="${ROW_HEIGHT}" rx="10" fill="#060a12" stroke="${colors.main}" stroke-opacity="0.42"/>
      <circle cx="${x + 38}" cy="${rowY + 27}" r="14" fill="${colors.main}"/>
      ${renderText(number, x + 38, rowY + 33, 15, name === "WHITE" ? "#020617" : "#041018", 900, 'text-anchor="middle"')}
      <rect x="${x + 65}" y="${rowY + 14}" width="28" height="28" rx="4" fill="${colors.main}" opacity="0.76"/>
      ${renderImage(vehicleIcon(vehicle), x + 69, rowY + 18, 20)}
      <rect x="${x + 102}" y="${rowY + 14}" width="28" height="28" rx="4" fill="#facc15"/>
      ${renderImage(roleIcon(role), x + 105, rowY + 17, 22)}
      ${renderText(specialistIcon(specialist), x + 144, rowY + 36, 23, colors.text, 800, 'text-anchor="middle"')}
      ${renderText(truncate(nameLine, 25), x + 166, rowY + 25, 14, "#f8fafc", 700)}
      ${renderText(truncate(meta, 38), x + 166, rowY + 43, 11, "#9ca3af", 500)}
    `
  })

  return { svg, height }
}

export function renderLineupSvg(lineup: LineupPayload, side: LineupSideKey) {
  const title = splitMatchTitle(parseMatchTitle(lineup.name, side))
  const sideData = lineup[side] ?? {}
  const squads = SQUAD_ORDER
    .map((name) => ({ name, rows: normalizeRows(sideData[name]) }))
    .filter((squad) => squad.rows.length > 0)

  const heights = squads.map((squad) => SQUAD_HEADER_HEIGHT + SQUAD_PADDING * 2 + squad.rows.length * ROW_HEIGHT + Math.max(0, squad.rows.length - 1) * ROW_GAP)
  const rowHeights: number[] = []
  for (let i = 0; i < heights.length; i += 4) {
    rowHeights.push(Math.max(...heights.slice(i, i + 4)))
  }
  const contentHeight = rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowHeights.length - 1) * 18
  const height = Math.max(420, HEADER_HEIGHT + PADDING + contentHeight + PADDING)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
    <rect width="${WIDTH}" height="${height}" fill="#05070d"/>
    <rect x="${PADDING}" y="8" width="${WIDTH - PADDING * 2}" height="104" rx="18" fill="#080b14" stroke="#c5902d" stroke-opacity="0.35"/>
    ${renderText(title.lead, WIDTH / 2, 52, 36, "#f8fafc", 900, 'text-anchor="middle"')}
  `

  const pills = title.details.slice(0, 4)
  const pillWidths = pills.map((pill) => Math.max(120, Math.min(360, 28 + pill.length * 8)))
  const totalPillWidth = pillWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, pills.length - 1) * 10
  let pillX = (WIDTH - totalPillWidth) / 2
  pills.forEach((pill, index) => {
    const width = pillWidths[index]
    svg += `<rect x="${pillX}" y="72" width="${width}" height="32" rx="16" fill="#05070d" stroke="#c5902d" stroke-opacity="0.45"/>`
    svg += renderText(truncate(pill, 38), pillX + width / 2, 94, 15, "#d1d5db", 600, 'text-anchor="middle"')
    pillX += width + 10
  })

  let y = HEADER_HEIGHT + PADDING
  squads.forEach((squad, index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    if (col === 0 && row > 0) {
      y += rowHeights[row - 1] + 18
    }
    const x = PADDING + col * (CARD_WIDTH + GAP)
    svg += renderSquad(squad.name, squad.rows, x, y).svg
  })

  if (squads.length === 0) {
    svg += renderText("Lineup is empty", WIDTH / 2, 240, 20, "#9ca3af", 700, 'text-anchor="middle"')
  }

  return `${svg}</svg>`
}

export function renderLineupPng(lineup: LineupPayload, side: LineupSideKey) {
  const svg = renderLineupSvg(lineup, side)
  return new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH * 2 },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "Arial",
    },
  }).render().asPng()
}
