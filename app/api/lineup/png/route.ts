import { chromium } from "playwright"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function resolveSide(value: string | null): "1" | "2" {
  const normalized = String(value ?? "").trim().toLowerCase()
  return ["2", "two", "right", "second", "sitetwo", "site-two"].includes(normalized) ? "2" : "1"
}

function getScreenshotOrigin() {
  const configuredOrigin = (process.env.LINEUP_SCREENSHOT_ORIGIN ?? "").trim()
  if (!configuredOrigin) return "http://127.0.0.1:80"

  try {
    const url = new URL(configuredOrigin)
    if (["0.0.0.0", "127.0.0.1", "localhost"].includes(url.hostname)) {
      return `http://127.0.0.1:${url.port || "80"}`
    }
    return url.toString().replace(/\/$/, "")
  } catch {
    return "http://127.0.0.1:80"
  }
}

export async function GET(request: NextRequest) {
  const side = resolveSide(request.nextUrl.searchParams.get("side"))
  const renderUrl = new URL("/lineup-export", getScreenshotOrigin())
  renderUrl.searchParams.set("side", side)
  renderUrl.searchParams.set("t", String(Date.now()))

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage({
      viewport: { width: 1500, height: 1400 },
      deviceScaleFactor: 2,
    })

    await page.goto(renderUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    })
    await page.waitForSelector('html[data-lineup-export-ready="true"]', { timeout: 45_000 })
    await page.waitForFunction(
      () => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
      null,
      { timeout: 45_000 },
    )
    const card = page.locator("[data-lineup-export-card]").first()
    await card.waitFor({ state: "visible", timeout: 15_000 })

    const screenshot = await card.screenshot({
      type: "png",
      animations: "disabled",
      scale: "device",
      timeout: 45_000,
    })

    return new Response(screenshot, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="lineup-side-${side}.png"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    return new Response(message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } finally {
    await browser?.close()
  }
}
