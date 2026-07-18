import { normalizeMDCData } from "./api"
import type { MDCData } from "./data-utils"
import type { LineupPayload, LineupPlayer, SquadName } from "@/components/lineup-board"

const PROXY_BASE = "/api/rest"
const EVENT_PAGE_SIZE = 200
const PLAYER_PAGE_SIZE = 200
const PLAYER_DETAIL_CONCURRENCY = 16

interface RestPagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

interface RestEventParticipant {
  playerId: number
  nickname: string
  tag: string | null
  steamId: string | null
  squad: string | null
  role: string | null
  specialization: string | null
  revives: number
  heals: number
  downs: number
  kills: number
  deaths: number
  vehicle: number
  kd: number | null
  kda: number | null
  elo: number | null
  eloShare: number
  rank: number
}

interface RestEventPlayerRef {
  playerId: number
  nickname: string
  tag: string | null
}

interface RestEventSummary {
  eventId: number
  legacyIdentifier: string
  startedAt: string
  eventType: string | null
  map: string | null
  mode: string | null
  faction1: string | null
  faction2: string | null
  opponent: string | null
  result: string | null
  isWin: boolean | null
  homeTickets: number | null
  opponentTickets: number | null
  ticketDiff: number | null
  teamSize: number | null
  enemySize: number | null
  castUrl: string | null
  tacticsUrl: string | null
  discordUrl: string | null
  rosterBreakdown: { mdc: number; grave: number; nklv: number; dcai: number; mercs: number }
  players: RestEventParticipant[]
  reservePlayers: RestEventPlayerRef[]
  absentPlayers: RestEventPlayerRef[]
}

interface RestPlayerListItem {
  playerId: number
  nickname: string
  tag: string | null
  steamId: string | null
  events: number
}

interface RestPlayerDetail {
  playerId: number
  nickname: string
  tag: string | null
  discord: string | null
  steamId: string | null
  notes: string | null
  joinedOn: string | null
  tenure: string | null
  totals: {
    events: number
    revives: number
    heals: number
    downs: number
    kills: number
    deaths: number
    vehicle: number
    kd: number | null
    kda: number | null
    wins: number
    losses: number
    winRate: number | null
    elo: number | null
    tbf: number | null
    rating: number | null
  }
  favorites: {
    role1: string | null
    role2: string | null
    specialization: string | null
    faction: string | null
    map: string | null
  }
  teams: string[]
  teamLeads: string[]
}

interface RestClan {
  clanId: number
  name: string | null
  tag: string | null
}

interface RestDictionaries {
  maps: string[]
  modes: string[]
  factions: string[]
  eventTypes: string[]
  tags: string[]
  roles: string[]
  specializations: string[]
  vehicles: string[]
  squads: string[]
}

interface RestLineupPlayerRef {
  playerId: number
  nickname: string
  tag: string | null
}

interface RestLineupSlot {
  slotNo: number
  vehicleSlotCode: string | null
  role: string | null
  specialization: string | null
  player: RestLineupPlayerRef | null
  substitute: RestLineupPlayerRef | null
}

interface RestLineupSquad {
  color: string
  slots: RestLineupSlot[]
}

interface RestLineupScenario {
  lineupScenarioId: number
  scenarioNo: number
  name: string
  eventId: number | null
  eventLegacyIdentifier: string | null
  faction: string | null
  squads: RestLineupSquad[]
}

async function fetchRestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${PROXY_BASE}${path}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`REST API ${path} responded with ${response.status}`)
  }
  return (await response.json()) as T
}

async function fetchAllRestEvents(): Promise<RestEventSummary[]> {
  const events: RestEventSummary[] = []
  let page = 1

  while (true) {
    const result = await fetchRestJson<RestPagedResult<RestEventSummary>>(
      `/events?page=${page}&pageSize=${EVENT_PAGE_SIZE}`,
    )
    events.push(...result.items)
    if (page >= result.totalPages || result.items.length === 0) {
      break
    }
    page += 1
  }

  return events
}

