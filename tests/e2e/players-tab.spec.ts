import { readFile, stat } from "node:fs/promises"
import { expect, test, type Page } from "@playwright/test"

function getPlayersPanel(page: Page) {
  return page.getByRole("tabpanel", { name: "Игроки" })
}

function getPlayerSelector(page: Page) {
  return getPlayersPanel(page).getByRole("combobox").first()
}

function getRoleMetricSelector(page: Page) {
  return getPlayersPanel(page).getByRole("combobox").nth(1)
}

function getRoleRadarTitle(page: Page) {
  return page.locator('[data-slot="card-title"]').filter({ hasText: "Роли" }).first()
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

test("players tab renders enriched player card", async ({ page }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await expect(page.getByText("Динамика показателей")).toBeVisible()
  await expect(page.getByText("Последние матчи игрока")).toBeVisible()
  await expect(page.getByText("Популярные роли")).toBeVisible()
  await expect(page.getByText("Навыки")).toBeVisible()
  await expect(page.getByText(/^ТБФ:/)).toBeVisible()

  const matchButtons = page.getByRole("button", { name: "Матч" })
  const initialMatches = await matchButtons.count()
  expect(initialMatches).toBeGreaterThan(0)
  expect(initialMatches).toBeLessThanOrEqual(5)

  const fullListButton = page.getByRole("button", { name: "Весь список" })
  if (await fullListButton.isVisible()) {
    await fullListButton.click()
    await expect.poll(async () => await matchButtons.count()).toBeGreaterThan(initialMatches)
  }
})

test("players tab applies role metric selector to the card", async ({ page }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  await getRoleMetricSelector(page).click()
  await page.getByRole("option", { name: "ТБФ" }).click()

  await expect(getRoleMetricSelector(page)).toHaveText("ТБФ")
  await expect(getRoleRadarTitle(page)).toBeVisible()
  await expect(getRoleRadarTitle(page)).toContainText("ТБФ")
})

test("players tab exports player card as png", async ({ page }) => {
  await openPlayersTab(page)
  await selectPlayerWithEnoughGames(page)

  const playerCard = page.locator('[id^="player-card-"]').first()
  await expect(playerCard).toBeVisible()
  await playerCard.hover()

  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Скачать карточку игрока" }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/-stats\.png$/i)

  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()

  const fileStats = await stat(downloadPath!)
  expect(fileStats.size).toBeGreaterThan(100_000)

  const { width, height } = await readPngSize(downloadPath!)
  expect(width).toBeGreaterThan(1000)
  expect(height).toBeGreaterThan(1500)
})
