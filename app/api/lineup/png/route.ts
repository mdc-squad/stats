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

function h(type: React.ElementType, props: Record<string, unknown> | null, ...children: React.ReactNode[]) {
  return React.createElement(type, props, ...children)
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

function renderSquad(name: SquadName, rows: LineupPlayer[]) {
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
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: color,
                    color: "#020617",
                    fontSize: 14,
                    fontWeight: 900,
                  },
                },
                String(player.number ?? index + 1),
              ),
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", minWidth: 0 } },
                h(
                  "div",
                  { style: { fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 } },
                  `${isMeaningful(player.tag) ? `${player.tag} ` : ""}${isMeaningful(player.nickname) ? player.nickname : ""}`.trim() || "-",
                ),
                h(
                  "div",
                  { style: { marginTop: 2, fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 } },
                  [player.vehicle, player.role, player.specialist].filter(isMeaningful).join(" / "),
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
          h("div", { key: detail, style: { padding: "7px 13px", borderRadius: 999, border: "1px solid #d8a92d55", color: "#cbd5e1", fontSize: 18, fontWeight: 700 } }, detail),
        ),
        h("div", { style: { padding: "7px 13px", borderRadius: 999, border: "1px solid #d8a92d55", color: "#d8a92d", fontSize: 18, fontWeight: 800 } }, side === "siteOne" ? "Side 1" : "Side 2"),
      ),
    ),
    squads.length > 0
      ? h("div", { style: { display: "flex", flexWrap: "wrap", gap: 14 } }, ...squads.map((squad) => renderSquad(squad.name, squad.rows)))
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
