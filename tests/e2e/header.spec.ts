import { expect, test } from "@playwright/test"

test("seasonal header collapses on small screens while scrolling", async ({ page }) => {
  test.setTimeout(180_000)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  const header = page.getByTestId("seasonal-header")
  await expect(page.getByRole("tab", { name: "Игроки" })).toBeVisible({ timeout: 120_000 })
  await expect(header).toHaveAttribute("data-collapsed", "false")

  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "auto" }))
  await expect(header).toHaveAttribute("data-collapsed", "true")

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }))
  await expect(header).toHaveAttribute("data-collapsed", "false")
})
