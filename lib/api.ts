import { type MDCData, type GameEvent, type PlayerEventStat, type Player, type Clan, type MDCDictionaries } from "./data-utils"

const DEFAULT_API_BASE = "https://api.hungryfishteam.org/gas/mdc"
const API_BASE = (process.env.NEXT_PUBLIC_MDC_API_BASE ?? DEFAULT_API_BASE).replace(/\/$/, "")
const DEFAULT_API_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_MDC_API_TIMEOUT_MS ?? "30000")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000
})()
const DEFAULT_API_RETRY_ATTEMPTS = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_MDC_API_RETRY_ATTEMPTS ?? "2")
  if (!Number.isFinite(parsed) || parsed < 0) return 2
  return Math.min(6, Math.floor(parsed))
})()
const DEFAULT_API_BACKOFF_BASE_MS = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_MDC_API_BACKOFF_BASE_MS ?? "500")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500
})()
const DEFAULT_API_BACKOFF_MAX_MS = (() => {
  const parsed = Number(process.env.NEXT_PUBLIC_MDC_API_BACKOFF_MAX_MS ?? "5000")
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000
})()

type UnknownRecord = Record<string, unknown>

export interface FetchApiOptions {
  forceRefresh?: boolean
  publish?: boolean
  onProgress?: (progress: SyncProgressUpdate) => void
}

export interface SyncProgressUpdate {
  stage: "prepare" | "all" | "pages" | "merge" | "done" | "error"
  percent: number
  message: string
  pagesDone?: number
  pagesTotal?: number
}

const MONTHS: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
}

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as UnknownRecord
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value
  }
  if (value === null || value === undefined) {
    return fallback
  }
  return String(value)
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value, "").trim()
  return normalized.length > 0 ? normalized : null
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function withQueryParams(url: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value)
    }
  })

  const serialized = searchParams.toString()
  if (!serialized) {
    return url
  }

  return `${url}${url.includes("?") ? "&" : "?"}${serialized}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getBackoffDelayMs(attempt: number): number {
  const exponential = DEFAULT_API_BACKOFF_BASE_MS * 2 ** attempt
  const jitter = Math.floor(Math.random() * 250)
  return Math.min(DEFAULT_API_BACKOFF_MAX_MS, exponential + jitter)
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === "AbortError") {
    return true
  }

  const message = error.message.toLowerCase()
  return (
    error.name === "TypeError" ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  )
}

function reportSyncProgress(options: FetchApiOptions, update: SyncProgressUpdate): void {
  if (!options.onProgress) {
    return
  }

  try {
    options.onProgress({
      ...update,
      percent: Math.max(0, Math.min(100, update.percent)),
    })
  } catch {
    // Ignore callback errors from UI subscribers.
  }
}

function parsePagesCount(payload: unknown): number | null {
  const parsed = parseMaybeJson(payload)

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed)
  }

  if (typeof parsed === "string") {
    const numeric = Number(parsed)
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric)
    }
  }

  const record = toRecord(parsed)
  if (!record) {
    return null
  }

  const candidates = [
    record.pages,
    record.page_count,
    record.pageCount,
    record.total_pages,
    record.totalPages,
    record.count,
  ]

  for (const candidate of candidates) {
    const numeric = toNumber(candidate, 0)
    if (numeric > 0) {
      return Math.floor(numeric)
    }
  }

  return null
}

function hasEventId(value: unknown): boolean {
  const record = toRecord(value)
  if (!record) {
    return false
  }

  return Boolean(toNullableString(record.event_id ?? record.id))
}

function extractArray(value: unknown, aliases: string[]): unknown[] {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed
  }

  const record = toRecord(parsed)
  if (!record) {
    return []
  }

  for (const alias of aliases) {
    const nested = parseMaybeJson(record[alias])
    if (Array.isArray(nested)) {
      return nested
    }

    const nestedRecord = toRecord(nested)
    if (!nestedRecord) {
      continue
    }

    for (const nestedAlias of aliases) {
      const deepValue = parseMaybeJson(nestedRecord[nestedAlias])
      if (Array.isArray(deepValue)) {
        return deepValue
      }
    }
  }

  for (const nestedValue of Object.values(record)) {
    const parsedNested = parseMaybeJson(nestedValue)
    if (Array.isArray(parsedNested)) {
      return parsedNested
    }
  }

  return []
}

function extractObject(value: unknown, aliases: string[]): UnknownRecord | null {
  const parsed = parseMaybeJson(value)
  const record = toRecord(parsed)
  if (!record) {
    return null
  }

  for (const alias of aliases) {
    const nested = toRecord(parseMaybeJson(record[alias]))
    if (nested) {
      return nested
    }
  }

  return record
}

function normalizeNamedArray(value: unknown, keys: string[]): string[] {
  const items = extractArray(value, keys)
  return Array.from(
    new Set(
      items
        .map((item) => {
          if (typeof item === "string") {
            return item.trim()
          }

          const record = toRecord(item)
          if (!record) {
            return ""
          }

          for (const key of keys) {
            const rawValue = toString(record[key], "").trim()
            if (rawValue) {
              return rawValue
            }
          }

          return ""
        })
        .filter(Boolean),
    ),
  )
}

function normalizeDictionaries(value: unknown): MDCDictionaries {
  const dictionariesRecord = extractObject(value, ["dictionaries"]) ?? {}
  return {
    maps: normalizeNamedArray(dictionariesRecord.maps, ["map", "name"]),
    modes: normalizeNamedArray(dictionariesRecord.modes, ["mode", "name"]),
    factions: normalizeNamedArray(dictionariesRecord.factions, ["faction", "name"]),
    event_types: normalizeNamedArray(dictionariesRecord.event_types, ["name", "event_type", "type"]),
    tags: normalizeNamedArray(dictionariesRecord.tags, ["tag", "name"]),
    roles: normalizeNamedArray(dictionariesRecord.roles, ["role", "name"]),
    specializations: normalizeNamedArray(dictionariesRecord.specializations, ["specialization", "name"]),
    vehicles: normalizeNamedArray(dictionariesRecord.vehicles, ["vehicle", "name"]),
    squads: normalizeNamedArray(dictionariesRecord.squads, ["name", "squad"]),
  }
}

function extractDateFromEventId(eventId: string): string | null {
  const match = eventId.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!match) {
    return null
  }

  const [, dd, mm, yyyy, hh = "00", min = "00"] = match
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`
}

