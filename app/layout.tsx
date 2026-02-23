import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MDC Clan - Статистика игроков",
  description: "Актуальная статистика игроков и событий клана MDC",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-dark-32x32.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isVercelRuntime =
    process.env.VERCEL === "1" || process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === "1"

  return (
    <html lang="ru" className="dark">
      <body className="font-sans antialiased">
        {children}
        {isVercelRuntime && <Analytics />}
      </body>
    </html>
  )
}
