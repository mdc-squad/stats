import { expect, test } from "@playwright/test"

test("pinned calendar weekday guide stays above the first week", async ({ page }) => {
  test.setTimeout(180_000)

  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto("/")

  const floatingGuide = page.getByTestId("calendar-weekday-guide-floating")
  await expect(floatingGuide).toBeVisible({ timeout: 120_000 })

  for (const scrollY of [300, 600]) {
    await page.evaluate((value) => window.scrollTo(0, value), scrollY)
    await page.waitForTimeout(260)

    const floatingOverlap = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-floating']")
      if (!guide) return null

      const guideRect = guide.getBoundingClientRect()
      const weeks = [...document.querySelectorAll<HTMLElement>("[data-calendar-week-index]")]
        .map((week) => week.getBoundingClientRect())
        .filter((rect) => rect.bottom > 0 && rect.top < window.innerHeight)

      return {
        position: getComputedStyle(guide).position,
        overlapsWeek: weeks.some((rect) => rect.top < guideRect.bottom + 1 && rect.bottom > guideRect.top + 1),
      }
    })

    expect(floatingOverlap).not.toBeNull()
    expect(floatingOverlap?.position).toBe("relative")
    expect(floatingOverlap?.overlapsWeek).toBe(false)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(floatingGuide).toBeVisible()

  await floatingGuide.locator("button").click()

  const pinnedGuide = page.getByTestId("calendar-weekday-guide-pinned")
  await expect(pinnedGuide).toBeVisible()
  await expect(floatingGuide).toBeHidden()
  await expect(page.getByTestId("calendar-weekday-guide-fixed")).toHaveCount(0)

  const initialPinnedSpacing = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-pinned']")
    const firstWeek = document.querySelector<HTMLElement>("[data-calendar-week-index='0']")
    const weeks = firstWeek?.parentElement
    if (!guide || !firstWeek || !weeks) return null

    const guideRect = guide.getBoundingClientRect()
    const firstWeekRect = firstWeek.getBoundingClientRect()

    return {
      gap: firstWeekRect.top - guideRect.bottom,
      paddingTop: Number.parseFloat(getComputedStyle(weeks).paddingTop),
    }
  })

  expect(initialPinnedSpacing).not.toBeNull()
  expect(initialPinnedSpacing?.paddingTop).toBe(0)
  expect(initialPinnedSpacing?.gap).toBeLessThan(20)

  const overlap = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-pinned']")
    const firstWeek = document.querySelector<HTMLElement>("[data-calendar-week-index='0']")
    if (!guide || !firstWeek) return null

    const guideRect = guide.getBoundingClientRect()
    const firstWeekRect = firstWeek.getBoundingClientRect()

    return {
      guideBottom: guideRect.bottom,
      firstWeekTop: firstWeekRect.top,
      overlaps: guideRect.bottom > firstWeekRect.top + 1,
    }
  })

  expect(overlap).not.toBeNull()
  expect(overlap?.overlaps).toBe(false)

  await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-pinned']")
    if (!guide) return
    const targetTop = 70
    window.scrollBy({ top: guide.getBoundingClientRect().top - targetTop, behavior: "auto" })
  })

  await expect(pinnedGuide).toBeVisible()
  await page.waitForTimeout(100)

  for (const scrollY of [500, 750, 900]) {
    await page.evaluate((value) => window.scrollTo(0, value), scrollY)
    await page.waitForTimeout(150)

    const scrollOverlap = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-pinned']")
      const header = document.querySelector<HTMLElement>("[data-testid='seasonal-header']")
      const scroller = document.querySelector<HTMLElement>("[data-testid='calendar-week-grid-scroll']")
      if (!guide || !header || !scroller) return null

      const guideRect = guide.getBoundingClientRect()
      const headerRect = header.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      const clipPath = getComputedStyle(scroller).clipPath
      const weeks = [...document.querySelectorAll<HTMLElement>("[data-calendar-week-index]")]
        .map((week) => week.getBoundingClientRect())
        .filter((rect) => rect.bottom > 0 && rect.top < window.innerHeight)

      return {
        guideTop: guideRect.top,
        guideBottom: guideRect.bottom,
        headerBottom: headerRect.bottom,
        position: getComputedStyle(guide).position,
        clipPath,
        clipsAboveGuide: clipPath !== "none" && Number.parseFloat(clipPath.match(/inset\(([-\d.]+)px/)?.[1] ?? "0") >= Math.ceil(guideRect.bottom + 1 - scrollerRect.top),
        hiddenUnderHeader: guideRect.top < headerRect.bottom - 1,
        hasWeekStartingUnderGuide: weeks.some((rect) => rect.top >= guideRect.top - 1 && rect.top < guideRect.bottom + 8),
      }
    })

    expect(scrollOverlap).not.toBeNull()
    expect(scrollOverlap?.position).toBe("sticky")
    expect(scrollOverlap?.clipsAboveGuide).toBe(true)
    expect(scrollOverlap?.hiddenUnderHeader).toBe(false)
    expect(scrollOverlap?.hasWeekStartingUnderGuide).toBe(false)
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(150)
  const beforeWheel = await page.evaluate(() => window.scrollY)

  for (let index = 0; index < 6; index += 1) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(80)
  }

  const afterWheel = await page.evaluate(() => window.scrollY)
  expect(Math.abs(afterWheel - beforeWheel)).toBeLessThanOrEqual(2)
})