function extractEventIdPart(eventId: string, index: number): string | null {
  const parts = eventId
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
  return parts[index] ?? null
}

function getEventCoverageKey(eventId: string): string {
  const parts = eventId
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 4) {
    return normalizeKey(parts.slice(1, 4).join(" | "))
  }

  if (parts.length >= 3) {
    return normalizeKey(parts.slice(1, 3).join(" | "))
  }

  return normalizeKey(eventId)
}

function normalizeEventTypeFromEventId(eventId: string): string {
  const rawType = extractEventIdPart(eventId, 0)?.trim() ?? ""
  if (!rawType) {
    return "Неизвестно"
  }

  const normalized = normalizeKey(rawType)
  if (normalized.includes("skirmish")) return "⚔️ SKIRMISH"
  if (normalized.includes("турнир") || normalized.includes("tournament")) return "🏆 ТУРНИР"
  if (normalized.includes("clanmix")) return "🏹 CLANMIX"
  if (normalized.includes("трениров") || normalized.includes("training")) return "🎯 Тренировка"
  if (normalized.includes("ивент") || normalized.includes("event")) return "🎈 ИВЕНТ"
  if (normalized.includes("лекц") || normalized.includes("lecture")) return "📚 ЛЕКЦИЯ"

  return rawType
}

function deriveMapFromEventId(eventId: string): string | null {
  const source = extractEventIdPart(eventId, 2)
  if (!source) {
    return null
  }

  const withoutMode = source.replace(
    /\s+(?:AAS|RAAS|Invasion|Skirmish|Rivals|Destruction|TC|Insurgency|Seed)\b.*$/i,
    "",
  )

  const normalized = withoutMode.trim().replace(/\s{2,}/g, " ")
  return normalized || source.trim() || null
}

function parseFactionsFromEventId(eventId: string): { faction_1: string | null; faction_2: string | null; opponent: string | null } {
  const versus = extractEventIdPart(eventId, 3)?.trim()
  if (!versus) {
    return { faction_1: null, faction_2: null, opponent: null }
  }

  const parts = versus
    .split(/\s+vs\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2) {
    return {
      faction_1: parts[0] ?? null,
      faction_2: parts[1] ?? null,
      opponent: versus,
    }
  }

  return {
    faction_1: null,
    faction_2: null,
    opponent: versus,
  }
}

