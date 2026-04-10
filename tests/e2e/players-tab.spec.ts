import { readFile, stat } from "node:fs/promises"
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test"

const API_BASE = "https://api.hungryfishteam.org/gas/mdc"

type ApiPlayerRecord = Record<string, string | number | null>
type ApiEventRecord = Record<string, string | number | boolean | null>
type ApiPlayerEventRecord = Record<string, string | number | null>

test.describe.configure({ mode: "serial" })

function getPlayersPanel(page: Page) {
  return page.getByRole("tabpanel", { name: "Игроки" })
}

function getGlobalTagFilter(page: Page) {
  return page.getByTestId("global-tag-filter")
}

function getPlayerSelector(page: Page) {
  return getPlayersPanel(page).getByRole("combobox").first()
}

function getRoleMetricSelector(page: Page) {
  return page.getByTestId("player-radar-roles").getByTestId("player-role-metric-selector")
}

async function readPngSize(path: string): Promise<{ width: number; height: number }> {
  const buffer = await readFile(path)
  expect(buffer.subarray(12, 16).toString("ascii")).toBe("IHDR")

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

async function openPlayersTab(page: Page) {
  await page.goto("/")
  await expect(page.getByRole("tab", { name: "Игроки" })).toBeVisible({ timeout: 120_000 })
  await page.getByRole("tab", { name: "Игроки" }).click()
  await expect(getPlayersPanel(page)).toBeVisible()
  await expect(getPlayerSelector(page)).toBeVisible()
}

async function selectPlayerWithEnoughGames(page: Page) {
  const selector = getPlayerSelector(page)
  await selector.scrollIntoViewIfNeeded()
  await selector.click()

  const items = page.locator('[data-slot="command-item"]:visible').filter({ hasText: /игр/i })
  await expect(items.first()).toBeVisible()

  const count = await items.count()
  let chosenIndex = 0

  for (let index = 0; index < count; index += 1) {
    const text = (await items.nth(index).textContent()) ?? ""
    const match = text.match(/(\d+)\s*игр/i)
    if (match && Number(match[1]) >= 10) {
      chosenIndex = index
      break
    }
  }

  await items.nth(chosenIndex).click()
  await expect(selector).toContainText("Выбрано: 1")
  await page.keyboard.press("Escape")
}

function normalizeEventKey(value: string | number | boolean | null | undefined): string {
  const source = String(value ?? "")
  if (!source) return ""

  const parts = source
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 4) {
    return parts
      .slice(1, 4)
      .join(" | ")
      .toLowerCase()
  }

  if (parts.length >= 3) {
    return parts
      .slice(1, 3)
      .join(" | ")
      .toLowerCase()
  }

  return source.trim().toLowerCase()
}

function isReserveEntry(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .includes("резерв")
}

