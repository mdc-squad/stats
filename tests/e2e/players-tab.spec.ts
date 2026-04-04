import { readFile, stat } from "node:fs/promises"
import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

const API_BASE = "https://api.hungryfishteam.org/gas/mdc"

type ApiPlayerRecord = Record<string, string | number | null>

function getPlayersPanel(page: Page) {
  return page.getByRole("tabpanel", { name: "Игроки" })
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
  await selector.click()

  const items = page.locator('[data-slot="command-item"]')
  await expect(items.nth(1)).toBeVisible()

  const count = await items.count()
  let chosenIndex = 1

  for (let index = 1; index < count; index += 1) {
    const text = (await items.nth(index).textContent()) ?? ""
    const match = text.match(/(\d+)\s*игр/i)
    if (match && Number(match[1]) >= 10) {
      chosenIndex = index
      break
    }
  }

  await items.nth(chosenIndex).click()
  await page.keyboard.press("Escape")
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

function toAverageNumber(value: string | number | null | undefined): number | null {
  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function deriveEffectiveEvents(player: ApiPlayerRecord): number {
  const revives = toNumber(player.revives)
  const heals = toNumber(player.heals)
  const vehicle = toNumber(player.vehicle)
  const events = toNumber(player.events)
  const avgRevives = toAverageNumber(player.deff_revives)
  const avgVehicle = toAverageNumber(player.deff_vehicle)
  const avgHeals = toAverageNumber(player.deff_heals)

  const candidates = [
    avgRevives && revives > 0 ? revives / avgRevives : null,
    avgVehicle && vehicle > 0 ? vehicle / avgVehicle : null,
    avgHeals && heals > 0 ? heals / avgHeals : null,
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value > 0)

  if (candidates.length === 0) {
    return events
  }

  return candidates.reduce((sum, value) => sum + value, 0) / candidates.length
}

async function fetchPlayersApi(request: APIRequestContext): Promise<ApiPlayerRecord[]> {
  const response = await request.get(`${API_BASE}/players?publish=false`)
  expect(response.ok()).toBeTruthy()
  const payload = (await response.json()) as { players?: ApiPlayerRecord[] }
  return payload.players ?? []
}

test("players tab renders enriched player card", async ({ page }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await expect(page.getByText("Динамика показателей")).toBeVisible()
  await expect(page.getByTestId("player-progress-kd-chart")).toContainText("K/D и общий K/D")
  await expect(page.getByTestId("player-progress-rating-chart")).toContainText("ELO и ТБФ")
  await expect(page.getByText("Последние матчи игрока")).toBeVisible()
  await expect(page.getByText("Популярные роли")).toBeVisible()
  await expect(page.getByText("Навыки")).toBeVisible()
  await expect(page.getByText(/^ТБФ:/)).toBeVisible()
  await expect(page.getByTestId("player-card-average-revives")).toBeVisible()
  await expect(page.getByTestId("player-radar-skills")).not.toContainText("/игра")

  const matchCards = page.getByTestId("player-match-card")
  const initialMatches = await matchCards.count()
  expect(initialMatches).toBeGreaterThan(0)
  expect(initialMatches).toBeLessThanOrEqual(5)

  const fullListButton = page.getByRole("button", { name: "Весь список" })
  if (await fullListButton.isVisible()) {
    await fullListButton.click()
    await expect.poll(async () => await matchCards.count()).toBeGreaterThan(initialMatches)
  }
})

test("players tab applies role metric selector to the card", async ({ page }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await getRoleMetricSelector(page).click()
  await page.getByRole("option", { name: "ТБФ" }).click()

  await expect(getRoleMetricSelector(page)).toHaveText("ТБФ")
  await expect(page.getByTestId("player-radar-roles")).toContainText("ТБФ")
})

test("players tab uses API table values in player card", async ({ page, request }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  const nickname = (await page.getByTestId("player-card-nickname").textContent())?.trim()
  expect(nickname).toBeTruthy()

  const players = await fetchPlayersApi(request)
  const player = players.find((entry) => String(entry.nickname).trim() === nickname)
  expect(player).toBeTruthy()

  const effectiveEvents = deriveEffectiveEvents(player!)
  const averageDenominator = effectiveEvents > 0 ? effectiveEvents : toNumber(player!.events)
  const expectedAvgRevives = toAverageNumber(player!.deff_revives) ?? (averageDenominator > 0 ? toNumber(player!.revives) / averageDenominator : 0)
  const expectedAvgVehicle = toAverageNumber(player!.deff_vehicle) ?? (averageDenominator > 0 ? toNumber(player!.vehicle) / averageDenominator : 0)
  const expectedAvgHeals = toAverageNumber(player!.deff_heals) ?? (averageDenominator > 0 ? toNumber(player!.heals) / averageDenominator : 0)

  await expect(page.getByTestId("player-card-rating-rating")).toContainText(toNumber(player!.OP).toFixed(1))
  await expect(page.getByTestId("player-card-rating-elo")).toContainText(toNumber(player!.ELO).toFixed(1))
  await expect(page.getByTestId("player-card-rating-tbf")).toContainText(toNumber(player!.TBF).toFixed(1))
  await expect(page.getByTestId("player-card-average-revives")).toContainText(expectedAvgRevives.toFixed(2))
  await expect(page.getByTestId("player-card-average-heals")).toContainText(expectedAvgHeals.toFixed(1))
  await expect(page.getByTestId("player-card-average-vehicle")).toContainText(expectedAvgVehicle.toFixed(2))
})

test("players tab exports player card as png", async ({ page }) => {
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