function buildFallbackEventsFromPlayerStats(playerStats: PlayerEventStat[]): GameEvent[] {
  const eventMap = new Map<string, { event: GameEvent; uniquePlayers: Set<string> }>()

  playerStats.forEach((stat) => {
    const eventId = toString(stat.event_id, "").trim()
    if (!eventId) {
      return
    }

    const eventKey = getEventCoverageKey(eventId)
    if (!eventKey) {
      return
    }

    const startedAt = extractDateFromEventId(eventId) ?? "1970-01-01T00:00:00"
    const eventType = normalizeEventTypeFromEventId(eventId)
    const map = deriveMapFromEventId(eventId)
    const factions = parseFactionsFromEventId(eventId)

    let entry = eventMap.get(eventKey)
    if (!entry) {
      entry = {
        event: {
          event_id: eventId,
          started_at: startedAt,
          event_type: eventType,
          map,
          mode: null,
          faction_1: factions.faction_1,
          faction_2: factions.faction_2,
          team_size: null,
          enemy_size: null,
          tickets_1: null,
          tickets_2: null,
          score: null,
          result: null,
          is_win: null,
          mdc_players: 0,
          ally_players: null,
          opponent: factions.opponent,
          cast_url: null,
          tactics_url: null,
        },
        uniquePlayers: new Set<string>(),
      }
      eventMap.set(eventKey, entry)
    } else {
      // Keep the richer source fields if they appear in subsequent rows.
      if (!entry.event.map && map) entry.event.map = map
      if (entry.event.event_type === "Неизвестно" && eventType) entry.event.event_type = eventType
      if (!entry.event.faction_1 && factions.faction_1) entry.event.faction_1 = factions.faction_1
      if (!entry.event.faction_2 && factions.faction_2) entry.event.faction_2 = factions.faction_2
      if (!entry.event.opponent && factions.opponent) entry.event.opponent = factions.opponent
      if (entry.event.started_at === "1970-01-01T00:00:00" && startedAt !== "1970-01-01T00:00:00") {
        entry.event.started_at = startedAt
      }
    }

    const playerId = toString(stat.player_id, "").trim()
    if (playerId) {
      entry.uniquePlayers.add(playerId)
      entry.event.mdc_players = entry.uniquePlayers.size
    }
  })

  return Array.from(eventMap.values())
    .map(({ event }) => event)
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
}

function extractDateFromVerboseString(dateString: string): string | null {
  const match = dateString.match(/^[A-Za-z]{3}\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/)
  if (!match) {
    return null
  }

  const [, monthRaw, dayRaw, year] = match
  const month = MONTHS[monthRaw]
  if (!month) {
    return null
  }

  const day = dayRaw.padStart(2, "0")
  return `${year}-${month}-${day}T00:00:00`
}

function extractLink(value: unknown): string | null {
  const record = toRecord(value)
  if (record) {
    return toNullableString(record.link ?? record.url ?? record.href)
  }

  return toNullableString(value)
}

function normalizeStartedAt(raw: UnknownRecord, eventId: string): string {
  const existing = toNullableString(raw.started_at ?? raw.startedAt)
  if (existing) {
    if (/^\d{4}-\d{2}-\d{2}/.test(existing)) {
      const normalized = existing.includes("T") ? existing : `${existing}T00:00:00`
      return extractDateFromEventId(eventId) ?? normalized
    }
    const fromVerbose = extractDateFromVerboseString(existing)
    if (fromVerbose) {
      return extractDateFromEventId(eventId) ?? fromVerbose
    }
    const fromEventId = extractDateFromEventId(eventId)
    if (fromEventId) {
      return fromEventId
    }
  }

  const dateField = toNullableString(raw.date)
  if (dateField) {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateField)) {
      const normalized = dateField.includes("T") ? dateField : `${dateField}T00:00:00`
      return extractDateFromEventId(eventId) ?? normalized
    }
    const fromVerbose = extractDateFromVerboseString(dateField)
    if (fromVerbose) {
      return extractDateFromEventId(eventId) ?? fromVerbose
    }
  }

  return extractDateFromEventId(eventId) ?? "1970-01-01T00:00:00"
}

function toIsWin(raw: UnknownRecord): boolean | null {
  if (typeof raw.is_win === "boolean") {
    return raw.is_win
  }

  const result = normalizeKey(toString(raw.result, ""))
  if (result.includes("побед")) {
    return true
  }
  if (result.includes("пораж") || result.includes("проиг")) {
    return false
  }

  return null
}