function isLectureEventType(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
  return normalized.includes("лекц") || normalized.includes("lecture")
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

function toIsWin(event: ApiEventRecord): boolean | null {
  if (typeof event.is_win === "boolean") {
    return event.is_win
  }

  const result = String(event.result ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")

  if (result.includes("побед")) {
    return true
  }

  if (result.includes("пораж") || result.includes("проиг")) {
    return false
  }

  return null
}

function normalizeSpecializationLabel(row: ApiPlayerEventRecord): string {
  const text = String(row.role_icon ?? "").trim()
  if (text && text !== "Нет" && text !== "CAST") {
    return text
  }

  const icon = String(row.specialization_icon ?? "").trim()
  if (icon === "🗡️") return "Пушер"
  if (icon === "🛡️") return "Якорь"
  if (icon === "💥") return "ДРГ"
  if (icon === "💣") return "Миномёт"
  if (icon === "🚙") return "Тех"

  return ""
}

async function fetchPlayersApi(request: APIRequestContext): Promise<ApiPlayerRecord[]> {
  const response = await request.get(`${API_BASE}/players?publish=false`)
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as { players?: ApiPlayerRecord[] }
  return payload.players ?? []
}

async function fetchEventsApi(request: APIRequestContext): Promise<ApiEventRecord[]> {
  const response = await request.get(`${API_BASE}/events?publish=false`)
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as { events?: ApiEventRecord[] }
  return payload.events ?? []
}

async function waitFor(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestJsonWithRetry<T>(request: APIRequestContext, url: string, attempts = 3): Promise<T> {
  let lastStatus = 0

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await request.get(url)
    if (response.ok()) {
      return (await response.json()) as T
    }

    lastStatus = response.status()
    if (attempt < attempts) {
      await waitFor(attempt * 750)
    }
  }

  throw new Error(`Request failed after ${attempts} attempts: ${url} (last status ${lastStatus})`)
}

async function fetchPlayerEventsApi(request: APIRequestContext): Promise<ApiPlayerEventRecord[]> {
  const fullSnapshot = await requestJsonWithRetry<{
    playersEvents?: ApiPlayerEventRecord[]
    player_event_stats?: ApiPlayerEventRecord[]
    playersevents?: ApiPlayerEventRecord[]
  }>(request, `${API_BASE}/all?publish=false`, 2).catch(() => null)

  const snapshotRows = fullSnapshot?.playersEvents ?? fullSnapshot?.player_event_stats ?? fullSnapshot?.playersevents
  if (Array.isArray(snapshotRows) && snapshotRows.length > 0) {
    return snapshotRows
  }

  const pagesResponse = await request.get(`${API_BASE}/pages?publish=false`)
  expect(pagesResponse.ok()).toBeTruthy()
  const pages = Math.max(1, Number((await pagesResponse.text()).trim()) || 1)

  const rows: ApiPlayerEventRecord[] = []
  for (let page = 1; page <= pages; page += 1) {
    const payload = await requestJsonWithRetry<{
      playersEvents?: ApiPlayerEventRecord[]
      player_event_stats?: ApiPlayerEventRecord[]
      playersevents?: ApiPlayerEventRecord[]
    }>(request, `${API_BASE}/playersevents?publish=false&page=${page}`)

    rows.push(...(payload.playersEvents ?? payload.player_event_stats ?? payload.playersevents ?? []))
  }

  return rows
}

async function readCardMetricValue(page: Page, testId: string): Promise<number> {
  const text = (await page.getByTestId(testId).textContent()) ?? ""
  const match = text.match(/(\d+(?:[.,]\d+)?)(?!.*\d)/)
  expect(match).toBeTruthy()
  return Number((match?.[1] ?? "0").replace(",", "."))
}

async function readMatchMetricValue(card: Locator, metricKey: "revives" | "heals" | "vehicle"): Promise<number> {
  const text = (await card.locator(`[data-metric-key="${metricKey}"]`).textContent()) ?? ""
  const match = text.match(/(\d+(?:[.,]\d+)?)(?!.*\d)/)
  expect(match).toBeTruthy()
  return Number((match?.[1] ?? "0").replace(",", "."))
}

function aggregatePlayerFromProtocol(
  rows: ApiPlayerEventRecord[],
  events: ApiEventRecord[],
  nickname: string,
  tag: string,
): {
  totalGames: number
  averageRevives: number
  averageHeals: number
  averageVehicle: number
  specializationCount: number
} {
  const eventsByKey = new Map(events.map((event) => [normalizeEventKey(event.event_id), event]))
  const byEvent = new Map<
    string,
    {
      revives: number
      heals: number
      vehicle: number
      specializations: Set<string>
      isWin: boolean | null
    }
  >()

  rows.forEach((row) => {
    if (
      String(row.nickname ?? "").trim() !== nickname ||
      String(row.tag ?? "").trim() !== tag ||
      isReserveEntry(row.enter)
    ) {
      return
    }

    const eventKey = normalizeEventKey(row.event_id)
    if (!eventKey) {
      return
    }

    const event = eventsByKey.get(eventKey)
    if (event && isLectureEventType(event.event_type)) {
      return
    }

    if (!byEvent.has(eventKey)) {
      byEvent.set(eventKey, {
        revives: 0,
        heals: 0,
        vehicle: 0,
        specializations: new Set<string>(),
        isWin: toIsWin(event ?? {}),
      })
    }

    const current = byEvent.get(eventKey)
    if (!current) {
      return
    }

    current.revives += toNumber(row.revives)
    current.heals += toNumber(row.heals)
    current.vehicle += toNumber(row.vehicle)

    const specialization = normalizeSpecializationLabel(row)
    if (specialization) {
      current.specializations.add(specialization)
    }
  })

  const games = Array.from(byEvent.values())
  const totalGames = games.length
  const totalRevives = games.reduce((sum, game) => sum + game.revives, 0)
  const totalHeals = games.reduce((sum, game) => sum + game.heals, 0)
  const totalVehicle = games.reduce((sum, game) => sum + game.vehicle, 0)
  const specializationCount = games.reduce((sum, game) => sum + game.specializations.size, 0)

  return {
    totalGames,
    averageRevives: totalGames > 0 ? totalRevives / totalGames : 0,
    averageHeals: totalGames > 0 ? totalHeals / totalGames : 0,
    averageVehicle: totalGames > 0 ? totalVehicle / totalGames : 0,
    specializationCount,
  }
}

test("global tag filter defaults to mdc and grave matches", async ({ page }) => {
  test.setTimeout(180_000)

  await page.goto("/")
  await expect(page.getByRole("tab", { name: "Игроки" })).toBeVisible({ timeout: 120_000 })

  const tagFilter = getGlobalTagFilter(page)
  const combobox = tagFilter.getByRole("combobox")
  await expect(combobox).toContainText("Выбрано:", { timeout: 120_000 })

  await combobox.click()
  const optionTexts = (await page.locator('[data-slot="command-item"]:visible').allTextContents())
    .map((text) => text.trim())
    .filter(Boolean)
    .filter((text) => text !== "Выбрать все теги")

  const normalizedOptionTexts = optionTexts.map((text) => text.toLowerCase().replaceAll("ё", "е"))
  const mdcLikeOptions = optionTexts.filter((text) => /mdc/i.test(text))
  const graveLikeOptions = optionTexts.filter((text) => /grave/i.test(text))

  expect(mdcLikeOptions).toHaveLength(1)
  expect(graveLikeOptions.length).toBeGreaterThan(0)
  expect(normalizedOptionTexts.some((text) => text.includes("ветеран"))).toBeFalsy()
  expect(normalizedOptionTexts.some((text) => text.includes("неактив"))).toBeFalsy()

  const selectedCountMatch = ((await combobox.textContent()) ?? "").match(/(\d+)/)
  expect(Number(selectedCountMatch?.[1] ?? 0)).toBe(mdcLikeOptions.length + graveLikeOptions.length)
})

test("players tab renders enriched player card", async ({ page }) => {
  test.setTimeout(180_000)
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await expect(page.getByTestId("player-card")).toBeVisible()
  await expect(page.getByText("Динамика показателей")).toBeVisible()
  await expect(page.getByTestId("player-progress-kd-chart")).toContainText("K/D и общий K/D")
  await page.getByTestId("player-progress-toggle-rating").click()
  await expect(page.getByTestId("player-progress-rating-chart")).toContainText("ELO и ТБФ")
  await expect(page.getByText("Последние матчи игрока")).toBeVisible()
  await expect(page.getByTestId("player-card").getByText("Роли", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Специализации")).toBeVisible()
  await expect(page.getByText("Навыки")).toBeVisible()
  await expect(page.getByText(/^ТБФ:/)).toBeVisible()
  await expect(page.getByTestId("player-card-average-revives")).toBeVisible()
  await expect(page.getByTestId("player-radar-skills")).not.toContainText("/игра")
  const rolesRadarViewportHeight = await page
    .getByTestId("player-radar-viewport-roles")
    .evaluate((element) => element.getBoundingClientRect().height)
  const skillsRadarViewportHeight = await page
    .getByTestId("player-radar-viewport-skills")
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(rolesRadarViewportHeight).toBeGreaterThan(300)
  expect(skillsRadarViewportHeight).toBeGreaterThan(300)

  const nicknameColor = await page.getByTestId("player-card-nickname").evaluate((element) => getComputedStyle(element).color)
  const tagColor = await page.getByTestId("player-card-tag").evaluate((element) => getComputedStyle(element).color)
  expect(tagColor).toBe(nicknameColor)
  const tagBox = await page.getByTestId("player-card-tag").boundingBox()
  const nicknameBox = await page.getByTestId("player-card-nickname").boundingBox()
  expect(tagBox).not.toBeNull()
  expect(nicknameBox).not.toBeNull()
  expect(Math.abs((tagBox?.y ?? 0) - (nicknameBox?.y ?? 0))).toBeLessThanOrEqual(2)
  const nicknameTextOverflow = await page.getByTestId("player-card-nickname").evaluate((element) => getComputedStyle(element).textOverflow)
  expect(nicknameTextOverflow).not.toBe("ellipsis")
  const ratingTilesFitWithoutOverflow = await page.getByTestId("player-card-ratings").evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 2,
  )
  expect(ratingTilesFitWithoutOverflow).toBeTruthy()

  const matchCards = page.getByTestId("player-match-card")
  const initialMatches = await matchCards.count()
  expect(initialMatches).toBeGreaterThan(0)
  expect(initialMatches).toBeLessThanOrEqual(5)
  await expect(page.getByTestId("player-card-specializations")).toBeVisible()
  await expect(page.getByTestId("player-card-specialization-item").first()).toBeVisible()
  await expect(page.getByTestId("player-match-elo-progress").first()).toBeVisible()
  const firstMatchMetrics = page.getByTestId("player-match-metrics").first()
  await expect(firstMatchMetrics).toBeVisible()
  await expect(firstMatchMetrics).not.toContainText("Подн.")
  await expect(firstMatchMetrics).not.toContainText("См.")
  const metricsFitWithoutOverflow = await firstMatchMetrics.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 2,
  )
  expect(metricsFitWithoutOverflow).toBeTruthy()
  const firstRevivesMetricFlexDirection = await firstMatchMetrics
    .locator('[data-metric-key="revives"]')
    .first()
    .evaluate((element) => getComputedStyle(element).flexDirection)
  expect(firstRevivesMetricFlexDirection).toBe("column")
  await page.getByTestId("player-match-metric-icon-revives").first().hover()
  await expect(page.getByRole("tooltip")).toContainText("Поднятия")

  const fullListButton = page.getByRole("button", { name: "Весь список" })
  if (await fullListButton.isVisible()) {
    await fullListButton.click()
    await expect.poll(async () => await matchCards.count()).toBeGreaterThan(initialMatches)
  }
})

test("players tab applies role metric selector to the card", async ({ page }) => {
  test.setTimeout(180_000)
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await getRoleMetricSelector(page).scrollIntoViewIfNeeded()
  await getRoleMetricSelector(page).click()
  await page.getByRole("option", { name: "ТБФ" }).click()

  await expect(getRoleMetricSelector(page)).toHaveText("ТБФ")
  await expect(page.getByTestId("player-radar-roles")).toContainText("ТБФ")
})

test("players tab uses players API table values in player card", async ({ page, request }) => {
  test.setTimeout(180_000)

  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  const nickname = (await page.getByTestId("player-card-nickname").textContent())?.trim()
  const tag = (await page.getByTestId("player-card-tag").textContent())?.trim()
  expect(nickname).toBeTruthy()
  expect(tag).toBeTruthy()

  const players = await fetchPlayersApi(request)
  const player = players.find(
    (entry) => String(entry.nickname).trim() === nickname && String(entry.tag ?? "").trim() === tag,
  )
  expect(player).toBeTruthy()

  const fullListButton = page.getByRole("button", { name: "Весь список" })
  if (await fullListButton.isVisible()) {
    await fullListButton.click()
  }

  const matchCards = page.getByTestId("player-match-card")
  const totalGames = await matchCards.count()
  expect(totalGames).toBeGreaterThan(0)

  let totalRevives = 0
  let totalHeals = 0
  let totalVehicle = 0

  for (let index = 0; index < totalGames; index += 1) {
    const card = matchCards.nth(index)
    totalRevives += await readMatchMetricValue(card, "revives")
    totalHeals += await readMatchMetricValue(card, "heals")
    totalVehicle += await readMatchMetricValue(card, "vehicle")
  }

  expect(Math.abs((await readCardMetricValue(page, "player-card-rating-rating")) - toNumber(player!.OP))).toBeLessThanOrEqual(0.05)
  await expect(page.getByTestId("player-card-summary-events")).toContainText("Всего игр")
  expect(Math.abs((await readCardMetricValue(page, "player-card-summary-events")) - totalGames)).toBeLessThanOrEqual(0.01)
  expect(Math.abs((await readCardMetricValue(page, "player-card-average-revives")) - totalRevives / totalGames)).toBeLessThanOrEqual(0.03)
  expect(Math.abs((await readCardMetricValue(page, "player-card-average-heals")) - totalHeals / totalGames)).toBeLessThanOrEqual(0.15)
  expect(Math.abs((await readCardMetricValue(page, "player-card-average-vehicle")) - totalVehicle / totalGames)).toBeLessThanOrEqual(0.03)
})

test("dashboard uses explicit event results for wins and losses", async ({ page, request }) => {
  test.setTimeout(180_000)
  const events = await fetchEventsApi(request)
  const outcomes = events.map((event) => toIsWin(event))
  const wins = outcomes.filter((outcome) => outcome === true).length
  const losses = outcomes.filter((outcome) => outcome === false).length

  await page.goto("/")
  await expect(page.getByRole("tab", { name: "Игроки" })).toBeVisible({ timeout: 120_000 })
  await expect(page.getByTestId("overall-results-total")).toContainText(String(wins + losses), { timeout: 120_000 })
  await expect(page.getByTestId("overall-results-wins")).toContainText(String(wins))
  await expect(page.getByTestId("overall-results-losses")).toContainText(String(losses))
})

test("players tab exports player card as png", async ({ page }) => {
  test.setTimeout(180_000)
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  const playerCard = page.getByTestId("player-card")
  const historySection = page.getByTestId("player-card-history-section")
  await expect(playerCard).toBeVisible()
  await expect(historySection).toBeVisible()
  await playerCard.hover()

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Скачать карточку игрока" }).click()
  await expect(playerCard).toHaveAttribute("data-exporting", "true")
  await expect(historySection).toBeHidden()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/-stats\.png$/i)

  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()

  const fileStats = await stat(downloadPath!)
  expect(fileStats.size).toBeGreaterThan(100_000)

  const { width, height } = await readPngSize(downloadPath!)
  expect(width).toBeGreaterThan(1000)
  expect(height).toBeGreaterThan(1000)

  await expect(playerCard).toHaveAttribute("data-exporting", "false")
  await expect(historySection).toBeVisible()
})