async function fetchAllRestPlayerIds(): Promise<number[]> {
  const ids: number[] = []
  let page = 1

  while (true) {
    const result = await fetchRestJson<RestPagedResult<RestPlayerListItem>>(
      `/players?page=${page}&pageSize=${PLAYER_PAGE_SIZE}`,
    )
    ids.push(...result.items.map((item) => item.playerId))
    if (page >= result.totalPages || result.items.length === 0) {
      break
    }
    page += 1
  }

  return ids
}

async function fetchRestPlayersWithLimitedConcurrency(ids: number[]): Promise<RestPlayerDetail[]> {
  const results: RestPlayerDetail[] = []
  let cursor = 0

  async function worker() {
    while (cursor < ids.length) {
      const index = cursor
      cursor += 1
      try {
        const detail = await fetchRestJson<RestPlayerDetail>(`/players/${ids[index]}`)
        results.push(detail)
      } catch {
        // Skip players that fail to load individually rather than failing the whole batch.
      }
    }
  }

  const workerCount = Math.min(PLAYER_DETAIL_CONCURRENCY, ids.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

function shimEvent(dto: RestEventSummary): Record<string, unknown> {
  return {
    event_id: String(dto.eventId),
    started_at: dto.startedAt,
    event_type: dto.eventType,
    map: dto.map,
    mode: dto.mode,
    faction_1: dto.faction1,
    faction_2: dto.faction2,
    team_size: dto.teamSize,
    enemy_size: dto.enemySize,
    tickets_1: dto.homeTickets,
    tickets_2: dto.opponentTickets,
    score: dto.ticketDiff,
    result: dto.result,
    is_win: dto.isWin,
    mdc_players: dto.rosterBreakdown?.mdc ?? 0,
    ally_players: (dto.rosterBreakdown?.grave ?? 0) + (dto.rosterBreakdown?.nklv ?? 0) + (dto.rosterBreakdown?.dcai ?? 0),
    opponent: dto.opponent,
    cast_url: dto.castUrl,
    tactics_url: dto.tacticsUrl,
    discord_url: dto.discordUrl,
  }
}

function shimParticipant(eventIdStr: string, participant: RestEventParticipant): Record<string, unknown> {
  return {
    event_id: eventIdStr,
    player_id: String(participant.playerId),
    nickname: participant.nickname,
    tag: participant.tag ?? "",
    enter: "",
    squad_no: participant.squad ?? "",
    role: participant.role ?? "",
    specialization: participant.specialization ?? "",
    revives: participant.revives,
    heals: participant.heals,
    downs: participant.downs,
    kills: participant.kills,
    deaths: participant.deaths,
    vehicle: participant.vehicle,
    kd: participant.kd ?? undefined,
    kda: participant.kda ?? undefined,
    elo: participant.elo ?? 0,
  }
}

function shimStaffAsStat(eventIdStr: string, staff: RestEventPlayerRef, enter: "резерв" | "нет"): Record<string, unknown> {
  return {
    event_id: eventIdStr,
    player_id: String(staff.playerId),
    nickname: staff.nickname,
    tag: staff.tag ?? "",
    enter,
    squad_no: "",
    role: "",
    specialization: "",
    revives: 0,
    heals: 0,
    downs: 0,
    kills: 0,
    deaths: 0,
    vehicle: 0,
    kd: 0,
    kda: 0,
    elo: 0,
  }
}

function shimPlayer(detail: RestPlayerDetail): Record<string, unknown> {
  return {
    player_id: String(detail.playerId),
    nickname: detail.nickname,
    tag: detail.tag ?? "",
    discord: detail.discord ?? "",
    steam_id: detail.steamId ?? "",
    note: detail.notes,
    joined_at: detail.joinedOn ?? "",
    last_active_at: "",
    tenure: detail.tenure ?? "",
    totals: {
      events: detail.totals.events,
      revives: detail.totals.revives,
      heals: detail.totals.heals,
      downs: detail.totals.downs,
      kills: detail.totals.kills,
      deaths: detail.totals.deaths,
      vehicle: detail.totals.vehicle,
      kd: detail.totals.kd ?? undefined,
      kda: detail.totals.kda ?? undefined,
      wins: detail.totals.wins,
      losses: detail.totals.losses,
      win_rate: detail.totals.winRate ?? undefined,
      elo: detail.totals.elo ?? undefined,
      tbf: detail.totals.tbf ?? undefined,
      rating: detail.totals.rating ?? undefined,
    },
    favorites: {
      role_1: detail.favorites.role1,
      role_2: detail.favorites.role2,
      specialization: detail.favorites.specialization ?? "",
      faction: detail.favorites.faction,
      map: detail.favorites.map ?? "Не указана",
    },
    teams: detail.teams,
    team_leads: detail.teamLeads,
  }
}

function shimClan(clan: RestClan): Record<string, unknown> {
  return {
    clan_id: String(clan.clanId),
    name: clan.name,
    short_name: clan.tag,
  }
}

/**
 * Fetches events/players/clans/dictionaries from the new .NET REST API (via the same-origin proxy)
 * and shims them into the loose raw shape lib/api.ts's normalizeMDCData() already understands, so
 * every existing MDCData consumer (getPastGames, filters, achievements, leaderboards, ...) keeps
 * working unchanged regardless of which backend produced the data.
 */
export async function fetchAllDataFromRestApi(): Promise<MDCData> {
  const [events, playerIds, clans, dictionaries] = await Promise.all([
    fetchAllRestEvents(),
    fetchAllRestPlayerIds(),
    fetchRestJson<RestClan[]>("/clans"),
    fetchRestJson<RestDictionaries>("/dictionaries"),
  ])

  const players = await fetchRestPlayersWithLimitedConcurrency(playerIds)

  const rawEvents: Record<string, unknown>[] = []
  const rawPlayerEventStats: Record<string, unknown>[] = []

  events.forEach((event) => {
    const eventIdStr = String(event.eventId)
    rawEvents.push(shimEvent(event))
    event.players.forEach((participant) => rawPlayerEventStats.push(shimParticipant(eventIdStr, participant)))
    event.reservePlayers.forEach((staff) => rawPlayerEventStats.push(shimStaffAsStat(eventIdStr, staff, "резерв")))
    event.absentPlayers.forEach((staff) => rawPlayerEventStats.push(shimStaffAsStat(eventIdStr, staff, "нет")))
  })

  return normalizeMDCData({
    events: rawEvents,
    players: players.map(shimPlayer),
    playersEvents: rawPlayerEventStats,
    clans: clans.map(shimClan),
    dictionaries,
  })
}

function toLineupPlayerRow(slot: RestLineupSlot): LineupPlayer {
  return {
    number: slot.slotNo,
    role: slot.role,
    specialist: slot.specialization,
    vehicle: slot.vehicleSlotCode,
    tag: slot.player?.tag ?? null,
    nickname: slot.player?.nickname ?? null,
  }
}

function toSquadRecord(scenario: RestLineupScenario | undefined): Partial<Record<SquadName, LineupPlayer[]>> {
  if (!scenario) {
    return {}
  }

  const record: Partial<Record<SquadName, LineupPlayer[]>> = {}
  scenario.squads.forEach((squad) => {
    record[squad.color as SquadName] = squad.slots
      .slice()
      .sort((left, right) => left.slotNo - right.slotNo)
      .map(toLineupPlayerRow)
  })
  return record
}

/**
 * Adapts /lineups/current's structured LineupScenarioDto[] into the legacy {name, siteOne, siteTwo}
 * shape components/lineup-board.tsx and components/games-calendar.tsx already parse, so those
 * components need no rendering changes. "siteOne"/"siteTwo" map to scenario 1 and 2 (a mirrored
 * home/away pair sharing one match date); `name` reuses the event's legacy identifier string, which
 * is already in the exact "TYPE | date time | map mode | factionA vs factionB" format the existing
 * date/map/faction parsing in those components expects.
 */
export async function fetchLineupFromRestApi(): Promise<LineupPayload> {
  const scenarios = await fetchRestJson<RestLineupScenario[]>("/lineups/current")
  const siteOneScenario = scenarios.find((scenario) => scenario.scenarioNo === 1) ?? scenarios[0]
  const siteTwoScenario = scenarios.find((scenario) => scenario.scenarioNo === 2) ?? scenarios[1]

  return {
    name: siteOneScenario?.eventLegacyIdentifier ?? siteOneScenario?.name ?? null,
    siteOne: toSquadRecord(siteOneScenario),
    siteTwo: toSquadRecord(siteTwoScenario),
  }
}