function normalizeEvent(raw: UnknownRecord): GameEvent {
  const eventId = toString(raw.event_id ?? raw.id, "")
  return {
    event_id: eventId,
    started_at: normalizeStartedAt(raw, eventId),
    event_type: toString(raw.event_type ?? raw.type, "Неизвестно"),
    map: toNullableString(raw.map),
    mode: toNullableString(raw.mode),
    faction_1: toNullableString(raw.faction_1),
    faction_2: toNullableString(raw.faction_2),
    team_size: toNumber(raw.team_size, 0) || null,
    enemy_size: toNumber(raw.enemy_size, 0) || null,
    tickets_1: toNumber(raw.tickets_1, 0) || null,
    tickets_2: toNumber(raw.tickets_2, 0) || null,
    score: toNumber(raw.score, 0) || null,
    result: toNullableString(raw.result),
    is_win: toIsWin(raw),
    mdc_players: toNumber(raw.mdc_players, 0),
    ally_players: toNumber(raw.ally_players, 0) || null,
    opponent: toNullableString(raw.opponent),
    cast_url: extractLink(raw.cast_url),
    tactics_url: extractLink(raw.tactics_url),
  }
}

function normalizePlayer(raw: UnknownRecord): Player {
  const totalsRecord = toRecord(raw.totals)
  const favoritesRecord = toRecord(raw.favorites)
  const countsByTypeRecord = toRecord(raw.raw_counts_by_type)

  const nickname = toString(raw.nickname ?? raw.name, "Unknown")
  const tag = toString(raw.tag, "")
  const steamId = toString(raw.steam_id ?? raw.steamId, "")
  const fallbackPlayerId = steamId || `${tag}|${nickname}`
  const playerId = toString(raw.player_id ?? raw.playerId, fallbackPlayerId)

  const kills = toNumber(totalsRecord?.kills ?? raw.kills, 0)
  const deaths = toNumber(totalsRecord?.deaths ?? raw.deaths, 0)
  const downs = toNumber(totalsRecord?.downs ?? raw.downs, 0)
  const revives = toNumber(totalsRecord?.revives ?? raw.revives, 0)
  const vehicle = toNumber(totalsRecord?.vehicle ?? raw.vehicle, 0)
  const events = toNumber(totalsRecord?.events ?? raw.events, 0)
  const wins = toNumber(totalsRecord?.wins ?? raw.wins, 0)
  const losses = toNumber(totalsRecord?.losses ?? totalsRecord?.loses ?? raw.losses ?? raw.loses, 0)
  const winRate = toNumber(totalsRecord?.win_rate ?? raw.win_rate, events > 0 ? wins / events : 0)
  const kd = toNumber(totalsRecord?.kd ?? raw.kd, deaths > 0 ? kills / deaths : kills)
  const kda = toNumber(totalsRecord?.kda ?? raw.kda, deaths > 0 ? downs / deaths : downs)
  const placementFields = [raw.ELOPlace, raw.TBFPlace, raw.OPPlace]
  const normalizedPlacements = placementFields.map((value) => toString(value, "").trim().toLowerCase())
  const isMdcMember = !normalizedPlacements.some((value) => value === "не mdc")

  return {
    player_id: playerId,
    nickname,
    tag,
    is_mdc_member: isMdcMember,
    discord: toString(raw.discord, ""),
    steam_id: steamId,
    note: toNullableString(raw.note),
    joined_at: toString(raw.joined_at, ""),
    last_active_at: toString(raw.last_active_at, ""),
    tenure: toString(raw.tenure, ""),
    totals: {
      revives,
      downs,
      kills,
      deaths,
      vehicle,
      events,
      wins,
      losses,
      win_rate: winRate,
      kd,
      kda,
    },
    favorites: {
      role_1: toNullableString(favoritesRecord?.role_1 ?? raw.MainRole),
      role_2: toNullableString(favoritesRecord?.role_2),
      specialization: toString(favoritesRecord?.specialization, ""),
      faction: toNullableString(favoritesRecord?.faction),
      map: toString(favoritesRecord?.map, "Не указана"),
    },
    valid_ratio: toNumber(raw.valid_ratio ?? raw.validate, 0),
    raw_counts_by_type: {
      "🏆ТУРНИР": toNumber(countsByTypeRecord?.["🏆ТУРНИР"] ?? countsByTypeRecord?.["🏆 ТУРНИР"], 0),
      "⚔️SKIRMISH": toNumber(countsByTypeRecord?.["⚔️SKIRMISH"] ?? countsByTypeRecord?.["⚔️ SKIRMISH"], 0),
      "🏹CLANMIX": toNumber(countsByTypeRecord?.["🏹CLANMIX"] ?? countsByTypeRecord?.["🏹 CLANMIX"], 0),
      "🎈ИВЕНТ": toNumber(countsByTypeRecord?.["🎈ИВЕНТ"] ?? countsByTypeRecord?.["🎈 Ивент"], 0),
      "🎯ТРЕНИРОВКА": toNumber(countsByTypeRecord?.["🎯ТРЕНИРОВКА"] ?? countsByTypeRecord?.["🎯 Тренировка"], 0),
      "📚ЛЕКЦИЯ": toNumber(countsByTypeRecord?.["📚ЛЕКЦИЯ"] ?? countsByTypeRecord?.["📚 Лекция"], 0),
    },
  }
}

