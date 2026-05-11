import { expect, test } from "@playwright/test"

test("pinned calendar weekday guide stays above the first week", async ({ page }) => {
  test.setTimeout(180_000)

  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto("/")

  const floatingGuide = page.getByTestId("calendar-weekday-guide-floating")
  await expect(floatingGuide).toBeVisible({ timeout: 120_000 })

  await floatingGuide.locator("button").click()

  const pinnedGuide = page.getByTestId("calendar-weekday-guide-pinned")
  await expect(pinnedGuide).toBeVisible()
  await expect(floatingGuide).toBeHidden()

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

  const fixedGuide = page.getByTestId("calendar-weekday-guide-fixed")
  await expect(fixedGuide).toBeVisible()
  await page.waitForTimeout(100)

  const scrollOverlap = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>("[data-testid='calendar-weekday-guide-fixed']")
    if (!guide) return null

    const guideRect = guide.getBoundingClientRect()
    const weeks = [...document.querySelectorAll<HTMLElement>("[data-calendar-week-index]")]
      .map((week) => week.getBoundingClientRect())
      .filter((rect) => rect.bottom > 0 && rect.top < window.innerHeight)

    return {
      guideBottom: guideRect.bottom,
      overlaps: weeks.some((rect) => rect.top < guideRect.bottom + 1 && rect.bottom > guideRect.top + 1),
    }
  })

  expect(scrollOverlap).not.toBeNull()
  expect(scrollOverlap?.overlaps).toBe(false)
})