function buildPlayerLookup(players: Player[]): Map<string, string> {
  const lookup = new Map<string, string>()
  players.forEach((player) => {
    lookup.set(`${normalizeKey(player.tag)}|${normalizeKey(player.nickname)}`, player.player_id)
    lookup.set(`|${normalizeKey(player.nickname)}`, player.player_id)
  })
  return lookup
}

function normalizePlayerEventStat(raw: UnknownRecord, playerLookup: Map<string, string>): PlayerEventStat {
  const nickname = toString(raw.nickname, "Unknown")
  const tag = toString(raw.tag, "")
  const fallbackPlayerId = toString(raw.steam_id ?? raw.steamId, "") || `${tag}|${nickname}`
  const resolvedPlayerId =
    toNullableString(raw.player_id ?? raw.playerId) ??
    playerLookup.get(`${normalizeKey(tag)}|${normalizeKey(nickname)}`) ??
    playerLookup.get(`|${normalizeKey(nickname)}`) ??
    fallbackPlayerId

  const kills = toNumber(raw.kills, 0)
  const downs = toNumber(raw.downs, 0)
  const deaths = toNumber(raw.deaths, 0)

  return {
    event_id: toString(raw.event_id, ""),
    player_id: resolvedPlayerId,
    nickname,
    tag,
    squad_no: toNumber(raw.squad_no, 0),
    role: toString(raw.role, ""),
    specialization: toString(raw.specialization, ""),
    revives: toNumber(raw.revives, 0),
    downs,
    kills,
    deaths,
    vehicle: toNumber(raw.vehicle, 0),
    kd: toNumber(raw.kd, deaths > 0 ? kills / deaths : kills),
    kda: toNumber(raw.kda, deaths > 0 ? downs / deaths : downs),
  }
}

function normalizeClan(raw: UnknownRecord): Clan {
  const shortName = toString(raw.short_name ?? raw.clan_tag ?? raw.tag, "")
  const name = toString(raw.name ?? raw.clan_name, shortName || "Unknown clan")
  const clanId = toString(raw.clan_id ?? raw.id, shortName || name)

  return {
    clan_id: clanId,
    name,
    short_name: shortName || name,
  }
}

async function fetchJsonWithOptions(url: string, options: FetchApiOptions = {}): Promise<unknown> {
  const publishValue =
    options.publish === undefined ? undefined : options.publish ? "true" : "false"
  const requestUrl = withQueryParams(url, {
    publish: publishValue,
  })

  for (let attempt = 0; attempt <= DEFAULT_API_RETRY_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(requestUrl, {
        ...(options.forceRefresh ? { cache: "no-store" } : {}),
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)

      const isTimeout = error instanceof Error && error.name === "AbortError"
      const shouldRetry = attempt < DEFAULT_API_RETRY_ATTEMPTS && isRetryableNetworkError(error)
      if (shouldRetry) {
        await delay(getBackoffDelayMs(attempt))
        continue
      }

      if (isTimeout) {
        throw new Error(`API timeout after ${DEFAULT_API_TIMEOUT_MS}ms (${requestUrl})`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const shouldRetry = attempt < DEFAULT_API_RETRY_ATTEMPTS && isRetryableStatus(response.status)
      if (shouldRetry) {
        await delay(getBackoffDelayMs(attempt))
        continue
      }

      throw new Error(`API error: ${response.status} (${requestUrl})`)
    }

    return response.json()
  }

  throw new Error(`API request failed after retries (${requestUrl})`)
}

async function fetchPagedPlayerEventStatsRaw(options: FetchApiOptions = {}): Promise<unknown[]> {
  const pagesPayload = await fetchJsonWithOptions(`${API_BASE}/pages`, options)
  const pagesCount = parsePagesCount(pagesPayload)

  if (!pagesCount || pagesCount <= 0) {
    reportSyncProgress(options, {
      stage: "pages",
      percent: 40,
      message: "Страницы протокола не обнаружены",
      pagesDone: 0,
      pagesTotal: 0,
    })
    return []
  }

  reportSyncProgress(options, {
    stage: "pages",
    percent: 25,
    message: `Получено ${pagesCount} стр. протокола`,
    pagesDone: 0,
    pagesTotal: pagesCount,
  })

  const pageIndexes = Array.from({ length: pagesCount }, (_, index) => index)
  const collectedRows: unknown[] = []
  const BATCH_SIZE = 4
  let completedPages = 0

  for (let start = 0; start < pageIndexes.length; start += BATCH_SIZE) {
    const batch = pageIndexes.slice(start, start + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map((page) => {
        const url = withQueryParams(`${API_BASE}/playersevents`, { page: String(page) })
        return fetchJsonWithOptions(url, options)
      }),
    )

    batchResults.forEach((result) => {
      if (result.status !== "fulfilled") {
        return
      }

      const rows = extractArray(result.value, ["playersEvents", "player_event_stats", "playersevents"]).filter(hasEventId)
      if (rows.length > 0) {
        collectedRows.push(...rows)
      }
    })

    completedPages = Math.min(pagesCount, completedPages + batch.length)
    reportSyncProgress(options, {
      stage: "pages",
      percent: 25 + (completedPages / pagesCount) * 65,
      message: "Синхронизация страниц протокола...",
      pagesDone: completedPages,
      pagesTotal: pagesCount,
    })
  }

  reportSyncProgress(options, {
    stage: "pages",
    percent: 90,
    message: `Протокол собран: ${collectedRows.length} записей`,
    pagesDone: pagesCount,
    pagesTotal: pagesCount,
  })

  return collectedRows
}

export function normalizeMDCData(payload: unknown): MDCData {
  const root = toRecord(parseMaybeJson(payload)) ?? {}
  const dictionaries = normalizeDictionaries(root.dictionaries ?? root)

  const rawPlayers = extractArray(root.players ?? root, ["players"])
  const rawEvents = extractArray(root.events ?? root, ["events"])
  const rawPlayerEventStats = extractArray(
    root.player_event_stats ?? root.playersEvents ?? root.playersevents ?? root,
    ["player_event_stats", "playersEvents", "playersevents"],
  )
  const rawClans = extractArray(root.clans ?? root, ["clans"])

  const players = Array.from(
    new Map(
      rawPlayers
        .map((value) => normalizePlayer(toRecord(value) ?? {}))
        .filter((player) => player.player_id)
        .map((player) => [player.player_id, player]),
    ).values(),
  )

  const playerLookup = buildPlayerLookup(players)

  let events = Array.from(
    new Map(
      rawEvents
        .map((value) => normalizeEvent(toRecord(value) ?? {}))
        .filter((event) => event.event_id)
        .map((event) => [event.event_id, event]),
    ).values(),
  )

  const playerEventStats = rawPlayerEventStats
    .map((value) => normalizePlayerEventStat(toRecord(value) ?? {}, playerLookup))
    .filter((stat) => stat.event_id && stat.player_id)

  if (events.length === 0 && playerEventStats.length > 0) {
    events = buildFallbackEventsFromPlayerStats(playerEventStats)
  }

  const clans = Array.from(
    new Map(
      rawClans
        .map((value) => normalizeClan(toRecord(value) ?? {}))
        .filter((clan) => clan.clan_id)
        .map((clan) => [clan.clan_id, clan]),
    ).values(),
  )

  const metaRecord = extractObject(root.meta, ["meta"])
  const countsRecord = extractObject(metaRecord?.counts, ["counts"])

  return {
    meta: {
      generated_at: toString(metaRecord?.generated_at ?? metaRecord?.generatedAt, new Date().toISOString()),
      counts: {
        events: toNumber(countsRecord?.events, events.length),
        player_event_stats: toNumber(
          countsRecord?.player_event_stats ?? countsRecord?.playersEvents,
          playerEventStats.length,
        ),
        players: toNumber(countsRecord?.players, players.length),
        clans: toNumber(countsRecord?.clans, clans.length),
      },
    },
    events,
    player_event_stats: playerEventStats,
    players,
    clans,
    dictionaries,
  }
}

function compareCompleteness(a: MDCData, b: MDCData): number {
  if (a.player_event_stats.length !== b.player_event_stats.length) {
    return b.player_event_stats.length - a.player_event_stats.length
  }
  if (a.events.length !== b.events.length) {
    return b.events.length - a.events.length
  }
  if (a.players.length !== b.players.length) {
    return b.players.length - a.players.length
  }
  return b.clans.length - a.clans.length
}

export async function fetchAllData(options: FetchApiOptions = {}): Promise<MDCData> {
  reportSyncProgress(options, {
    stage: "prepare",
    percent: 2,
    message: "Инициализация синхронизации...",
  })

  const pagedRawStatsPromise = fetchPagedPlayerEventStatsRaw(options).catch(() => [])
  let allError: unknown = null
  let normalizedFromAll: MDCData | null = null
  let rootFromAll: UnknownRecord | null = null

  try {
    reportSyncProgress(options, {
      stage: "all",
      percent: 12,
      message: "Загружаем базовый срез /all...",
    })
    const payload = await fetchJsonWithOptions(`${API_BASE}/all`, options)
    rootFromAll = toRecord(parseMaybeJson(payload))
    normalizedFromAll = normalizeMDCData(payload)
    reportSyncProgress(options, {
      stage: "all",
      percent: 22,
      message: "Базовый срез получен",
    })

    try {
      const pagedRawStats = await pagedRawStatsPromise
      if (pagedRawStats.length > 0) {
        reportSyncProgress(options, {
          stage: "merge",
          percent: 93,
          message: "Объединяем базовый срез и протокол страниц...",
        })
        const mergedWithPagedStats = normalizeMDCData({
          events: rootFromAll?.events ?? [],
          players: rootFromAll?.players ?? [],
          clans: rootFromAll?.clans ?? [],
          dictionaries: rootFromAll?.dictionaries ?? {},
          meta: rootFromAll?.meta ?? {},
          playersEvents: pagedRawStats,
        })

        if (compareCompleteness(normalizedFromAll, mergedWithPagedStats) > 0) {
          normalizedFromAll = mergedWithPagedStats
        }
      }
    } catch {
      // Keep /all result if paged protocol is unavailable.
    }

    if (
      normalizedFromAll.events.length > 0 ||
      normalizedFromAll.players.length > 0 ||
      normalizedFromAll.player_event_stats.length > 0 ||
      normalizedFromAll.clans.length > 0
    ) {
      reportSyncProgress(options, {
        stage: "done",
        percent: 100,
        message: "Синхронизация завершена",
      })
      return normalizedFromAll
    }
  } catch (error) {
    allError = error
  }

  const [eventsResult, playersResult, pagedPlayerStatsResult, playerStatsResult, clansResult, dictionariesResult] =
    await Promise.allSettled([
      fetchJsonWithOptions(`${API_BASE}/events`, options),
      fetchJsonWithOptions(`${API_BASE}/players`, options),
      pagedRawStatsPromise,
      fetchJsonWithOptions(`${API_BASE}/playersevents`, options),
      fetchJsonWithOptions(`${API_BASE}/clans`, options),
      fetchJsonWithOptions(`${API_BASE}/dictionaries`, options),
    ])

  const playerStatsPayload =
    pagedPlayerStatsResult.status === "fulfilled" && pagedPlayerStatsResult.value.length > 0
      ? { playersEvents: pagedPlayerStatsResult.value }
      : playerStatsResult.status === "fulfilled"
      ? playerStatsResult.value
      : []

  if (
    eventsResult.status === "fulfilled" ||
    playersResult.status === "fulfilled" ||
    pagedPlayerStatsResult.status === "fulfilled" ||
    playerStatsResult.status === "fulfilled" ||
    clansResult.status === "fulfilled" ||
    dictionariesResult.status === "fulfilled"
  ) {
    reportSyncProgress(options, {
      stage: "merge",
      percent: 96,
      message: "Собираем результат из fallback endpoint-ов...",
    })

    const normalized = normalizeMDCData({
      events: eventsResult.status === "fulfilled" ? eventsResult.value : [],
      players: playersResult.status === "fulfilled" ? playersResult.value : [],
      playersEvents: playerStatsPayload,
      clans: clansResult.status === "fulfilled" ? clansResult.value : [],
      dictionaries: dictionariesResult.status === "fulfilled" ? dictionariesResult.value : {},
    })

    reportSyncProgress(options, {
      stage: "done",
      percent: 100,
      message: "Синхронизация завершена (fallback)",
    })

    return normalized
  }

  reportSyncProgress(options, {
    stage: "error",
    percent: 100,
    message: "Синхронизация завершилась ошибкой",
  })

  const firstError =
    allError ||
    (eventsResult.status === "rejected" && eventsResult.reason) ||
    (playersResult.status === "rejected" && playersResult.reason) ||
    (pagedPlayerStatsResult.status === "rejected" && pagedPlayerStatsResult.reason) ||
    (playerStatsResult.status === "rejected" && playerStatsResult.reason) ||
    (clansResult.status === "rejected" && clansResult.reason) ||
    (dictionariesResult.status === "rejected" && dictionariesResult.reason)
  throw firstError instanceof Error ? firstError : new Error("Failed to fetch API data")
}

export async function fetchEvents(options: FetchApiOptions = {}): Promise<GameEvent[]> {
  const payload = await fetchJsonWithOptions(`${API_BASE}/events`, options)
  return extractArray(payload, ["events"]).map((value) => normalizeEvent(toRecord(value) ?? {}))
}

export async function fetchPlayers(options: FetchApiOptions = {}): Promise<Player[]> {
  const payload = await fetchJsonWithOptions(`${API_BASE}/players`, options)
  return extractArray(payload, ["players"]).map((value) => normalizePlayer(toRecord(value) ?? {}))
}

export async function fetchPlayerEventStats(options: FetchApiOptions = {}): Promise<PlayerEventStat[]> {
  const [playersPayload, pagedStatsRaw, statsPayload] = await Promise.all([
    fetchJsonWithOptions(`${API_BASE}/players`, options),
    fetchPagedPlayerEventStatsRaw(options).catch(() => []),
    fetchJsonWithOptions(`${API_BASE}/playersevents`, options),
  ])

  const players = extractArray(playersPayload, ["players"]).map((value) => normalizePlayer(toRecord(value) ?? {}))
  const playerLookup = buildPlayerLookup(players)
  const rawStats =
    pagedStatsRaw.length > 0 ? pagedStatsRaw : extractArray(statsPayload, ["playersEvents", "player_event_stats", "playersevents"])

  return rawStats.map((value) =>
    normalizePlayerEventStat(toRecord(value) ?? {}, playerLookup),
  )
}

export async function fetchClans(): Promise<Clan[]> {
  const payload = await fetchJsonWithOptions(`${API_BASE}/clans`)
  return extractArray(payload, ["clans"]).map((value) => normalizeClan(toRecord(value) ?? {}))
}

export async function fetchDictionaries(): Promise<Record<string, unknown>> {
  const payload = await fetchJsonWithOptions(`${API_BASE}/dictionaries`)
  const root = toRecord(parseMaybeJson(payload))
  if (!root) {
    return {}
  }

  const dictObject = extractObject(root.dictionaries ?? root, ["dictionaries"])
  return dictObject ?? {}
}

export async function fetchPlayerByNickname(
  playerNickname: string,
  options: FetchApiOptions = {},
): Promise<Record<string, unknown> | null> {
  const normalizedNickname = playerNickname.trim()
  if (!normalizedNickname) {
    return null
  }

  const url = withQueryParams(`${API_BASE}/player?playerNickname=${encodeURIComponent(normalizedNickname)}`, {
    publish: options.publish === undefined ? undefined : options.publish ? "true" : "false",
  })
  const response = await fetch(url, options.forceRefresh ? { cache: "no-store" } : undefined)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const rawPayload = await response.text()
  const parsedPayload = parseMaybeJson(rawPayload)

  if (typeof parsedPayload === "string") {
    const startsAsHtml = parsedPayload.trim().startsWith("<!DOCTYPE html")
    if (startsAsHtml) {
      throw new Error("Player endpoint returned HTML instead of JSON")
    }
    return null
  }

  const root = toRecord(parsedPayload)
  if (!root) {
    return null
  }

  return root
}
